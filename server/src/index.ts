import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createHomePilotMcpServer } from './mcp.js';
import { executeGetHouseholdStatus } from './tools/getHouseholdStatus.js';
import { executeCreateReminder } from './tools/createReminder.js';
import { executeUpdateShoppingList } from './tools/updateShoppingList.js';
import { executeCreateDepartureChecklist } from './tools/createDepartureChecklist.js';
import { executeGetPendingActions } from './tools/getPendingActions.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Enable CORS for frontend and external MCP clients
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));

app.use(express.json());

// Track active Streamable HTTP / SSE sessions
interface McpSession {
  sessionId: string;
  transport: SSEServerTransport;
  server: ReturnType<typeof createHomePilotMcpServer>;
  connectedAt: string;
}

const activeSessions = new Map<string, McpSession>();

const TOOL_REGISTRY = [
  {
    name: 'get_household_status',
    description: 'Returns simulated household status: plants, groceries, pending tasks, alerts, and last-updated timestamps.'
  },
  {
    name: 'create_reminder',
    description: 'Inputs: title, assignee, dueDate, notes, isSensitive. Persists a reminder in SQLite.'
  },
  {
    name: 'update_shopping_list',
    description: 'Inputs: items array, operation: add or remove, category. Persists changes in SQLite.'
  },
  {
    name: 'create_departure_checklist',
    description: 'Inputs: departureDate, returnDate, optional notes. Creates & persists checklist in SQLite.'
  },
  {
    name: 'get_pending_actions',
    description: 'Returns incomplete checklist items, reminders, and low-stock grocery alerts.'
  }
];

// Health & Metadata check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'HomePilot AI MCP Server',
    version: '1.0.0',
    protocol: 'Model Context Protocol (Streamable HTTP)',
    transport: 'Streamable HTTP / SSE',
    activeSessions: activeSessions.size,
    timestamp: new Date().toISOString(),
    endpoints: {
      sse: '/sse',
      messages: '/messages',
      health: '/health',
      tools: '/api/tools'
    },
    tools: TOOL_REGISTRY
  });
});

/**
 * MCP Streamable HTTP Transport: SSE Endpoint
 * Initiates an SSE connection for standard MCP clients (Alexa+, Antigravity, Inspector)
 */
app.get('/sse', async (_req: Request, res: Response) => {
  console.log('[MCP Streamable HTTP] New SSE connection incoming...');

  const server = createHomePilotMcpServer();
  const transport = new SSEServerTransport('/messages', res);
  const sessionId = transport.sessionId;

  activeSessions.set(sessionId, {
    sessionId,
    transport,
    server,
    connectedAt: new Date().toISOString()
  });

  transport.onclose = () => {
    console.log(`[MCP Streamable HTTP] SSE connection closed for session: ${sessionId}`);
    activeSessions.delete(sessionId);
  };

  try {
    await server.connect(transport);
    console.log(`[MCP Streamable HTTP] SSE transport connected successfully. Session ID: ${sessionId}`);
  } catch (err) {
    console.error(`[MCP Streamable HTTP] Error connecting transport for session ${sessionId}:`, err);
    activeSessions.delete(sessionId);
    if (!res.headersSent) {
      res.status(500).send('Failed to initialize MCP SSE connection');
    }
  }
});

/**
 * MCP Streamable HTTP Transport: Message Handler
 * Receives JSON-RPC messages from MCP client for an established SSE session
 */
app.post('/messages', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Missing sessionId query parameter' },
      id: null
    });
    return;
  }

  const session = activeSessions.get(sessionId);
  if (!session) {
    res.status(404).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: `Active MCP session not found for sessionId: ${sessionId}` },
      id: null
    });
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res, req.body);
  } catch (err) {
    console.error(`[MCP Streamable HTTP] Error handling message for session ${sessionId}:`, err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal error handling MCP message' },
        id: null
      });
    }
  }
});

/**
 * Direct REST endpoints for tool discovery and execution.
 */
app.get('/api/tools', (_req: Request, res: Response) => {
  res.json({ tools: TOOL_REGISTRY });
});

// Generic tool executor endpoint
app.post('/api/tools/:toolName', (req: Request, res: Response) => {
  const { toolName } = req.params;
  const input = req.body || {};

  try {
    let result;
    switch (toolName) {
      case 'get_household_status':
        result = executeGetHouseholdStatus();
        break;
      case 'create_reminder':
        result = executeCreateReminder(input);
        break;
      case 'update_shopping_list':
        result = executeUpdateShoppingList(input);
        break;
      case 'create_departure_checklist':
        result = executeCreateDepartureChecklist(input);
        break;
      case 'get_pending_actions':
        result = executeGetPendingActions(input);
        break;
      default:
        res.status(404).json({
          success: false,
          message: `Unknown tool: ${toolName}`,
          data: null,
          timestamp: new Date().toISOString(),
          actionId: `err_notfound_${Date.now()}`
        });
        return;
    }

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      success: false,
      message: `Error executing ${toolName}: ${message}`,
      data: null,
      timestamp: new Date().toISOString(),
      actionId: `err_${Date.now()}`
    });
  }
});

// Start Express server
const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  🏠 HomePilot AI MCP Server (Alexa+ Edition)`);
  console.log(`  Running on: http://localhost:${PORT}`);
  console.log(`  Streamable HTTP SSE: http://localhost:${PORT}/sse`);
  console.log(`  Streamable HTTP Msg: http://localhost:${PORT}/messages`);
  console.log(`  Health & Status:     http://localhost:${PORT}/health`);
  console.log(`  Direct Tools API:    http://localhost:${PORT}/api/tools`);
  console.log(`  Registered Tools:    5 tools available`);
  console.log(`=======================================================`);
});

// Handle graceful termination
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received. Closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});
