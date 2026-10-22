import { ActionPlan } from '@homepilot/shared';
import { getActionPlan, updatePlanStep, updatePlanStatus } from '../db/database.js';
import { executePlan } from './executionEngine.js';

export class ApprovalService {
  /**
   * Approves a sensitive step and immediately resumes plan execution.
   */
  static async approveStep(planId: string, stepId: string, approver: string = 'User'): Promise<ActionPlan> {
    const plan = getActionPlan(planId);
    if (!plan) {
      throw new Error(`Plan '${planId}' not found.`);
    }

    const step = plan.steps.find(s => s.stepId === stepId);
    if (!step) {
      throw new Error(`Step '${stepId}' not found in plan '${planId}'.`);
    }

    if (step.status !== 'awaiting_approval') {
      throw new Error(`Step '${stepId}' cannot be approved because its status is '${step.status}' (expected 'awaiting_approval').`);
    }

    const now = new Date().toISOString();
    step.approvedBy = approver;
    step.approvedAt = now;
    step.status = 'pending'; // Reset to pending so execution engine runs it

    updatePlanStep(planId, step);
    updatePlanStatus(planId, 'running');

    // Resume execution
    const updatedPlan = getActionPlan(planId) || plan;
    return executePlan(updatedPlan);
  }

  /**
   * Rejects a sensitive step, marks it and downstream steps as cancelled/skipped.
   */
  static async rejectStep(
    planId: string,
    stepId: string,
    rejecter: string = 'User',
    reason: string = 'Rejected by user'
  ): Promise<ActionPlan> {
    const plan = getActionPlan(planId);
    if (!plan) {
      throw new Error(`Plan '${planId}' not found.`);
    }

    const step = plan.steps.find(s => s.stepId === stepId);
    if (!step) {
      throw new Error(`Step '${stepId}' not found in plan '${planId}'.`);
    }

    const now = new Date().toISOString();
    step.rejectedBy = rejecter;
    step.rejectedAt = now;
    step.status = 'cancelled';
    step.error = reason;
    step.completedAt = now;

    updatePlanStep(planId, step);

    // Skip all downstream dependent steps
    for (const downstream of plan.steps) {
      if (downstream.dependsOn && downstream.dependsOn.includes(stepId)) {
        downstream.status = 'skipped';
        downstream.error = `Prerequisite step ${stepId} (${step.toolName}) was rejected by ${rejecter}.`;
        downstream.completedAt = now;
        updatePlanStep(planId, downstream);
      }
    }

    updatePlanStatus(planId, 'cancelled');
    return getActionPlan(planId) || plan;
  }

  /**
   * Cancels the entire plan and marks unfinished steps as cancelled.
   */
  static async cancelPlan(planId: string, reason: string = 'Cancelled by user'): Promise<ActionPlan> {
    const plan = getActionPlan(planId);
    if (!plan) {
      throw new Error(`Plan '${planId}' not found.`);
    }

    const now = new Date().toISOString();

    for (const step of plan.steps) {
      if (['pending', 'awaiting_approval', 'running'].includes(step.status)) {
        step.status = 'cancelled';
        step.error = reason;
        step.completedAt = now;
        updatePlanStep(planId, step);
      }
    }

    updatePlanStatus(planId, 'cancelled');
    return getActionPlan(planId) || plan;
  }

  /**
   * Retries a failed step and any previously skipped dependent steps.
   */
  static async retryStep(planId: string, stepId: string): Promise<ActionPlan> {
    const plan = getActionPlan(planId);
    if (!plan) {
      throw new Error(`Plan '${planId}' not found.`);
    }

    const step = plan.steps.find(s => s.stepId === stepId);
    if (!step) {
      throw new Error(`Step '${stepId}' not found in plan '${planId}'.`);
    }

    if (step.status !== 'failed') {
      throw new Error(`Step '${stepId}' is in status '${step.status}' and cannot be retried (only 'failed' steps can be retried).`);
    }

    // Reset failed step
    step.status = 'pending';
    step.error = null;
    step.result = null;
    step.startedAt = null;
    step.completedAt = null;
    updatePlanStep(planId, step);

    // Reset any dependent steps that were skipped due to this failure
    for (const downstream of plan.steps) {
      if (downstream.dependsOn && downstream.dependsOn.includes(stepId) && downstream.status === 'skipped') {
        downstream.status = 'pending';
        downstream.error = null;
        downstream.result = null;
        downstream.startedAt = null;
        downstream.completedAt = null;
        updatePlanStep(planId, downstream);
      }
    }

    updatePlanStatus(planId, 'running');

    // Resume execution
    const updatedPlan = getActionPlan(planId) || plan;
    return executePlan(updatedPlan);
  }
}
