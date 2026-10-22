import { Router, Request, Response } from 'express';
import {
  CreatePlanRequestSchema,
  ApproveStepRequestSchema,
  RejectStepRequestSchema,
  CancelPlanRequestSchema
} from '@homepilot/shared';
import { createActionPlanFromRequest } from './planner.js';
import { executePlan } from './executionEngine.js';
import { ApprovalService } from './approvalService.js';
import { getActionPlan, getAllActionPlans } from '../db/database.js';

export const planRouter = Router();

/**
 * POST /api/plan
 * Creates an action plan from natural language and begins sequential execution up to any approval gate.
 */
planRouter.post('/', async (req: Request, res: Response) => {
  const parseResult = CreatePlanRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'Invalid request payload',
      details: parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
    });
    return;
  }

  const { request, autoExecute } = parseResult.data;

  try {
    const plan = createActionPlanFromRequest(request);

    if (autoExecute) {
      const executedPlan = await executePlan(plan);
      res.status(201).json(executedPlan);
    } else {
      res.status(201).json(plan);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(422).json({
      error: 'Failed to create action plan',
      message
    });
  }
});

/**
 * GET /api/plan
 * List all action plans
 */
planRouter.get('/', (_req: Request, res: Response) => {
  const plans = getAllActionPlans();
  res.json({ plans });
});

/**
 * GET /api/plan/:planId
 * Returns the current plan and step execution states
 */
planRouter.get('/:planId', (req: Request, res: Response) => {
  const planId = String(req.params.planId);
  const plan = getActionPlan(planId);

  if (!plan) {
    res.status(404).json({ error: `Plan '${planId}' not found.` });
    return;
  }

  res.json(plan);
});

/**
 * POST /api/plan/:planId/approve/:stepId
 * Approves a sensitive step and resumes execution
 */
planRouter.post('/:planId/approve/:stepId', async (req: Request, res: Response) => {
  const planId = String(req.params.planId);
  const stepId = String(req.params.stepId);
  const parseResult = ApproveStepRequestSchema.safeParse(req.body || {});

  const approver = parseResult.success ? parseResult.data.approver : 'User';

  try {
    const updatedPlan = await ApprovalService.approveStep(planId, stepId, approver);
    res.json(updatedPlan);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: 'Failed to approve step', message });
  }
});

/**
 * POST /api/plan/:planId/reject/:stepId
 * Rejects a sensitive step and marks dependent steps as skipped
 */
planRouter.post('/:planId/reject/:stepId', async (req: Request, res: Response) => {
  const planId = String(req.params.planId);
  const stepId = String(req.params.stepId);
  const parseResult = RejectStepRequestSchema.safeParse(req.body || {});

  const rejecter = parseResult.success ? parseResult.data.rejecter : 'User';
  const reason = parseResult.success ? parseResult.data.reason : 'Rejected by user';

  try {
    const updatedPlan = await ApprovalService.rejectStep(planId, stepId, rejecter, reason);
    res.json(updatedPlan);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: 'Failed to reject step', message });
  }
});

/**
 * POST /api/plan/:planId/cancel
 * Cancels the entire plan
 */
planRouter.post('/:planId/cancel', async (req: Request, res: Response) => {
  const planId = String(req.params.planId);
  const parseResult = CancelPlanRequestSchema.safeParse(req.body || {});
  const reason = parseResult.success ? parseResult.data.reason : 'Cancelled by user';

  try {
    const updatedPlan = await ApprovalService.cancelPlan(planId, reason);
    res.json(updatedPlan);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: 'Failed to cancel plan', message });
  }
});

/**
 * POST /api/plan/:planId/retry/:stepId
 * Retries a failed step
 */
planRouter.post('/:planId/retry/:stepId', async (req: Request, res: Response) => {
  const planId = String(req.params.planId);
  const stepId = String(req.params.stepId);

  try {
    const updatedPlan = await ApprovalService.retryStep(planId, stepId);
    res.json(updatedPlan);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: 'Failed to retry step', message });
  }
});
