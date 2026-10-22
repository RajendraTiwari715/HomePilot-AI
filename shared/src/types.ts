/**
 * HomePilot AI - Shared Types & Contracts
 */

export interface BaseToolResult<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string; // ISO 8601
  actionId: string;
  isSimulated?: boolean;
}

export interface PlantStatus {
  id: string;
  name: string;
  location: string;
  moistureLevel: 'low' | 'medium' | 'optimal';
  needsWater: boolean;
  lastWatered: string; // ISO date
  notes?: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  category: 'dairy' | 'produce' | 'pantry' | 'beverages' | 'other';
  quantity: number;
  unit: string;
  isLowStock: boolean;
  status: 'in_stock' | 'low' | 'out_of_stock';
  lastUpdated: string;
}

export interface HouseholdAlert {
  id: string;
  type: 'security' | 'maintenance' | 'weather' | 'energy';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface PendingTask {
  id: string;
  title: string;
  category: 'chores' | 'maintenance' | 'departure' | 'plants';
  priority: 'low' | 'medium' | 'high';
  due?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface HouseholdStatus {
  simulated: true;
  label: string; // "Simulated demo data"
  awayMode: boolean;
  plants: PlantStatus[];
  groceries: GroceryItem[];
  pendingTasks: PendingTask[];
  alerts: HouseholdAlert[];
  lastUpdated: string; // ISO string
}

export interface Reminder {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  notes?: string;
  isSensitive: boolean; // requires user confirmation
  status: 'pending' | 'sent' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface ShoppingListItem {
  id: string;
  item: string;
  operation: 'add' | 'remove';
  category?: string;
  addedAt: string;
  purchased?: boolean;
}

export interface ChecklistItem {
  id: string;
  title: string;
  category: 'security' | 'appliances' | 'plants' | 'trash' | 'hvac';
  completed: boolean;
  notes?: string;
}

export interface DepartureChecklist {
  id: string;
  departureDate: string;
  returnDate: string;
  notes?: string;
  items: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PendingActionsOverview {
  incompleteChecklistCount: number;
  pendingRemindersCount: number;
  lowStockGroceriesCount: number;
  urgentAlertsCount: number;
  incompleteChecklist: ChecklistItem[];
  pendingReminders: Reminder[];
  lowStockGroceries: GroceryItem[];
  activeAlerts: HouseholdAlert[];
}

// Agent Plan Contracts
export type PlanStepStatus = 
  | 'planned' 
  | 'awaiting_approval' 
  | 'running' 
  | 'succeeded' 
  | 'failed' 
  | 'cancelled';

export interface PlanStep {
  id: string;
  order: number;
  toolName: string;
  arguments: Record<string, unknown>;
  description: string;
  isSensitive: boolean;
  status: PlanStepStatus;
  result?: BaseToolResult;
  error?: string;
}

export interface ActionPlan {
  id: string;
  userPrompt: string;
  steps: PlanStep[];
  createdAt: string;
  status: 'planned' | 'in_progress' | 'completed' | 'paused_for_approval' | 'failed' | 'cancelled';
}
