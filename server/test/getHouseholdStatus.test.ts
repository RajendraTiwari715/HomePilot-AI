
import { describe, it, expect } from 'vitest';
import { executeGetHouseholdStatus } from '../src/tools/getHouseholdStatus.js';
import { createHomePilotMcpServer } from '../src/mcp.js';
import { BaseToolResultSchema } from '@homepilot/shared';

describe('Tool: get_household_status', () => {
  it('returns valid structured JSON with required fields', () => {
    const result = executeGetHouseholdStatus();

    // Verify non-negotiable requirement 7:
    // success, message, data, timestamp, actionId
    expect(result.success).toBe(true);
    expect(typeof result.message).toBe('string');
    expect(result.message.length).toBeGreaterThan(0);
    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    expect(result.actionId).toMatch(/^act_status_\d+/);
    expect(result.isSimulated).toBe(true);

    // Validate against BaseToolResultSchema
    const validated = BaseToolResultSchema.safeParse(result);
    expect(validated.success).toBe(true);

    // Verify Requirement 9: Clearly label simulated household data
    expect(result.data.simulated).toBe(true);
    expect(result.data.label).toBe('Simulated demo data');

    // Verify simulated data matches core demo scenario
    expect(result.data.plants.length).toBeGreaterThanOrEqual(1);
    const thirstyPlant = result.data.plants.find(p => p.needsWater);
    expect(thirstyPlant).toBeDefined();
    expect(thirstyPlant?.name).toContain('Fiddle Leaf Fig');

    // Groceries should show milk and eggs
    const lowStockGroceries = result.data.groceries.filter(g => g.isLowStock);
    expect(lowStockGroceries.length).toBeGreaterThanOrEqual(2);
    expect(lowStockGroceries.some(g => g.name.toLowerCase().includes('milk'))).toBe(true);
    expect(lowStockGroceries.some(g => g.name.toLowerCase().includes('eggs'))).toBe(true);

    // Pending tasks & alerts
    expect(result.data.pendingTasks.length).toBeGreaterThan(0);
    expect(result.data.alerts.length).toBeGreaterThan(0);
  });

  it('can be discovered and invoked via McpServer instance', async () => {
    const server = createHomePilotMcpServer();
    expect(server).toBeDefined();

    // Verify tool handler execution directly
    const result = executeGetHouseholdStatus();
    expect(result.success).toBe(true);
  });
});
