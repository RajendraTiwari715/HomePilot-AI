import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { executeGetHouseholdStatus } from './tools/getHouseholdStatus.js';
import { executeCreateReminder } from './tools/createReminder.js';
import { executeUpdateShoppingList } from './tools/updateShoppingList.js';
import { executeCreateDepartureChecklist } from './tools/createDepartureChecklist.js';
import { executeGetPendingActions } from './tools/getPendingActions.js';

/**
 * Creates and configures a new instance of the HomePilot MCP Server.
 * Registers all five required tools for the Alexa+ hackathon demonstration.
 */
export function createHomePilotMcpServer() {
  const server = new McpServer({
    name: 'homepilot-ai-mcp-server',
    version: '1.0.0'
  });

  // Tool 1: get_household_status
  server.tool(
    'get_household_status',
    'Returns simulated household status: plants, groceries, pending tasks, alerts, and last-updated timestamps.',
    {
      includeSimulatedDetails: z.boolean().optional().default(true).describe('Whether to include simulated telemetry and sensor data')
    },
    async (args) => {
      try {
        const result = executeGetHouseholdStatus();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success
        };
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: `Failed to retrieve household status: ${errMessage}`,
                data: null,
                timestamp: new Date().toISOString(),
                actionId: `err_status_${Date.now()}`,
                isSimulated: true
              }, null, 2)
            }
          ]
        };
      }
    }
  );

  // Tool 2: create_reminder
  server.tool(
    'create_reminder',
    'Creates and persists a reminder in SQLite (sensitive action requiring user confirmation)',
    {
      title: z.string().describe('Title of the reminder (e.g., "Water the living room plants")'),
      assignee: z.string().describe('Person assigned to this reminder (e.g., "roommate", "Alex")'),
      dueDate: z.string().describe('Due date or time (e.g., "Tomorrow 10:00 AM", "2026-10-23")'),
      notes: z.string().optional().describe('Optional context or specific instructions'),
      isSensitive: z.boolean().optional().default(true).describe('Flag indicating this notification needs user confirmation'),
      allowDuplicate: z.boolean().optional().default(false).describe('Whether to force creating a duplicate reminder if an identical one exists')
    },
    async (args) => {
      const result = executeCreateReminder(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: !result.success
      };
    }
  );

  // Tool 3: update_shopping_list
  server.tool(
    'update_shopping_list',
    'Adds or removes items from the household shopping list and persists them in SQLite',
    {
      items: z.array(z.string()).describe('List of grocery or household item names to add or remove'),
      operation: z.enum(['add', 'remove']).describe('Operation to perform: "add" or "remove"'),
      category: z.string().optional().describe('Optional category such as "dairy", "produce", "pantry"')
    },
    async (args) => {
      const result = executeUpdateShoppingList(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: !result.success
      };
    }
  );

  // Tool 4: create_departure_checklist
  server.tool(
    'create_departure_checklist',
    'Creates and persists a trip departure checklist in SQLite (locks, appliances, plants, thermostat, trash)',
    {
      departureDate: z.string().describe('Date when leaving home (e.g., "Tomorrow", "2026-10-23")'),
      returnDate: z.string().describe('Date when returning home (e.g., "In three days", "2026-10-26")'),
      notes: z.string().optional().describe('Optional trip considerations or notes'),
      customItems: z.array(z.string()).optional().describe('Optional custom checklist items')
    },
    async (args) => {
      const result = executeCreateDepartureChecklist(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: !result.success
      };
    }
  );

  // Tool 5: get_pending_actions
  server.tool(
    'get_pending_actions',
    'Returns incomplete checklist items, reminders, and low-stock grocery alerts that require attention',
    {
      filter: z.enum(['all', 'urgent', 'checklist_only', 'reminders_only']).optional().default('all').describe('Filter criteria for pending items')
    },
    async (args) => {
      const result = executeGetPendingActions(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: !result.success
      };
    }
  );

  return server;
}
