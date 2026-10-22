import { describe, it, expect, beforeEach } from 'vitest';
import {
  createActionPlanFromRequest,
  validateActionPlan,
  validatePlanStep
} from '../src/orchestration/planner.js';
import { executePlan } from '../src/orchestration/executionEngine.js';
import { ApprovalService } from '../src/orchestration/approvalService.js';
import { getDatabase, getActionPlan } from '../src/db/database.js';
import { ActionPlan, PlanStep } from '@homepilot/shared';

describe('Phase 3: Agent Orchestration & Approval Layer', () => {
  beforeEach(() => {
    const db = getDatabase();
    db.exec(`
      DELETE FROM plan_steps;
      DELETE FROM action_plans;
      DELETE FROM checklist_items;
      DELETE FROM departure_checklists;
      DELETE FROM shopping_items;
      DELETE FROM reminders;
    `);
  });

  // 1. Valid plan creation
  it('1. creates a valid structured plan from the core hackathon demo request', () => {
    const request = "I’m leaving home for three days. Prepare a departure checklist, remind my roommate to water the plants, add milk and eggs to my shopping list for when I return, and show me anything that still needs attention.";
    const plan = createActionPlanFromRequest(request);

    expect(plan.planId).toMatch(/^plan_/);
    expect(plan.originalRequest).toBe(request);
    expect(plan.status).toBe('draft');
    expect(plan.requiresApproval).toBe(true); // Roommate notification is sensitive
    expect(plan.steps.length).toBe(4);

    // Verify step order & tools
    const toolNames = plan.steps.map(s => s.toolName);
    expect(toolNames).toContain('create_departure_checklist');
    expect(toolNames).toContain('create_reminder');
    expect(toolNames).toContain('update_shopping_list');
    expect(toolNames).toContain('get_pending_actions');

    // Sensitive step detection
    const reminderStep = plan.steps.find(s => s.toolName === 'create_reminder');
    expect(reminderStep?.sensitive).toBe(true);

    // Validation passes
    const validation = validateActionPlan(plan);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  // 2. Invalid tool name rejection
  it('2. rejects plans containing unknown or out-of-scope tool names', () => {
    const invalidStep: PlanStep = {
      stepId: 'step_invalid_1',
      toolName: 'send_whatsapp_message', // Not in allowed tools
      arguments: { recipient: '+1234567890', text: 'Hello' },
      dependsOn: [],
      sensitive: true,
      status: 'pending',
      result: null,
      error: null,
      startedAt: null,
      completedAt: null
    };

    const validation = validatePlanStep(invalidStep);
    expect(validation.valid).toBe(false);
    expect(validation.errors[0]).toContain("not in the allowed MCP tools registry");
  });

  // 3. Invalid argument rejection
  it('3. rejects plan steps with invalid or missing arguments according to Zod schemas', () => {
    const invalidReminderStep: PlanStep = {
      stepId: 'step_invalid_2',
      toolName: 'create_reminder',
      arguments: { notes: 'Missing title and assignee' },
      dependsOn: [],
      sensitive: false,
      status: 'pending',
      result: null,
      error: null,
      startedAt: null,
      completedAt: null
    };

    const validation = validatePlanStep(invalidReminderStep);
    expect(validation.valid).toBe(false);
    expect(validation.errors[0]).toContain("Invalid arguments for create_reminder");
  });

  // 4. Sequential execution
  it('4. sequentially executes safe steps in order and saves state in SQLite', async () => {
    const plan: ActionPlan = {
      planId: 'plan_seq_test',
      originalRequest: 'Add bread and check household status',
      createdAt: new Date().toISOString(),
      requiresApproval: false,
      status: 'draft',
      steps: [
        {
          stepId: 'step_1',
          toolName: 'update_shopping_list',
          arguments: { items: ['Artisan Bread'], operation: 'add' },
          dependsOn: [],
          sensitive: false,
          status: 'pending',
          result: null,
          error: null,
          startedAt: null,
          completedAt: null
        },
        {
          stepId: 'step_2',
          toolName: 'get_household_status',
          arguments: { includeSimulatedDetails: true },
          dependsOn: ['step_1'],
          sensitive: false,
          status: 'pending',
          result: null,
          error: null,
          startedAt: null,
          completedAt: null
        }
      ]
    };

    const executed = await executePlan(plan);
    expect(executed.status).toBe('completed');
    expect(executed.steps[0].status).toBe('succeeded');
    expect(executed.steps[0].result?.success).toBe(true);
    expect(executed.steps[1].status).toBe('succeeded');

    // Verify SQLite persistence
    const saved = getActionPlan('plan_seq_test');
    expect(saved?.status).toBe('completed');
    expect(saved?.steps[0].status).toBe('succeeded');
  });

  // 5. Dependency failure
  it('5. skips dependent steps when a prerequisite step fails', async () => {
    const plan: ActionPlan = {
      planId: 'plan_dep_fail_test',
      originalRequest: 'Failing prerequisite test',
      createdAt: new Date().toISOString(),
      requiresApproval: false,
      status: 'draft',
      steps: [
        {
          stepId: 'step_fail',
          toolName: 'update_shopping_list',
          // Pass empty items to force tool failure
          arguments: { items: [], operation: 'invalid_operation' as any },
          dependsOn: [],
          sensitive: false,
          status: 'pending',
          result: null,
          error: null,
          startedAt: null,
          completedAt: null
        },
        {
          stepId: 'step_dependent',
          toolName: 'get_pending_actions',
          arguments: { filter: 'all' },
          dependsOn: ['step_fail'],
          sensitive: false,
          status: 'pending',
          result: null,
          error: null,
          startedAt: null,
          completedAt: null
        }
      ]
    };

    const executed = await executePlan(plan);
    expect(executed.status).toBe('failed');
    expect(executed.steps[0].status).toBe('failed');
    expect(executed.steps[1].status).toBe('skipped');
    expect(executed.steps[1].error).toContain('Prerequisite step');
  });

  // 6. Approval required
  it('6. pauses execution at sensitive steps and sets status to awaiting_approval', async () => {
    const request = "Remind my roommate to water the plants tomorrow";
    const plan = createActionPlanFromRequest(request);

    const executed = await executePlan(plan);
    expect(executed.status).toBe('awaiting_approval');

    const sensitiveStep = executed.steps.find(s => s.sensitive);
    expect(sensitiveStep).toBeDefined();
    expect(sensitiveStep?.status).toBe('awaiting_approval');
    expect(sensitiveStep?.result).toBeNull(); // Has NOT been executed yet
  });

  // 7. Approval accepted
  it('7. resumes execution when sensitive step is approved and records approver', async () => {
    const request = "Remind my roommate to water the plants tomorrow";
    const plan = createActionPlanFromRequest(request);

    // Initial run pauses at approval gate
    const paused = await executePlan(plan);
    const stepToApprove = paused.steps.find(s => s.status === 'awaiting_approval')!;

    // Approve the step
    const resumed = await ApprovalService.approveStep(paused.planId, stepToApprove.stepId, 'Homeowner Raj');

    expect(resumed.status).toBe('completed');
    const approvedStep = resumed.steps.find(s => s.stepId === stepToApprove.stepId)!;
    expect(approvedStep.status).toBe('succeeded');
    expect(approvedStep.approvedBy).toBe('Homeowner Raj');
    expect(approvedStep.approvedAt).toBeDefined();
    expect(approvedStep.result?.success).toBe(true);

    // Verify persisted in SQLite
    const persisted = getActionPlan(paused.planId);
    expect(persisted?.status).toBe('completed');
    expect(persisted?.steps.find(s => s.stepId === stepToApprove.stepId)?.approvedBy).toBe('Homeowner Raj');
  });

  // 8. Rejection
  it('8. handles rejection: cancels sensitive step, skips dependent steps, and records reason', async () => {
    const plan: ActionPlan = {
      planId: 'plan_reject_test',
      originalRequest: 'Send notification and then check status',
      createdAt: new Date().toISOString(),
      requiresApproval: true,
      status: 'draft',
      steps: [
        {
          stepId: 'step_msg',
          toolName: 'create_reminder',
          arguments: { title: 'Test sensitive action', assignee: 'Roommate', dueDate: 'Tomorrow' },
          dependsOn: [],
          sensitive: true,
          status: 'pending',
          result: null,
          error: null,
          startedAt: null,
          completedAt: null
        },
        {
          stepId: 'step_after',
          toolName: 'get_pending_actions',
          arguments: { filter: 'all' },
          dependsOn: ['step_msg'],
          sensitive: false,
          status: 'pending',
          result: null,
          error: null,
          startedAt: null,
          completedAt: null
        }
      ]
    };

    const paused = await executePlan(plan);
    expect(paused.status).toBe('awaiting_approval');

    const rejected = await ApprovalService.rejectStep(
      paused.planId,
      'step_msg',
      'User',
      'I will talk to roommate in person instead'
    );

    expect(rejected.status).toBe('cancelled');
    expect(rejected.steps[0].status).toBe('cancelled');
    expect(rejected.steps[0].rejectedBy).toBe('User');
    expect(rejected.steps[0].error).toContain('I will talk to roommate in person instead');
    expect(rejected.steps[1].status).toBe('skipped');
  });

  // 9. Cancellation
  it('9. cancels an active plan and all unfinished steps', async () => {
    const plan: ActionPlan = {
      planId: 'plan_cancel_test',
      originalRequest: 'Plan to cancel',
      createdAt: new Date().toISOString(),
      requiresApproval: false,
      status: 'draft',
      steps: [
        {
          stepId: 'step_1',
          toolName: 'get_household_status',
          arguments: {},
          dependsOn: [],
          sensitive: false,
          status: 'pending',
          result: null,
          error: null,
          startedAt: null,
          completedAt: null
        }
      ]
    };

    const { saveActionPlan } = await import('../src/db/database.js');
    saveActionPlan(plan);

    const cancelled = await ApprovalService.cancelPlan(plan.planId, 'User changed mind');
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.steps[0].status).toBe('cancelled');
    expect(cancelled.steps[0].error).toBe('User changed mind');
  });

  // 10. Retry
  it('10. retries a failed step and resumes execution', async () => {
    const plan: ActionPlan = {
      planId: 'plan_retry_test',
      originalRequest: 'Retry scenario',
      createdAt: new Date().toISOString(),
      requiresApproval: false,
      status: 'failed',
      steps: [
        {
          stepId: 'step_recover',
          toolName: 'update_shopping_list',
          // Valid arguments for recovery
          arguments: { items: ['Almond Milk'], operation: 'add' },
          dependsOn: [],
          sensitive: false,
          status: 'failed',
          result: null,
          error: 'Temporary simulated error',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        }
      ]
    };

    const db = getDatabase();
    // Pre-save plan into SQLite
    const { saveActionPlan } = await import('../src/db/database.js');
    saveActionPlan(plan);

    const retried = await ApprovalService.retryStep('plan_retry_test', 'step_recover');
    expect(retried.status).toBe('completed');
    expect(retried.steps[0].status).toBe('succeeded');
    expect(retried.steps[0].result?.success).toBe(true);
  });
});
