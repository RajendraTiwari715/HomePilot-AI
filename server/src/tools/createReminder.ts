import { BaseToolResult, Reminder, CreateReminderInputSchema } from '@homepilot/shared';
import { insertReminder, findReminderByDetails } from '../db/database.js';

/**
 * Tool: create_reminder
 * 
 * Creates and persists a reminder in SQLite.
 * Designed with approval-awareness (sensitive action) and idempotency protection.
 */
export function executeCreateReminder(rawInput: unknown): BaseToolResult<Reminder | null> {
  const parsed = CreateReminderInputSchema.safeParse(rawInput);
  const now = new Date().toISOString();

  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map(i => `${i.path.join('.') || 'input'}: ${i.message}`).join(', ');
    return {
      success: false,
      message: `Invalid reminder input: ${errorDetails}`,
      data: null,
      timestamp: now,
      actionId: `err_rem_${Date.now()}`
    };
  }

  const { title, assignee, dueDate, notes, isSensitive, allowDuplicate } = parsed.data;

  // Idempotency check: avoid duplicate pending reminders unless explicitly permitted
  if (!allowDuplicate) {
    const existing = findReminderByDetails(title, assignee, dueDate);
    if (existing) {
      return {
        success: true,
        message: `Idempotent execution: A matching pending reminder already exists for ${assignee} ("${title}", Due: ${dueDate}). No duplicate created.`,
        data: existing,
        timestamp: now,
        actionId: `act_rem_idemp_${Date.now()}`
      };
    }
  }

  const created = insertReminder({
    title,
    assignee,
    dueDate,
    notes,
    isSensitive: isSensitive ?? true,
    status: 'pending'
  });

  return {
    success: true,
    message: `Reminder successfully created and saved in SQLite for ${assignee}: "${title}" due ${dueDate}.`,
    data: created,
    timestamp: now,
    actionId: `act_rem_${Date.now()}`
  };
}
