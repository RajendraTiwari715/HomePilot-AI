import { BaseToolResult, PendingActionsOverview, GetPendingActionsInputSchema } from '@homepilot/shared';
import { getAllChecklistItems, getAllReminders } from '../db/database.js';
import { executeGetHouseholdStatus } from './getHouseholdStatus.js';

/**
 * Tool: get_pending_actions
 * 
 * Aggregates incomplete departure checklist tasks, pending reminders (from SQLite),
 * and active low-stock grocery & sensor alerts (from simulated household telemetry).
 */
export function executeGetPendingActions(rawInput: unknown): BaseToolResult<PendingActionsOverview | null> {
  const parsed = GetPendingActionsInputSchema.safeParse(rawInput || {});
  const now = new Date().toISOString();

  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map(i => `${i.path.join('.') || 'input'}: ${i.message}`).join(', ');
    return {
      success: false,
      message: `Invalid get_pending_actions input: ${errorDetails}`,
      data: null,
      timestamp: now,
      actionId: `err_pend_${Date.now()}`
    };
  }

  const { filter } = parsed.data;

  // 1. Incomplete checklist items from SQLite
  const incompleteChecklist = getAllChecklistItems(false);

  // 2. Pending reminders from SQLite
  const pendingReminders = getAllReminders().filter(r => r.status === 'pending');

  // 3. Low-stock groceries & alerts from simulated telemetry
  const household = executeGetHouseholdStatus();
  const lowStockGroceries = household.data.groceries.filter(g => g.isLowStock);
  const activeAlerts = household.data.alerts.filter(a => !a.acknowledged);

  // Apply filters if requested
  const filteredChecklist = (filter === 'reminders_only') ? [] : incompleteChecklist;
  const filteredReminders = (filter === 'checklist_only') ? [] : pendingReminders;
  const filteredGroceries = (filter === 'checklist_only' || filter === 'reminders_only') ? [] : lowStockGroceries;
  const filteredAlerts = (filter === 'checklist_only' || filter === 'reminders_only') ? [] : activeAlerts;

  const data: PendingActionsOverview = {
    incompleteChecklistCount: filteredChecklist.length,
    pendingRemindersCount: filteredReminders.length,
    lowStockGroceriesCount: filteredGroceries.length,
    urgentAlertsCount: filteredAlerts.length,
    incompleteChecklist: filteredChecklist,
    pendingReminders: filteredReminders,
    lowStockGroceries: filteredGroceries,
    activeAlerts: filteredAlerts
  };

  const totalActions = filteredChecklist.length + filteredReminders.length + filteredGroceries.length;

  return {
    success: true,
    message: `Pending household actions retrieved: ${filteredChecklist.length} departure checklist items, ${filteredReminders.length} reminders, and ${filteredGroceries.length} low-stock grocery alerts need attention.`,
    data,
    timestamp: now,
    actionId: `act_pend_${Date.now()}`,
    isSimulated: true
  };
}
