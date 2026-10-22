import { BaseToolResult, DepartureChecklist, CreateDepartureChecklistInputSchema } from '@homepilot/shared';
import { insertDepartureChecklist } from '../db/database.js';

/**
 * Tool: create_departure_checklist
 * 
 * Generates and persists a customized departure checklist in SQLite
 * covering security deadbolts, plant hydration, appliance shutdowns, HVAC away modes, and trash disposal.
 */
export function executeCreateDepartureChecklist(rawInput: unknown): BaseToolResult<DepartureChecklist | null> {
  const parsed = CreateDepartureChecklistInputSchema.safeParse(rawInput);
  const now = new Date().toISOString();

  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map(i => `${i.path.join('.') || 'input'}: ${i.message}`).join(', ');
    return {
      success: false,
      message: `Invalid departure checklist input: ${errorDetails}`,
      data: null,
      timestamp: now,
      actionId: `err_chk_${Date.now()}`
    };
  }

  const { departureDate, returnDate, notes, customItems } = parsed.data;

  const checklist = insertDepartureChecklist(departureDate, returnDate, notes, customItems);

  return {
    success: true,
    message: `Departure checklist created with ${checklist.items.length} safety & maintenance items for trip from ${departureDate} to ${returnDate}. Persisted in SQLite.`,
    data: checklist,
    timestamp: now,
    actionId: `act_chk_${Date.now()}`
  };
}
