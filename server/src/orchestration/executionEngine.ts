import { ActionPlan, PlanStep, BaseToolResult } from '@homepilot/shared';
import { updatePlanStep, updatePlanStatus, saveActionPlan, getActionPlan } from '../db/database.js';
import { executeGetHouseholdStatus } from '../tools/getHouseholdStatus.js';
import { executeCreateReminder } from '../tools/createReminder.js';
import { executeUpdateShoppingList } from '../tools/updateShoppingList.js';
import { executeCreateDepartureChecklist } from '../tools/createDepartureChecklist.js';
import { executeGetPendingActions } from '../tools/getPendingActions.js';

export const TOOL_TIMEOUT_MS = 10000;

/**
 * Executes a tool with a strict timeout.
 */
async function invokeToolWithTimeout(
  toolName: string,
  args: Record<string, unknown>,
  timeoutMs: number = TOOL_TIMEOUT_MS
): Promise<BaseToolResult> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Tool '${toolName}' execution timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
    // Unref timer in Node so it doesn't hold open process if finished
    if (typeof timer.unref === 'function') timer.unref();
  });

  const toolExecutionPromise = new Promise<BaseToolResult>((resolve, reject) => {
    try {
      let result: BaseToolResult;
      switch (toolName) {
        case 'get_household_status':
          result = executeGetHouseholdStatus();
          break;
        case 'create_reminder':
          result = executeCreateReminder(args) as BaseToolResult;
          break;
        case 'update_shopping_list':
          result = executeUpdateShoppingList(args) as BaseToolResult;
          break;
        case 'create_departure_checklist':
          result = executeCreateDepartureChecklist(args) as BaseToolResult;
          break;
        case 'get_pending_actions':
          result = executeGetPendingActions(args) as BaseToolResult;
          break;
        default:
          reject(new Error(`Unknown tool: ${toolName}`));
          return;
      }
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });

  return Promise.race([toolExecutionPromise, timeoutPromise]);
}

/**
 * Sequential Execution Engine
 * Iterates through the plan steps, checks dependencies, enforces approval gates,
 * executes real MCP tools, and maintains plan and step states in SQLite.
 */
export async function executePlan(plan: ActionPlan): Promise<ActionPlan> {
  // Ensure the plan is persisted in SQLite
  saveActionPlan(plan);

  let currentPlan = getActionPlan(plan.planId) || plan;

  // If plan is already in a terminal state, return immediately
  if (['completed', 'cancelled', 'failed'].includes(currentPlan.status)) {
    return currentPlan;
  }

  // Update plan status to running if it was draft
  if (currentPlan.status === 'draft') {
    currentPlan.status = 'running';
    updatePlanStatus(currentPlan.planId, 'running');
  }

  for (let i = 0; i < currentPlan.steps.length; i++) {
    const step = currentPlan.steps[i];

    // Skip steps that are already in terminal state
    if (['succeeded', 'failed', 'cancelled', 'skipped'].includes(step.status)) {
      continue;
    }

    // 1. Dependency Resolution
    const dependsOn = step.dependsOn || [];
    const dependencyFailure = dependsOn.some(depId => {
      const depStep = currentPlan.steps.find(s => s.stepId === depId);
      return !depStep || ['failed', 'cancelled', 'skipped'].includes(depStep.status);
    });

    if (dependencyFailure) {
      step.status = 'skipped';
      step.error = `Skipped because prerequisite step in [${dependsOn.join(', ')}] did not succeed.`;
      step.completedAt = new Date().toISOString();
      updatePlanStep(currentPlan.planId, step);
      continue;
    }

    // 2. Sensitive Action Approval Gate
    if (step.sensitive && !step.approvedAt) {
      step.status = 'awaiting_approval';
      currentPlan.status = 'awaiting_approval';
      updatePlanStep(currentPlan.planId, step);
      updatePlanStatus(currentPlan.planId, 'awaiting_approval');
      
      // Stop sequential execution until user approval is received
      return currentPlan;
    }

    // 3. Step Execution
    step.status = 'running';
    step.startedAt = new Date().toISOString();
    updatePlanStep(currentPlan.planId, step);

    try {
      const toolResult = await invokeToolWithTimeout(step.toolName, step.arguments);

      step.completedAt = new Date().toISOString();
      step.result = toolResult;

      if (toolResult.success) {
        step.status = 'succeeded';
        step.error = null;
      } else {
        step.status = 'failed';
        step.error = toolResult.message;
      }
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      step.completedAt = new Date().toISOString();
      step.status = 'failed';
      step.error = errMessage;
      step.result = {
        success: false,
        message: errMessage,
        data: null,
        timestamp: new Date().toISOString(),
        actionId: `err_exec_${Date.now()}`
      };
    }

    updatePlanStep(currentPlan.planId, step);

    // If step failed, mark downstream dependent steps as skipped immediately
    if (step.status === 'failed') {
      for (let j = i + 1; j < currentPlan.steps.length; j++) {
        const downstream = currentPlan.steps[j];
        if (downstream.dependsOn && downstream.dependsOn.includes(step.stepId)) {
          downstream.status = 'skipped';
          downstream.error = `Prerequisite step ${step.stepId} (${step.toolName}) failed.`;
          downstream.completedAt = new Date().toISOString();
          updatePlanStep(currentPlan.planId, downstream);
        }
      }
    }
  }

  // 4. Determine final plan status
  const refreshedPlan = getActionPlan(currentPlan.planId) || currentPlan;

  const hasAwaitingApproval = refreshedPlan.steps.some(s => s.status === 'awaiting_approval');
  const hasFailed = refreshedPlan.steps.some(s => s.status === 'failed');
  const allResolved = refreshedPlan.steps.every(s => ['succeeded', 'skipped', 'failed', 'cancelled'].includes(s.status));

  if (hasAwaitingApproval) {
    refreshedPlan.status = 'awaiting_approval';
  } else if (hasFailed) {
    refreshedPlan.status = 'failed';
  } else if (allResolved) {
    refreshedPlan.status = 'completed';
  }

  updatePlanStatus(refreshedPlan.planId, refreshedPlan.status);
  return refreshedPlan;
}
