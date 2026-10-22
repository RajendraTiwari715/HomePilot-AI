import { BaseToolResult, ShoppingListItem, UpdateShoppingListInputSchema } from '@homepilot/shared';
import { addOrUpdateShoppingItems, removeShoppingItems, getAllShoppingItems } from '../db/database.js';

export interface UpdateShoppingListResultData {
  operation: 'add' | 'remove';
  currentList: ShoppingListItem[];
  added?: ShoppingListItem[];
  alreadyInList?: ShoppingListItem[];
  removed?: string[];
  notFound?: string[];
}

/**
 * Tool: update_shopping_list
 * 
 * Adds or removes items from the household shopping list and persists them in SQLite.
 * Handles deduplication for 'add' operations.
 */
export function executeUpdateShoppingList(rawInput: unknown): BaseToolResult<UpdateShoppingListResultData | null> {
  const parsed = UpdateShoppingListInputSchema.safeParse(rawInput);
  const now = new Date().toISOString();

  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map(i => `${i.path.join('.') || 'input'}: ${i.message}`).join(', ');
    return {
      success: false,
      message: `Invalid shopping list input: ${errorDetails}`,
      data: null,
      timestamp: now,
      actionId: `err_shop_${Date.now()}`
    };
  }

  const { items, operation, category } = parsed.data;

  if (operation === 'add') {
    const { added, existing } = addOrUpdateShoppingItems(items, category);
    const currentList = getAllShoppingItems();

    let msg = `Shopping list updated: Added ${added.length} item(s) (${added.map(i => i.item).join(', ')}).`;
    if (existing.length > 0) {
      msg += ` ${existing.length} item(s) already in list (${existing.map(i => i.item).join(', ')}).`;
    }

    return {
      success: true,
      message: msg,
      data: {
        operation: 'add',
        currentList,
        added,
        alreadyInList: existing
      },
      timestamp: now,
      actionId: `act_shop_add_${Date.now()}`
    };
  } else {
    const { removed, notFound } = removeShoppingItems(items);
    const currentList = getAllShoppingItems();

    let msg = `Shopping list updated: Removed ${removed.length} item(s) (${removed.join(', ')}).`;
    if (notFound.length > 0) {
      msg += ` (${notFound.join(', ')} were not in the list).`;
    }

    return {
      success: true,
      message: msg,
      data: {
        operation: 'remove',
        currentList,
        removed,
        notFound
      },
      timestamp: now,
      actionId: `act_shop_rem_${Date.now()}`
    };
  }
}
