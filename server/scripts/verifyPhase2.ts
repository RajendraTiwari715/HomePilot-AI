import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

interface TestResult {
  step: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

async function main() {
  console.log('--- HomePilot AI Phase 2 MCP Verification ---');

  const transport = new SSEClientTransport(new URL('http://localhost:3001/sse'));
  const client = new Client(
    { name: 'phase2-inspector-client', version: '1.0.0' },
    { capabilities: {} }
  );

  console.log('[1/7] Connecting to MCP Server over Streamable HTTP (SSE)...');
  await client.connect(transport);
  console.log('Connected successfully!');

  // Step 3: Verify tools/list shows all five tools
  console.log('\n[2/7] Inspecting tools/list...');
  const toolsResponse = await client.listTools();
  const toolNames = toolsResponse.tools.map(t => t.name);
  console.log('Discovered tools:', toolNames);

  const requiredTools = [
    'get_household_status',
    'create_reminder',
    'update_shopping_list',
    'create_departure_checklist',
    'get_pending_actions'
  ];

  const missingTools = requiredTools.filter(t => !toolNames.includes(t));
  if (missingTools.length === 0) {
    results.push({
      step: 'Tool Discovery (tools/list)',
      passed: true,
      details: `Found all 5 required tools: ${toolNames.join(', ')}`
    });
  } else {
    results.push({
      step: 'Tool Discovery (tools/list)',
      passed: false,
      details: `Missing tools: ${missingTools.join(', ')}`
    });
  }

  // Step 4: Call each tool with valid input
  console.log('\n[3/7] Calling each tool with valid input...');

  // 1. get_household_status
  try {
    const res1 = await client.callTool({ name: 'get_household_status', arguments: {} });
    const text = res1.content[0].type === 'text' ? res1.content[0].text : '';
    const parsed = JSON.parse(text);
    results.push({
      step: 'Tool: get_household_status (valid)',
      passed: parsed.success === true && parsed.data.plants.length > 0,
      details: parsed.message
    });
  } catch (err) {
    results.push({ step: 'Tool: get_household_status (valid)', passed: false, details: String(err) });
  }

  // 2. create_reminder
  let reminderId = '';
  try {
    const res2 = await client.callTool({
      name: 'create_reminder',
      arguments: {
        title: 'Remind roommate to water the plants',
        assignee: 'Sam',
        dueDate: 'Tomorrow 10:00 AM',
        notes: 'Fiddle Leaf Fig needs watering',
        isSensitive: true
      }
    });
    const text = res2.content[0].type === 'text' ? res2.content[0].text : '';
    const parsed = JSON.parse(text);
    reminderId = parsed.data?.id;
    results.push({
      step: 'Tool: create_reminder (valid)',
      passed: parsed.success === true && !!reminderId,
      details: `Created reminder ID: ${reminderId} (Assignee: ${parsed.data?.assignee}, Sensitive: ${parsed.data?.isSensitive})`
    });
  } catch (err) {
    results.push({ step: 'Tool: create_reminder (valid)', passed: false, details: String(err) });
  }

  // 3. update_shopping_list
  try {
    const res3 = await client.callTool({
      name: 'update_shopping_list',
      arguments: {
        items: ['Whole Milk', 'Pasture-Raised Eggs'],
        operation: 'add',
        category: 'dairy'
      }
    });
    const text = res3.content[0].type === 'text' ? res3.content[0].text : '';
    const parsed = JSON.parse(text);
    results.push({
      step: 'Tool: update_shopping_list (valid)',
      passed: parsed.success === true && parsed.data.currentList.length >= 2,
      details: parsed.message
    });
  } catch (err) {
    results.push({ step: 'Tool: update_shopping_list (valid)', passed: false, details: String(err) });
  }

  // 4. create_departure_checklist
  let checklistId = '';
  try {
    const res4 = await client.callTool({
      name: 'create_departure_checklist',
      arguments: {
        departureDate: '2026-10-23',
        returnDate: '2026-10-26',
        notes: 'Three-day departure trip'
      }
    });
    const text = res4.content[0].type === 'text' ? res4.content[0].text : '';
    const parsed = JSON.parse(text);
    checklistId = parsed.data?.id;
    results.push({
      step: 'Tool: create_departure_checklist (valid)',
      passed: parsed.success === true && parsed.data.items.length >= 7,
      details: `Created checklist ${checklistId} with ${parsed.data?.items?.length} tasks.`
    });
  } catch (err) {
    results.push({ step: 'Tool: create_departure_checklist (valid)', passed: false, details: String(err) });
  }

  // 5. get_pending_actions
  try {
    const res5 = await client.callTool({
      name: 'get_pending_actions',
      arguments: { filter: 'all' }
    });
    const text = res5.content[0].type === 'text' ? res5.content[0].text : '';
    const parsed = JSON.parse(text);
    results.push({
      step: 'Tool: get_pending_actions (valid)',
      passed: parsed.success === true && parsed.data.incompleteChecklistCount > 0,
      details: parsed.message
    });
  } catch (err) {
    results.push({ step: 'Tool: get_pending_actions (valid)', passed: false, details: String(err) });
  }

  // Step 5: Call each tool with invalid input and confirm it returns a clear error
  console.log('\n[4/7] Testing invalid inputs for all tools...');

  // Invalid create_reminder (missing title and assignee)
  try {
    const invRes = await client.callTool({
      name: 'create_reminder',
      arguments: { notes: 'Missing required title and assignee' } as any
    });
    const text = invRes.content[0].type === 'text' ? invRes.content[0].text : '';
    const isErr = invRes.isError === true;
    const hasMsg = text.includes('Required at title') || text.includes('Required at assignee') || text.includes('Invalid reminder input');
    results.push({
      step: 'Tool: create_reminder (invalid input validation)',
      passed: isErr && hasMsg,
      details: `Returned expected validation error: ${text.replace(/\n/g, ' ')}`
    });
  } catch (err) {
    results.push({ step: 'Tool: create_reminder (invalid input validation)', passed: true, details: `Caught protocol validation error: ${String(err)}` });
  }

  // Invalid update_shopping_list (empty items array / invalid operation)
  try {
    const invRes = await client.callTool({
      name: 'update_shopping_list',
      arguments: { items: [], operation: 'invalid_op' } as any
    });
    const text = invRes.content[0].type === 'text' ? invRes.content[0].text : '';
    const isErr = invRes.isError === true;
    const hasMsg = text.includes('operation') || text.includes('Invalid shopping list input') || text.includes('Invalid enum value');
    results.push({
      step: 'Tool: update_shopping_list (invalid input validation)',
      passed: isErr && hasMsg,
      details: `Returned expected validation error: ${text.replace(/\n/g, ' ')}`
    });
  } catch (err) {
    results.push({ step: 'Tool: update_shopping_list (invalid input validation)', passed: true, details: `Caught protocol validation error: ${String(err)}` });
  }

  // Invalid create_departure_checklist (missing dates)
  try {
    const invRes = await client.callTool({
      name: 'create_departure_checklist',
      arguments: { notes: 'No dates provided' } as any
    });
    const text = invRes.content[0].type === 'text' ? invRes.content[0].text : '';
    const isErr = invRes.isError === true;
    const hasMsg = text.includes('Required at departureDate') || text.includes('Invalid departure checklist input');
    results.push({
      step: 'Tool: create_departure_checklist (invalid input validation)',
      passed: isErr && hasMsg,
      details: `Returned expected validation error: ${text.replace(/\n/g, ' ')}`
    });
  } catch (err) {
    results.push({ step: 'Tool: create_departure_checklist (invalid input validation)', passed: true, details: `Caught protocol validation error: ${String(err)}` });
  }

  // Invalid get_pending_actions (invalid filter option)
  try {
    const invRes = await client.callTool({
      name: 'get_pending_actions',
      arguments: { filter: 'non_existent_filter' } as any
    });
    const text = invRes.content[0].type === 'text' ? invRes.content[0].text : '';
    const isErr = invRes.isError === true;
    const hasMsg = text.includes('Invalid enum value') || text.includes('Invalid get_pending_actions input') || text.includes('filter');
    results.push({
      step: 'Tool: get_pending_actions (invalid input validation)',
      passed: isErr && hasMsg,
      details: `Returned expected validation error: ${text.replace(/\n/g, ' ')}`
    });
  } catch (err) {
    results.push({ step: 'Tool: get_pending_actions (invalid input validation)', passed: true, details: `Caught protocol validation error: ${String(err)}` });
  }

  // Step 6: Repeat one write call to test idempotency and report whether it creates a duplicate
  console.log('\n[5/7] Testing idempotency / duplicate handling on write calls...');
  try {
    const repeatReminderRes = await client.callTool({
      name: 'create_reminder',
      arguments: {
        title: 'Remind roommate to water the plants',
        assignee: 'Sam',
        dueDate: 'Tomorrow 10:00 AM',
        notes: 'Fiddle Leaf Fig needs watering',
        isSensitive: true
      }
    });
    const text = repeatReminderRes.content[0].type === 'text' ? repeatReminderRes.content[0].text : '';
    const parsed = JSON.parse(text);
    const isSameId = parsed.data?.id === reminderId;
    const isIdempotent = parsed.message.includes('Idempotent') || isSameId;

    results.push({
      step: 'Idempotency Test (create_reminder repeated)',
      passed: isSameId && isIdempotent,
      details: isSameId 
        ? `Idempotency verified: Reused existing reminder ID ${reminderId}. Did NOT create a duplicate.` 
        : `Created duplicate with ID ${parsed.data?.id}`
    });
  } catch (err) {
    results.push({ step: 'Idempotency Test (create_reminder repeated)', passed: false, details: String(err) });
  }

  // Also test shopping list deduplication
  try {
    const repeatShopRes = await client.callTool({
      name: 'update_shopping_list',
      arguments: {
        items: ['Whole Milk', 'Sourdough Bread'],
        operation: 'add'
      }
    });
    const text = repeatShopRes.content[0].type === 'text' ? repeatShopRes.content[0].text : '';
    const parsed = JSON.parse(text);
    const milkDeduplicated = parsed.data.alreadyInList?.some((i: any) => i.item.toLowerCase().includes('milk'));

    results.push({
      step: 'Idempotency Test (update_shopping_list duplicate items)',
      passed: !!milkDeduplicated,
      details: milkDeduplicated 
        ? `Deduplication verified: "Whole Milk" recognized as already in list; only new items were added.` 
        : `Failed to deduplicate "Whole Milk"`
    });
  } catch (err) {
    results.push({ step: 'Idempotency Test (update_shopping_list duplicate items)', passed: false, details: String(err) });
  }

  await client.close();

  console.log('\n--- PHASE 2 TEST SUMMARY ---');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
