import { z } from 'zod';

/**
 * Zod Schemas for Model Context Protocol Tools
 */

// Tool 1: get_household_status (no required arguments, optional filter)
export const GetHouseholdStatusInputSchema = z.object({
  includeSimulatedDetails: z.boolean().optional().default(true).describe('Whether to include detailed simulated sensor telemetry'),
}).strict();

export type GetHouseholdStatusInput = z.infer<typeof GetHouseholdStatusInputSchema>;

// Tool 2: create_reminder
export const CreateReminderInputSchema = z.object({
  title: z.string().min(1, 'Title is required').describe('Title of the reminder'),
  assignee: z.string().min(1, 'Assignee is required').describe('Person assigned to this reminder (e.g. roommate, self)'),
  dueDate: z.string().min(1, 'Due date is required').describe('Due date/time in ISO or readable string format (e.g., "Tomorrow 10:00 AM", "2026-10-23T10:00:00Z")'),
  notes: z.string().optional().describe('Optional additional instructions or context'),
  isSensitive: z.boolean().optional().default(true).describe('Flag indicating this notification/message needs user confirmation'),
  allowDuplicate: z.boolean().optional().default(false).describe('Whether to force creating a duplicate reminder if an identical one exists'),
}).strict();

export type CreateReminderInput = z.infer<typeof CreateReminderInputSchema>;

// Tool 3: update_shopping_list
export const UpdateShoppingListInputSchema = z.object({
  items: z.array(z.string().min(1)).min(1, 'At least one item must be provided').describe('List of grocery or household item names to add or remove'),
  operation: z.enum(['add', 'remove']).describe('Operation to perform: "add" or "remove"'),
  category: z.string().optional().describe('Optional category like "dairy", "produce", "pantry"'),
}).strict();

export type UpdateShoppingListInput = z.infer<typeof UpdateShoppingListInputSchema>;

// Tool 4: create_departure_checklist
export const CreateDepartureChecklistInputSchema = z.object({
  departureDate: z.string().min(1, 'Departure date is required').describe('Date or timestamp when leaving home (e.g., "2026-10-23", "Tomorrow morning")'),
  returnDate: z.string().min(1, 'Return date is required').describe('Date or timestamp when returning home (e.g., "2026-10-26", "In three days")'),
  notes: z.string().optional().describe('Optional notes or specific trip considerations'),
  customItems: z.array(z.string()).optional().describe('Optional custom items to include in checklist'),
}).strict();

export type CreateDepartureChecklistInput = z.infer<typeof CreateDepartureChecklistInputSchema>;

// Tool 5: get_pending_actions
export const GetPendingActionsInputSchema = z.object({
  filter: z.enum(['all', 'urgent', 'checklist_only', 'reminders_only']).optional().default('all').describe('Filter criteria for pending items'),
}).strict();

export type GetPendingActionsInput = z.infer<typeof GetPendingActionsInputSchema>;

// Shared standard tool output schema
export const BaseToolResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.unknown(),
  timestamp: z.string(),
  actionId: z.string(),
  isSimulated: z.boolean().optional(),
});

// Plan Step and Action Plan Schemas
export const PlanStepStatusSchema = z.enum([
  'pending',
  'awaiting_approval',
  'running',
  'succeeded',
  'failed',
  'cancelled',
  'skipped'
]);

export const ActionPlanStatusSchema = z.enum([
  'draft',
  'awaiting_approval',
  'running',
  'completed',
  'failed',
  'cancelled'
]);

export const PlanStepSchema = z.object({
  stepId: z.string(),
  toolName: z.string(),
  arguments: z.record(z.unknown()),
  dependsOn: z.array(z.string()).default([]),
  sensitive: z.boolean().default(false),
  status: PlanStepStatusSchema,
  result: BaseToolResultSchema.nullable().default(null),
  error: z.string().nullable().default(null),
  startedAt: z.string().nullable().default(null),
  completedAt: z.string().nullable().default(null),
  approvedBy: z.string().nullable().optional(),
  approvedAt: z.string().nullable().optional(),
  rejectedBy: z.string().nullable().optional(),
  rejectedAt: z.string().nullable().optional()
});

export const ActionPlanSchema = z.object({
  planId: z.string(),
  originalRequest: z.string(),
  createdAt: z.string(),
  steps: z.array(PlanStepSchema),
  requiresApproval: z.boolean(),
  status: ActionPlanStatusSchema,
  updatedAt: z.string().optional()
});

// API Request Schemas
export const CreatePlanRequestSchema = z.object({
  request: z.string().min(1, 'User request cannot be empty'),
  autoExecute: z.boolean().optional().default(true).describe('Whether to immediately begin sequential execution up to the first approval gate')
}).strict();

export type CreatePlanRequest = z.infer<typeof CreatePlanRequestSchema>;

export const ApproveStepRequestSchema = z.object({
  approver: z.string().optional().default('User')
}).strict();

export type ApproveStepRequest = z.infer<typeof ApproveStepRequestSchema>;

export const RejectStepRequestSchema = z.object({
  reason: z.string().optional().default('Rejected by user'),
  rejecter: z.string().optional().default('User')
}).strict();

export type RejectStepRequest = z.infer<typeof RejectStepRequestSchema>;

export const CancelPlanRequestSchema = z.object({
  reason: z.string().optional().default('Cancelled by user')
}).strict();

export type CancelPlanRequest = z.infer<typeof CancelPlanRequestSchema>;
