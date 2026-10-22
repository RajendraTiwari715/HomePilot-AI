import { ActionPlan, ActionPlanSchema, BaseToolResult, HouseholdStatus, PendingActionsOverview } from '@homepilot/shared';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(message: string, public status?: number, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Validates JSON response against a Zod schema.
 * Throws a clean ApiError if validation fails, satisfying:
 * "Validate all API responses with Zod. If the response shape is unexpected, show an error instead of rendering incorrect data."
 */
function validateWithZod<T>(schema: { parse: (data: unknown) => unknown }, data: unknown, context: string): T {
  try {
    return schema.parse(data) as T;
  } catch (err) {
    throw new ApiError(`Validation error in ${context}: ${err instanceof Error ? err.message : String(err)}`, 500, err);
  }
}

export const api = {
  // Plan Lifecycle APIs
  async createPlan(request: string, autoExecute: boolean = true): Promise<ActionPlan> {
    const res = await fetch(`${API_BASE}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request, autoExecute })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(err.message || 'Failed to create plan', res.status, err);
    }

    const json = await res.json();
    return validateWithZod(ActionPlanSchema, json, 'POST /api/plan');
  },

  async getPlan(planId: string): Promise<ActionPlan> {
    const res = await fetch(`${API_BASE}/api/plan/${planId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(err.message || `Plan ${planId} not found`, res.status, err);
    }
    const json = await res.json();
    return validateWithZod(ActionPlanSchema, json, `GET /api/plan/${planId}`);
  },

  async approveStep(planId: string, stepId: string, approver: string = 'User (Dashboard)'): Promise<ActionPlan> {
    const res = await fetch(`${API_BASE}/api/plan/${planId}/approve/${stepId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approver })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(err.message || 'Failed to approve step', res.status, err);
    }
    const json = await res.json();
    return validateWithZod(ActionPlanSchema, json, `POST /api/plan/.../approve/${stepId}`);
  },

  async rejectStep(planId: string, stepId: string, reason: string = 'Rejected by user in dashboard'): Promise<ActionPlan> {
    const res = await fetch(`${API_BASE}/api/plan/${planId}/reject/${stepId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, rejecter: 'User (Dashboard)' })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(err.message || 'Failed to reject step', res.status, err);
    }
    const json = await res.json();
    return validateWithZod(ActionPlanSchema, json, `POST /api/plan/.../reject/${stepId}`);
  },

  async cancelPlan(planId: string, reason: string = 'Cancelled by user'): Promise<ActionPlan> {
    const res = await fetch(`${API_BASE}/api/plan/${planId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(err.message || 'Failed to cancel plan', res.status, err);
    }
    const json = await res.json();
    return validateWithZod(ActionPlanSchema, json, `POST /api/plan/.../cancel`);
  },

  async retryStep(planId: string, stepId: string): Promise<ActionPlan> {
    const res = await fetch(`${API_BASE}/api/plan/${planId}/retry/${stepId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(err.message || 'Failed to retry step', res.status, err);
    }
    const json = await res.json();
    return validateWithZod(ActionPlanSchema, json, `POST /api/plan/.../retry/${stepId}`);
  },

  // Direct Live Data Endpoints
  async getHouseholdStatus(): Promise<BaseToolResult<HouseholdStatus>> {
    const res = await fetch(`${API_BASE}/api/tools/get_household_status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ includeSimulatedDetails: true })
    });
    if (!res.ok) throw new ApiError('Failed to fetch household status', res.status);
    return res.json();
  },

  async getPendingActions(): Promise<BaseToolResult<PendingActionsOverview>> {
    const res = await fetch(`${API_BASE}/api/tools/get_pending_actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter: 'all' })
    });
    if (!res.ok) throw new ApiError('Failed to fetch pending actions', res.status);
    return res.json();
  },

  async getHealth(): Promise<{ status: string; service: string; activeSessions: number }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new ApiError('Backend health check failed', res.status);
    return res.json();
  }
};
