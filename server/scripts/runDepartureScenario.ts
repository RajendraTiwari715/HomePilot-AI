/**
 * HomePilot AI - Full Departure Scenario E2E Execution Script
 * Executes the core demo request through the REST API, triggers approval, and outputs the final plan.
 */
async function main() {
  const baseUrl = 'http://localhost:3001';
  const demoCommand = "I’m leaving home for three days. Prepare a departure checklist, remind my roommate to water the plants, add milk and eggs to my shopping list for when I return, and show me anything that still needs attention.";

  console.log('========================================================================');
  console.log('🚀 Running Core Demo Scenario via HomePilot AI Agent Orchestration API');
  console.log(`Command: "${demoCommand}"`);
  console.log('========================================================================\n');

  // Step 1: Create and start plan execution
  console.log('1️⃣ Sending request to POST /api/plan...');
  const createRes = await fetch(`${baseUrl}/api/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ request: demoCommand, autoExecute: true })
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`POST /api/plan failed (${createRes.status}): ${err}`);
  }

  const initialPlan = await createRes.json();
  console.log(`Plan Created: ${initialPlan.planId}`);
  console.log(`Current Status: ${initialPlan.status}`);
  console.log(`Requires Approval: ${initialPlan.requiresApproval}`);
  console.log(`Total Steps: ${initialPlan.steps.length}`);

  console.log('\n--- Initial Step States ---');
  for (const s of initialPlan.steps) {
    console.log(`- [${s.status.toUpperCase()}] ${s.stepId} (${s.toolName}) | Sensitive: ${s.sensitive}`);
  }

  // Step 2: Identify step awaiting approval
  const sensitiveStep = initialPlan.steps.find((s: any) => s.status === 'awaiting_approval');

  if (!sensitiveStep) {
    throw new Error('Expected a step awaiting approval, but none was found!');
  }

  console.log(`\n⏸️ Execution paused at approval gate: Step '${sensitiveStep.stepId}' (${sensitiveStep.toolName})`);
  console.log(`Prompt: Notification / message to "${sensitiveStep.arguments.assignee}" requires user confirmation.`);

  // Step 3: Approve sensitive action
  console.log(`\n2️⃣ Simulating user voice approval: POST /api/plan/${initialPlan.planId}/approve/${sensitiveStep.stepId}...`);
  const approveRes = await fetch(`${baseUrl}/api/plan/${initialPlan.planId}/approve/${sensitiveStep.stepId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approver: 'Alexa User (Voice Confirmed)' })
  });

  if (!approveRes.ok) {
    const err = await approveRes.text();
    throw new Error(`Approve step failed: ${err}`);
  }

  const approvedPlan = await approveRes.json();
  console.log(`Resumed execution completed. Plan Status: ${approvedPlan.status}`);

  // Step 4: Verify persistence via GET /api/plan/:planId
  console.log(`\n3️⃣ Verifying SQLite persistence via GET /api/plan/${initialPlan.planId}...`);
  const getRes = await fetch(`${baseUrl}/api/plan/${initialPlan.planId}`);
  const persistedPlan = await getRes.json();

  console.log(`Persistence check: verified plan ${persistedPlan.planId} in SQLite.`);
  console.log(`Final Status: ${persistedPlan.status}`);

  console.log('\n--- Final Step States ---');
  for (const s of persistedPlan.steps) {
    const resultSummary = s.result ? `-> Result: ${s.result.message.slice(0, 80)}...` : '';
    console.log(`✅ [${s.status.toUpperCase()}] ${s.toolName} ${resultSummary}`);
  }

  console.log('\n========================================================================');
  console.log('📋 FINAL COMPLETE PLAN JSON (PERSISTED IN SQLITE)');
  console.log('========================================================================');
  console.log(JSON.stringify(persistedPlan, null, 2));
}

main().catch(err => {
  console.error('Scenario execution failed:', err);
  process.exit(1);
});
