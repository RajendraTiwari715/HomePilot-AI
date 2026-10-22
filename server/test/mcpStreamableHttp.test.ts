import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

describe('MCP Streamable HTTP Integration', () => {
  it('connects via Streamable HTTP (SSE), lists tools, and invokes get_household_status', async () => {
    const transport = new SSEClientTransport(new URL('http://localhost:3001/sse'));
    const client = new Client(
      { name: 'integration-test-client', version: '1.0.0' },
      { capabilities: {} }
    );

    await client.connect(transport);

    // 1. Tool discovery
    const toolList = await client.listTools();
    expect(toolList.tools).toBeDefined();
    expect(toolList.tools.some(t => t.name === 'get_household_status')).toBe(true);

    // 2. Tool invocation over Streamable HTTP
    const response = await client.callTool({
      name: 'get_household_status',
      arguments: { includeSimulatedDetails: true }
    });

    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);

    const firstBlock = response.content[0];
    expect(firstBlock.type).toBe('text');
    if (firstBlock.type === 'text') {
      const parsed = JSON.parse(firstBlock.text);
      expect(parsed.success).toBe(true);
      expect(parsed.isSimulated).toBe(true);
      expect(parsed.data.plants.length).toBeGreaterThan(0);
      expect(parsed.data.groceries.length).toBeGreaterThan(0);
    }

    await client.close();
  });
});
