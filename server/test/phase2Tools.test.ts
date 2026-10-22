import { describe, it, expect, beforeEach } from 'vitest';
import { executeCreateReminder } from '../src/tools/createReminder.js';
import { executeUpdateShoppingList } from '../src/tools/updateShoppingList.js';
import { executeCreateDepartureChecklist } from '../src/tools/createDepartureChecklist.js';
import { executeGetPendingActions } from '../src/tools/getPendingActions.js';
import { getDatabase, getAllReminders, getAllShoppingItems, getLatestDepartureChecklist, resetDatabaseInstance } from '../src/db/database.js';

describe('Phase 2 Tools & SQLite Persistence', () => {
  beforeEach(() => {
    // Reset database state for clean test isolation
    const db = getDatabase();
    db.exec(`
      DELETE FROM checklist_items;
      DELETE FROM departure_checklists;
      DELETE FROM shopping_items;
      DELETE FROM reminders;
    `);
  });

  describe('1. create_reminder', () => {
    it('creates and persists a reminder with valid input', () => {
      const result = executeCreateReminder({
        title: 'Remind roommate to water the plants',
        assignee: 'Sam',
        dueDate: 'Tomorrow 10:00 AM',
        notes: 'Fiddle Leaf Fig needs 2 cups of water',
        isSensitive: true
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Sam');
      expect(result.data).toBeDefined();
      expect(result.data?.id).toMatch(/^rem_/);
      expect(result.data?.assignee).toBe('Sam');
      expect(result.data?.isSensitive).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(result.actionId).toMatch(/^act_rem_/);

      // Verify persistence in SQLite
      const remindersInDb = getAllReminders();
      expect(remindersInDb.length).toBe(1);
      expect(remindersInDb[0].title).toBe('Remind roommate to water the plants');
      expect(remindersInDb[0].assignee).toBe('Sam');
    });

    it('handles idempotency: repeated call does not create a duplicate', () => {
      const input = {
        title: 'Water the plants',
        assignee: 'Sam',
        dueDate: '2026-10-23T10:00:00Z',
        isSensitive: true
      };

      // Call 1: Creates reminder
      const call1 = executeCreateReminder(input);
      expect(call1.success).toBe(true);
      const originalId = call1.data?.id;

      // Call 2: Repeated write call (idempotency test)
      const call2 = executeCreateReminder(input);
      expect(call2.success).toBe(true);
      expect(call2.data?.id).toBe(originalId);
      expect(call2.message).toContain('Idempotent execution');

      // Verify SQLite only has 1 record
      const remindersInDb = getAllReminders();
      expect(remindersInDb.length).toBe(1);
    });

    it('returns structured validation error for invalid input', () => {
      // Missing title and assignee
      const invalidResult = executeCreateReminder({
        notes: 'Forgot title and assignee'
      });

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.message).toContain('Invalid reminder input');
      expect(invalidResult.data).toBeNull();
      expect(invalidResult.actionId).toMatch(/^err_rem_/);
    });
  });

  describe('2. update_shopping_list', () => {
    it('adds items and persists them in SQLite', () => {
      const result = executeUpdateShoppingList({
        items: ['Whole Milk', 'Large Eggs'],
        operation: 'add',
        category: 'dairy'
      });

      expect(result.success).toBe(true);
      expect(result.data?.operation).toBe('add');
      expect(result.data?.added?.length).toBe(2);
      expect(result.data?.currentList.length).toBe(2);

      // Verify persistence in SQLite
      const itemsInDb = getAllShoppingItems();
      expect(itemsInDb.length).toBe(2);
      expect(itemsInDb.some(i => i.item.toLowerCase().includes('milk'))).toBe(true);
      expect(itemsInDb.some(i => i.item.toLowerCase().includes('eggs'))).toBe(true);
    });

    it('deduplicates items when repeated (idempotency)', () => {
      // Add milk once
      executeUpdateShoppingList({
        items: ['Whole Milk'],
        operation: 'add'
      });

      // Repeat adding milk
      const result2 = executeUpdateShoppingList({
        items: ['Whole Milk', 'Sourdough Bread'],
        operation: 'add'
      });

      expect(result2.success).toBe(true);
      expect(result2.data?.added?.length).toBe(1); // Only bread was newly added
      expect(result2.data?.alreadyInList?.length).toBe(1); // Milk was skipped

      const itemsInDb = getAllShoppingItems();
      expect(itemsInDb.length).toBe(2); // No duplicate milk
    });

    it('removes items correctly', () => {
      executeUpdateShoppingList({
        items: ['Milk', 'Eggs', 'Bread'],
        operation: 'add'
      });

      const removeResult = executeUpdateShoppingList({
        items: ['Milk'],
        operation: 'remove'
      });

      expect(removeResult.success).toBe(true);
      expect(removeResult.data?.removed).toContain('Milk');
      expect(removeResult.data?.currentList.length).toBe(2);

      const itemsInDb = getAllShoppingItems();
      expect(itemsInDb.length).toBe(2);
      expect(itemsInDb.some(i => i.item === 'Milk')).toBe(false);
    });

    it('returns structured validation error for invalid input', () => {
      const invalidResult = executeUpdateShoppingList({
        items: [],
        operation: 'invalid_op'
      });

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.message).toContain('Invalid shopping list input');
      expect(invalidResult.data).toBeNull();
    });
  });

  describe('3. create_departure_checklist', () => {
    it('creates and persists departure checklist with default household safety items', () => {
      const result = executeCreateDepartureChecklist({
        departureDate: '2026-10-23',
        returnDate: '2026-10-26',
        notes: 'Three-day trip',
        customItems: ['Put key under mat for cat sitter']
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.departureDate).toBe('2026-10-23');
      expect(result.data?.returnDate).toBe('2026-10-26');
      expect(result.data?.items.length).toBeGreaterThanOrEqual(7);

      // Verify specific safety items required by demo
      const items = result.data?.items || [];
      expect(items.some(i => i.title.toLowerCase().includes('doors'))).toBe(true);
      expect(items.some(i => i.title.toLowerCase().includes('plants'))).toBe(true);
      expect(items.some(i => i.title.toLowerCase().includes('appliances'))).toBe(true);
      expect(items.some(i => i.title.toLowerCase().includes('trash'))).toBe(true);
      expect(items.some(i => i.title.toLowerCase().includes('thermostat'))).toBe(true);
      expect(items.some(i => i.title.toLowerCase().includes('cat sitter'))).toBe(true);

      // Verify SQLite persistence
      const latest = getLatestDepartureChecklist();
      expect(latest).toBeDefined();
      expect(latest?.id).toBe(result.data?.id);
      expect(latest?.items.length).toBe(result.data?.items.length);
    });

    it('returns structured validation error if required dates are missing', () => {
      const invalidResult = executeCreateDepartureChecklist({
        notes: 'Missing departureDate and returnDate'
      });

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.message).toContain('Invalid departure checklist input');
      expect(invalidResult.data).toBeNull();
    });
  });

  describe('4. get_pending_actions', () => {
    it('aggregates incomplete tasks, pending reminders, and low-stock items', () => {
      // 1. Create a reminder
      executeCreateReminder({
        title: 'Water the plants',
        assignee: 'Sam',
        dueDate: 'Tomorrow'
      });

      // 2. Create a checklist
      executeCreateDepartureChecklist({
        departureDate: '2026-10-23',
        returnDate: '2026-10-26'
      });

      // 3. Query pending actions
      const result = executeGetPendingActions({ filter: 'all' });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.pendingRemindersCount).toBe(1);
      expect(result.data?.incompleteChecklistCount).toBeGreaterThanOrEqual(7);
      expect(result.data?.lowStockGroceriesCount).toBeGreaterThanOrEqual(2); // Milk & eggs from simulated telemetry
      expect(result.data?.urgentAlertsCount).toBeGreaterThanOrEqual(1);
      expect(result.data?.pendingReminders[0].assignee).toBe('Sam');
    });

    it('respects filter options', () => {
      executeCreateReminder({
        title: 'Check mail',
        assignee: 'Alex',
        dueDate: 'Friday'
      });

      const remindersOnly = executeGetPendingActions({ filter: 'reminders_only' });
      expect(remindersOnly.success).toBe(true);
      expect(remindersOnly.data?.pendingRemindersCount).toBe(1);
      expect(remindersOnly.data?.incompleteChecklistCount).toBe(0);

      const checklistOnly = executeGetPendingActions({ filter: 'checklist_only' });
      expect(checklistOnly.success).toBe(true);
      expect(checklistOnly.data?.pendingRemindersCount).toBe(0);
    });

    it('returns structured validation error for invalid filter', () => {
      const invalidResult = executeGetPendingActions({
        filter: 'non_existent_filter'
      });

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.message).toContain('Invalid get_pending_actions input');
      expect(invalidResult.data).toBeNull();
    });
  });

  describe('5. Database Restart Persistence', () => {
    it('preserves data across simulated server restart / connection reset', () => {
      // Step 1: Write data
      executeCreateReminder({
        title: 'Persistent reminder test',
        assignee: 'Sam',
        dueDate: 'Tomorrow'
      });
      executeUpdateShoppingList({
        items: ['Oat Milk'],
        operation: 'add'
      });
      executeCreateDepartureChecklist({
        departureDate: '2026-11-01',
        returnDate: '2026-11-05'
      });

      // Step 2: Simulate server shutdown & restart by resetting db connection
      resetDatabaseInstance();

      // Step 3: Re-query database after restart
      const reminders = getAllReminders();
      const shopping = getAllShoppingItems();
      const checklist = getLatestDepartureChecklist();

      expect(reminders.some(r => r.title === 'Persistent reminder test')).toBe(true);
      expect(shopping.some(s => s.item === 'Oat Milk')).toBe(true);
      expect(checklist?.departureDate).toBe('2026-11-01');
    });
  });
});
