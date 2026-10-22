import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Reminder, ShoppingListItem, DepartureChecklist, ChecklistItem } from '@homepilot/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance: DatabaseSync | null = null;

export function getDatabase(customPath?: string): DatabaseSync {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const dbPath = customPath || process.env.DATABASE_PATH || path.resolve(__dirname, '../../data/homepilot.db');

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');

  // Initialize Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      assignee TEXT NOT NULL,
      dueDate TEXT NOT NULL,
      notes TEXT,
      isSensitive INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shopping_items (
      id TEXT PRIMARY KEY,
      item TEXT NOT NULL COLLATE NOCASE UNIQUE,
      operation TEXT NOT NULL,
      category TEXT,
      addedAt TEXT NOT NULL,
      purchased INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS departure_checklists (
      id TEXT PRIMARY KEY,
      departureDate TEXT NOT NULL,
      returnDate TEXT NOT NULL,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS checklist_items (
      id TEXT PRIMARY KEY,
      checklistId TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (checklistId) REFERENCES departure_checklists(id) ON DELETE CASCADE
    );
  `);

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

// Reset/close instance for tests
export function resetDatabaseInstance() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
    dbInstance = null;
  }
}

// Data Access Layer: Reminders
export function insertReminder(reminder: Omit<Reminder, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Reminder {
  const db = getDatabase();
  const id = reminder.id || `rem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdAt = reminder.createdAt || new Date().toISOString();
  const isSensitive = reminder.isSensitive ? 1 : 0;
  const status = reminder.status || 'pending';

  db.prepare(`
    INSERT INTO reminders (id, title, assignee, dueDate, notes, isSensitive, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, reminder.title, reminder.assignee, reminder.dueDate, reminder.notes || null, isSensitive, status, createdAt);

  return {
    id,
    title: reminder.title,
    assignee: reminder.assignee,
    dueDate: reminder.dueDate,
    notes: reminder.notes,
    isSensitive: reminder.isSensitive ?? true,
    status,
    createdAt
  };
}

export function findReminderByDetails(title: string, assignee: string, dueDate: string): Reminder | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT * FROM reminders 
    WHERE LOWER(title) = LOWER(?) AND LOWER(assignee) = LOWER(?) AND dueDate = ? AND status != 'cancelled'
    LIMIT 1
  `).get(title, assignee, dueDate) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: String(row.id),
    title: String(row.title),
    assignee: String(row.assignee),
    dueDate: String(row.dueDate),
    notes: row.notes ? String(row.notes) : undefined,
    isSensitive: Boolean(row.isSensitive),
    status: row.status as Reminder['status'],
    createdAt: String(row.createdAt)
  };
}

export function getAllReminders(): Reminder[] {
  const db = getDatabase();
  const rows = db.prepare(`SELECT * FROM reminders ORDER BY createdAt DESC`).all() as Record<string, unknown>[];
  return rows.map(row => ({
    id: String(row.id),
    title: String(row.title),
    assignee: String(row.assignee),
    dueDate: String(row.dueDate),
    notes: row.notes ? String(row.notes) : undefined,
    isSensitive: Boolean(row.isSensitive),
    status: row.status as Reminder['status'],
    createdAt: String(row.createdAt)
  }));
}

// Data Access Layer: Shopping List
export function addOrUpdateShoppingItems(items: string[], category?: string): { added: ShoppingListItem[]; existing: ShoppingListItem[] } {
  const db = getDatabase();
  const now = new Date().toISOString();
  const added: ShoppingListItem[] = [];
  const existing: ShoppingListItem[] = [];

  for (const rawItem of items) {
    const item = rawItem.trim();
    if (!item) continue;

    const existingRow = db.prepare(`SELECT * FROM shopping_items WHERE item = ?`).get(item) as Record<string, unknown> | undefined;

    if (existingRow) {
      existing.push({
        id: String(existingRow.id),
        item: String(existingRow.item),
        operation: 'add',
        category: existingRow.category ? String(existingRow.category) : undefined,
        addedAt: String(existingRow.addedAt),
        purchased: Boolean(existingRow.purchased)
      });
    } else {
      const id = `shop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      db.prepare(`
        INSERT INTO shopping_items (id, item, operation, category, addedAt, purchased)
        VALUES (?, ?, 'add', ?, ?, 0)
      `).run(id, item, category || null, now);

      added.push({
        id,
        item,
        operation: 'add',
        category,
        addedAt: now,
        purchased: false
      });
    }
  }

  return { added, existing };
}

export function removeShoppingItems(items: string[]): { removed: string[]; notFound: string[] } {
  const db = getDatabase();
  const removed: string[] = [];
  const notFound: string[] = [];

  for (const rawItem of items) {
    const item = rawItem.trim();
    if (!item) continue;

    const existingRow = db.prepare(`SELECT * FROM shopping_items WHERE item = ?`).get(item) as Record<string, unknown> | undefined;

    if (existingRow) {
      db.prepare(`DELETE FROM shopping_items WHERE item = ?`).run(item);
      removed.push(item);
    } else {
      notFound.push(item);
    }
  }

  return { removed, notFound };
}

export function getAllShoppingItems(): ShoppingListItem[] {
  const db = getDatabase();
  const rows = db.prepare(`SELECT * FROM shopping_items ORDER BY addedAt DESC`).all() as Record<string, unknown>[];
  return rows.map(row => ({
    id: String(row.id),
    item: String(row.item),
    operation: 'add',
    category: row.category ? String(row.category) : undefined,
    addedAt: String(row.addedAt),
    purchased: Boolean(row.purchased)
  }));
}

// Data Access Layer: Departure Checklist
export function insertDepartureChecklist(
  departureDate: string,
  returnDate: string,
  notes?: string,
  customItems?: string[]
): DepartureChecklist {
  const db = getDatabase();
  const now = new Date().toISOString();
  const checklistId = `chk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  db.prepare(`
    INSERT INTO departure_checklists (id, departureDate, returnDate, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(checklistId, departureDate, returnDate, notes || null, now, now);

  const defaultTasks: Array<{ title: string; category: ChecklistItem['category']; notes?: string }> = [
    { title: 'Lock all exterior doors and check deadbolts', category: 'security' },
    { title: 'Verify all windows and patio doors are closed and latched', category: 'security' },
    { title: 'Water Living Room Fiddle Leaf Fig and indoor plants', category: 'plants', notes: 'Soil is currently dry' },
    { title: 'Unplug non-essential appliances & entertainment electronics', category: 'appliances' },
    { title: 'Set thermostat to Away/Eco Mode (72°F)', category: 'hvac' },
    { title: 'Empty kitchen compost bin, indoor trash cans, and take out bins', category: 'trash' },
    { title: 'Confirm stove, oven, toaster, and heaters are completely turned off', category: 'appliances' }
  ];

  const items: ChecklistItem[] = [];

  for (const task of defaultTasks) {
    const itemId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    db.prepare(`
      INSERT INTO checklist_items (id, checklistId, title, category, completed, notes)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(itemId, checklistId, task.title, task.category, task.notes || null);

    items.push({
      id: itemId,
      title: task.title,
      category: task.category,
      completed: false,
      notes: task.notes
    });
  }

  if (customItems && customItems.length > 0) {
    for (const custom of customItems) {
      if (!custom.trim()) continue;
      const itemId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      db.prepare(`
        INSERT INTO checklist_items (id, checklistId, title, category, completed, notes)
        VALUES (?, ?, ?, 'security', 0, NULL)
      `).run(itemId, checklistId, custom.trim());

      items.push({
        id: itemId,
        title: custom.trim(),
        category: 'security',
        completed: false
      });
    }
  }

  return {
    id: checklistId,
    departureDate,
    returnDate,
    notes,
    items,
    createdAt: now,
    updatedAt: now
  };
}

export function getLatestDepartureChecklist(): DepartureChecklist | null {
  const db = getDatabase();
  const row = db.prepare(`SELECT * FROM departure_checklists ORDER BY createdAt DESC LIMIT 1`).get() as Record<string, unknown> | undefined;

  if (!row) return null;

  const checklistId = String(row.id);
  const itemRows = db.prepare(`SELECT * FROM checklist_items WHERE checklistId = ? ORDER BY rowid ASC`).all(checklistId) as Record<string, unknown>[];

  const items: ChecklistItem[] = itemRows.map(r => ({
    id: String(r.id),
    title: String(r.title),
    category: r.category as ChecklistItem['category'],
    completed: Boolean(r.completed),
    notes: r.notes ? String(r.notes) : undefined
  }));

  return {
    id: checklistId,
    departureDate: String(row.departureDate),
    returnDate: String(row.returnDate),
    notes: row.notes ? String(row.notes) : undefined,
    items,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt)
  };
}

export function getAllChecklistItems(completedFilter?: boolean): ChecklistItem[] {
  const db = getDatabase();
  let query = `SELECT * FROM checklist_items`;
  const params: (number | string | null)[] = [];
  if (completedFilter !== undefined) {
    query += ` WHERE completed = ?`;
    params.push(completedFilter ? 1 : 0);
  }
  query += ` ORDER BY rowid ASC`;
  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map(r => ({
    id: String(r.id),
    title: String(r.title),
    category: r.category as ChecklistItem['category'],
    completed: Boolean(r.completed),
    notes: r.notes ? String(r.notes) : undefined
  }));
}
