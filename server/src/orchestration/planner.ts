import {
  ActionPlan,
  PlanStep,
  ActionPlanSchema,
  GetHouseholdStatusInputSchema,
  CreateReminderInputSchema,
  UpdateShoppingListInputSchema,
  CreateDepartureChecklistInputSchema,
  GetPendingActionsInputSchema
} from '@homepilot/shared';

export const ALLOWED_TOOLS = [
  'get_household_status',
  'create_reminder',
  'update_shopping_list',
  'create_departure_checklist',
  'get_pending_actions'
] as const;

export type AllowedToolName = (typeof ALLOWED_TOOLS)[number];

export interface ValidationIssue {
  stepId?: string;
  field?: string;
  message: string;
}

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a single plan step against allowed tools and strict Zod schemas.
 */
export function validatePlanStep(step: PlanStep): PlanValidationResult {
  const errors: string[] = [];

  // 1. Tool name validation
  if (!ALLOWED_TOOLS.includes(step.toolName as AllowedToolName)) {
    errors.push(`Tool '${step.toolName}' is not in the allowed MCP tools registry (${ALLOWED_TOOLS.join(', ')}).`);
    return { valid: false, errors };
  }

  // 2. Argument schema validation
  switch (step.toolName) {
    case 'get_household_status': {
      const res = GetHouseholdStatusInputSchema.safeParse(step.arguments);
      if (!res.success) {
        errors.push(`Invalid arguments for get_household_status: ${res.error.issues.map(i => i.message).join('; ')}`);
      }
      break;
    }
    case 'create_reminder': {
      const res = CreateReminderInputSchema.safeParse(step.arguments);
      if (!res.success) {
        errors.push(`Invalid arguments for create_reminder: ${res.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      }
      break;
    }
    case 'update_shopping_list': {
      const res = UpdateShoppingListInputSchema.safeParse(step.arguments);
      if (!res.success) {
        errors.push(`Invalid arguments for update_shopping_list: ${res.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      }
      break;
    }
    case 'create_departure_checklist': {
      const res = CreateDepartureChecklistInputSchema.safeParse(step.arguments);
      if (!res.success) {
        errors.push(`Invalid arguments for create_departure_checklist: ${res.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      }
      break;
    }
    case 'get_pending_actions': {
      const res = GetPendingActionsInputSchema.safeParse(step.arguments);
      if (!res.success) {
        errors.push(`Invalid arguments for get_pending_actions: ${res.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      }
      break;
    }
    default:
      errors.push(`Unhandled tool validation for: ${step.toolName}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates the full ActionPlan including dependencies and structure.
 */
export function validateActionPlan(plan: ActionPlan): PlanValidationResult {
  const errors: string[] = [];

  const parsed = ActionPlanSchema.safeParse(plan);
  if (!parsed.success) {
    errors.push(`Plan schema failure: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    return { valid: false, errors };
  }

  if (plan.steps.length === 0) {
    errors.push('Action plan contains zero executable steps.');
  }

  const stepIds = new Set<string>();

  for (const step of plan.steps) {
    if (stepIds.has(step.stepId)) {
      errors.push(`Duplicate stepId '${step.stepId}' found in plan.`);
    }
    stepIds.add(step.stepId);

    // Validate step arguments and tool
    const stepValidation = validatePlanStep(step);
    if (!stepValidation.valid) {
      errors.push(...stepValidation.errors.map(e => `[Step ${step.stepId}] ${e}`));
    }

    // Validate dependsOn references
    for (const depId of step.dependsOn) {
      if (!stepIds.has(depId) && !plan.steps.some(s => s.stepId === depId)) {
        errors.push(`[Step ${step.stepId}] references unknown dependsOn stepId '${depId}'.`);
      }
      if (depId === step.stepId) {
        errors.push(`[Step ${step.stepId}] cannot depend on itself.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Creates an ActionPlan from a natural language user request.
 * Decomposes multi-intent household requests into ordered, typed steps.
 */
export function createActionPlanFromRequest(userRequest: string): ActionPlan {
  const trimmed = userRequest.trim();
  if (!trimmed) {
    throw new Error('User request cannot be empty.');
  }

  const lower = trimmed.toLowerCase();

  // Safety & scope filter
  const outOfScopePatterns = [
    /\b(hack|jailbreak|exploit|transfer money|delete system|rm -rf)\b/i
  ];
  for (const pattern of outOfScopePatterns) {
    if (pattern.test(lower)) {
      throw new Error('Out of scope or unsafe action requested. Action aborted.');
    }
  }

  const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date();
  const createdAt = now.toISOString();
  const steps: PlanStep[] = [];

  // Pattern Detection for Core Hackathon Scenarios

  // 1. Departure Checklist Intent
  const isLeaving = lower.includes('leaving') || lower.includes('depart') || lower.includes('trip') || lower.includes('vacation') || lower.includes('checklist');
  let departureStepId: string | null = null;

  if (isLeaving) {
    departureStepId = `step_chk_${Date.now()}_1`;
    
    // Extract dates/duration
    let departureDate = new Date(now.getTime() + 86400000).toISOString().split('T')[0]; // Default tomorrow
    let returnDate = new Date(now.getTime() + 4 * 86400000).toISOString().split('T')[0]; // Default +3 days

    if (lower.includes('three days') || lower.includes('3 days')) {
      returnDate = new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0];
    } else if (lower.includes('week') || lower.includes('7 days')) {
      returnDate = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
    }

    steps.push({
      stepId: departureStepId,
      toolName: 'create_departure_checklist',
      arguments: {
        departureDate,
        returnDate,
        notes: `Household departure trip planned for ${departureDate} to ${returnDate}.`
      },
      dependsOn: [],
      sensitive: false,
      status: 'pending',
      result: null,
      error: null,
      startedAt: null,
      completedAt: null
    });
  }

  // 2. Roommate / External Reminder Intent (Sensitive Action)
  const isReminder = lower.includes('remind') || lower.includes('reminder') || lower.includes('tell roommate') || lower.includes('notify');
  let reminderStepId: string | null = null;

  if (isReminder) {
    reminderStepId = `step_rem_${Date.now()}_2`;

    let assignee = 'roommate';
    if (lower.includes('roommate')) assignee = 'Roommate';
    else if (lower.includes('alex')) assignee = 'Alex';
    else if (lower.includes('sam')) assignee = 'Sam';

    let title = 'Water the plants';
    if (lower.includes('plant') || lower.includes('water')) {
      title = 'Water the indoor plants & Fiddle Leaf Fig';
    } else if (lower.includes('trash')) {
      title = 'Take out the trash';
    } else if (lower.includes('mail')) {
      title = 'Collect the mail';
    }

    const dueDate = 'Tomorrow 10:00 AM';

    // Sensitive: Sending notification to another person requires explicit approval
    const isExternalPerson = assignee.toLowerCase() !== 'me' && assignee.toLowerCase() !== 'self';
    const sensitive = isExternalPerson;

    steps.push({
      stepId: reminderStepId,
      toolName: 'create_reminder',
      arguments: {
        title,
        assignee,
        dueDate,
        notes: 'Living room Fiddle Leaf Fig soil moisture is currently low.',
        isSensitive: sensitive
      },
      dependsOn: departureStepId ? [departureStepId] : [],
      sensitive,
      status: 'pending',
      result: null,
      error: null,
      startedAt: null,
      completedAt: null
    });
  }

  // 3. Shopping List Intent
  const isShopping = lower.includes('shopping list') || lower.includes('groceries') || lower.includes('milk') || lower.includes('eggs') || lower.includes('bread');
  let shoppingStepId: string | null = null;

  if (isShopping) {
    shoppingStepId = `step_shop_${Date.now()}_3`;

    const itemsToAdd: string[] = [];
    if (lower.includes('milk')) itemsToAdd.push('Whole Milk');
    if (lower.includes('egg')) itemsToAdd.push('Pasture-Raised Large Eggs');
    if (lower.includes('bread')) itemsToAdd.push('Sourdough Bread');
    if (lower.includes('coffee')) itemsToAdd.push('Cold Brew Coffee');

    if (itemsToAdd.length === 0) {
      itemsToAdd.push('Groceries for return');
    }

    steps.push({
      stepId: shoppingStepId,
      toolName: 'update_shopping_list',
      arguments: {
        items: itemsToAdd,
        operation: 'add',
        category: 'dairy'
      },
      dependsOn: [],
      sensitive: false,
      status: 'pending',
      result: null,
      error: null,
      startedAt: null,
      completedAt: null
    });
  }

  // 4. Household Attention / Pending Actions Intent
  const isPending = lower.includes('attention') || lower.includes('pending') || lower.includes('status') || isLeaving;

  if (isPending) {
    const pendingStepId = `step_pend_${Date.now()}_4`;
    const deps: string[] = [];
    if (departureStepId) deps.push(departureStepId);
    if (shoppingStepId) deps.push(shoppingStepId);

    steps.push({
      stepId: pendingStepId,
      toolName: 'get_pending_actions',
      arguments: {
        filter: 'all'
      },
      dependsOn: deps,
      sensitive: false,
      status: 'pending',
      result: null,
      error: null,
      startedAt: null,
      completedAt: null
    });
  }

  // Fallback for general status inquiry if no other intent matched
  if (steps.length === 0) {
    steps.push({
      stepId: `step_status_${Date.now()}`,
      toolName: 'get_household_status',
      arguments: {
        includeSimulatedDetails: true
      },
      dependsOn: [],
      sensitive: false,
      status: 'pending',
      result: null,
      error: null,
      startedAt: null,
      completedAt: null
    });
  }

  const requiresApproval = steps.some(s => s.sensitive);

  const plan: ActionPlan = {
    planId,
    originalRequest: trimmed,
    createdAt,
    steps,
    requiresApproval,
    status: 'draft',
    updatedAt: createdAt
  };

  // Strictly validate the plan before returning
  const validation = validateActionPlan(plan);
  if (!validation.valid) {
    throw new Error(`Plan validation failed: ${validation.errors.join(', ')}`);
  }

  return plan;
}
