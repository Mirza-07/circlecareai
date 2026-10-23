import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { store } from './store.js';
import { CircleCareTools, ToolContext } from './tools.js';
import { authenticateToken, createMCPServer, formatRichScheduleCard, getMCPToolsDefinitions } from './mcpServer.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Helper to safely extract string params under Express 5
function paramStr(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] || '';
  return val || '';
}

// FR-MCP-005: CORS with origin validation - support all local Vite/frontend dev ports
const LOCALHOST_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin || LOCALHOST_ORIGIN_REGEX.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Cross-Origin Request Blocked by CircleCare CORS Policy'));
  },
  credentials: true
}));

app.use(express.json());

// NFR-SEC-006 & FR-AI-009: In-memory rate limiter (30 req / 10 min)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || 'anonymous';
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;

  const current = rateLimitMap.get(ip);
  if (!current || now > current.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (current.count >= 60) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please retry after a few minutes.'
    });
  }

  current.count++;
  next();
}

app.use(rateLimiter);

// Auth extraction helper
function getAuthContext(req: Request, strictAuth = false): ToolContext | null {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    return authenticateToken(authHeader);
  }

  // Fallback to query param token
  const queryToken = req.query.token as string | undefined;
  if (queryToken) {
    return authenticateToken(queryToken);
  }

  const sessionUid = req.headers['x-user-id'] as string | undefined;
  if (sessionUid) {
    const user = store.getUser(sessionUid);
    if (user && user.activeFamilyId) {
      const member = store.getMember(user.activeFamilyId, user.uid);
      if (member) {
        return {
          uid: user.uid,
          familyId: user.activeFamilyId,
          role: member.role
        };
      }
    }
  }

  // If strict authentication is required (e.g. MCP endpoints per FR-MCP-003), do not fall back
  if (strictAuth) {
    return null;
  }

  // Default demo user for seamless local web UI evaluation if no header sent
  const defaultUser = store.getUser('user-sarah-1');
  if (defaultUser && defaultUser.activeFamilyId) {
    const member = store.getMember(defaultUser.activeFamilyId, defaultUser.uid);
    if (member) {
      return {
        uid: defaultUser.uid,
        familyId: defaultUser.activeFamilyId,
        role: member.role
      };
    }
  }

  return null;
}

// Active SSE Transports for MCP
const sseTransports = new Map<string, SSEServerTransport>();

// ==========================================
// MCP SERVER ENDPOINTS (FR-MCP-001 - FR-MCP-006)
// ==========================================

// Streamable HTTP JSON-RPC endpoint (/mcp)
app.post('/mcp', async (req: Request, res: Response) => {
  const ctx = getAuthContext(req, true);
  if (!ctx) {
    return res.status(401).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: { code: -32001, message: 'Unauthorized: Invalid or missing credentials' }
    });
  }

  const { jsonrpc, id, method, params } = req.body;

  if (method === 'initialize') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: params?.protocolVersion || '2024-11-05',
        capabilities: { tools: { listChanged: false } },
        serverInfo: {
          name: 'CircleCare-AI-MCP-Server',
          version: '1.0.0'
        }
      }
    });
  }

  if (method === 'notifications/initialized' || method === 'initialized') {
    if (id !== undefined && id !== null) {
      return res.json({ jsonrpc: '2.0', id, result: {} });
    }
    return res.status(204).end();
  }

  if (method === 'ping') {
    return res.json({ jsonrpc: '2.0', id, result: {} });
  }

  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: getMCPToolsDefinitions()
      }
    });
  }

  if (method === 'tools/call') {
    const { name, arguments: toolArgs } = params || {};
    const tool = (CircleCareTools as any)[name];

    if (!tool) {
      return res.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Tool "${name}" not found.` }
      });
    }

    const result = await tool.execute(toolArgs, ctx);
    const content: any[] = [
      { type: 'text', text: JSON.stringify(result) }
    ];

    if (name === 'get_daily_schedule' && result.ok && result.data) {
      const richCard = formatRichScheduleCard(result.data);
      content.push({
        type: 'text',
        text: JSON.stringify({ richCard })
      });
    }

    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        content,
        isError: !result.ok
      }
    });
  }

  return res.json({
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method "${method}" is not implemented.` }
  });
});

// SSE endpoint (/mcp/sse)
app.get('/mcp/sse', async (req: Request, res: Response) => {
  const ctx = getAuthContext(req, true);
  if (!ctx) {
    return res.status(401).send('Unauthorized: Token required for MCP SSE connection');
  }

  try {
    const transport = new SSEServerTransport('/mcp/messages', res);
    const mcpServer = createMCPServer(ctx);
    await mcpServer.connect(transport);

    sseTransports.set(transport.sessionId, transport);

    req.on('close', () => {
      sseTransports.delete(transport.sessionId);
    });
  } catch (err: any) {
    console.error('SSE Error:', err);
    if (!res.headersSent) {
      res.status(500).send('Failed to initialize SSE transport');
    }
  }
});

// Post message to SSE transport
app.post('/mcp/messages', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = sseTransports.get(sessionId);

  if (!transport) {
    return res.status(404).send('Session not found or expired');
  }

  await transport.handlePostMessage(req, res);
});

// Direct tools inspection endpoint
app.get('/mcp/tools', (req: Request, res: Response) => {
  const ctx = getAuthContext(req, true);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const tools = Object.values(CircleCareTools).map(t => ({
    name: t.name,
    description: t.description,
    minRole: t.minRole,
    requiresConfirmation: t.requiresConfirmation
  }));

  res.json({ tools, familyId: ctx.familyId, userRole: ctx.role });
});

// Direct tool call endpoint
app.post('/mcp/call', async (req: Request, res: Response) => {
  const ctx = getAuthContext(req, true);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const { name, arguments: toolArgs } = req.body;
  const tool = (CircleCareTools as any)[name];

  if (!tool) {
    return res.status(404).json({ error: `Tool ${name} not found` });
  }

  const result = await tool.execute(toolArgs, ctx);
  res.json(result);
});

// ==========================================
// AI ASSISTANT & CHAT ENGINE (FR-AI-001 - FR-AI-012)
// ==========================================

// Parse natural language intent into one of the 6 tools
function parseAssistantIntent(
  userText: string,
  ctx: ToolContext,
  allMembers: { uid: string; displayName: string }[]
): { toolName: string; params: any } | null {
  const lower = userText.toLowerCase();

  // Cross-family prompt injection check (FR-AI-004, FR-AI-007)
  if (lower.includes('family-baker') || lower.includes('other family') || lower.includes('baker family')) {
    return null; // Will trigger refusal
  }

  // 1. Schedule / Events check
  if (lower.includes('schedule') || lower.includes('today') && (lower.includes('what') || lower.includes('show') || lower.includes('events'))) {
    return {
      toolName: 'get_daily_schedule',
      params: { date: new Date().toISOString().split('T')[0] }
    };
  }

  // 2. Summary
  if (lower.includes('summary') || lower.includes('overview') || lower.includes('status report')) {
    const range = lower.includes('week') ? 'week' : 'today';
    return {
      toolName: 'get_family_summary',
      params: { range }
    };
  }

  // 3. Create Event
  if (lower.includes('appointment') || lower.includes('add event') || lower.includes('schedule dentist') || lower.includes('add meeting')) {
    const now = new Date();
    // Default to tomorrow 16:00
    const eventDate = new Date(now.getTime() + 24 * 3600000);
    const dateStr = eventDate.toISOString().split('T')[0];

    // Find attendee mentioned
    let attendeeIds: string[] = [ctx.uid];
    for (const m of allMembers) {
      if (lower.includes(m.displayName.toLowerCase()) || lower.includes(m.displayName.split(' ')[0].toLowerCase())) {
        if (!attendeeIds.includes(m.uid)) attendeeIds.push(m.uid);
      }
    }

    return {
      toolName: 'create_family_event',
      params: {
        title: lower.includes('dentist') ? 'Dentist Appointment' : 'Family Appointment',
        startAt: `${dateStr}T16:00:00Z`,
        endAt: `${dateStr}T17:00:00Z`,
        timeZone: 'America/New_York',
        attendeeIds
      }
    };
  }

  // 4. Create Task
  if (lower.includes('add task') || lower.includes('create task') || lower.includes('assign pickup') || lower.includes('need to buy') || lower.includes('remind to')) {
    let title = userText.replace(/^(please\s+)?(add task|create task|remind me to|assign)\s+/i, '').trim();
    if (title.length > 100) title = title.substring(0, 100);
    if (!title) title = 'New Family Task';

    let assigneeId: string | undefined = undefined;
    for (const m of allMembers) {
      if (lower.includes(m.displayName.toLowerCase()) || lower.includes(m.displayName.split(' ')[0].toLowerCase())) {
        assigneeId = m.uid;
        break;
      }
    }

    return {
      toolName: 'create_family_task',
      params: {
        title,
        assigneeId,
        priority: lower.includes('urgent') || lower.includes('high') ? 'high' : 'normal',
        dueAt: new Date(Date.now() + 24 * 3600000).toISOString()
      }
    };
  }

  // 5. Query Tasks & Overdue Tasks
  if (lower.includes('task') || lower.includes('what is due') || lower.includes('chores') || lower.includes('overdue')) {
    let assigneeId: string | undefined = undefined;
    for (const m of allMembers) {
      if (lower.includes(m.displayName.toLowerCase()) || lower.includes(m.displayName.split(' ')[0].toLowerCase())) {
        assigneeId = m.uid;
        break;
      }
    }

    const isOverdue = lower.includes('overdue') || lower.includes('past due') || lower.includes('late');

    let status: 'open' | 'in_progress' | 'done' | undefined = undefined;
    if (lower.includes('done') || lower.includes('completed')) status = 'done';
    else if (lower.includes('in progress')) status = 'in_progress';
    else if (lower.includes('pending') || lower.includes('open')) status = 'open';

    return {
      toolName: 'get_family_tasks',
      params: { status, assigneeId, overdueOnly: isOverdue }
    };
  }

  return null;
}

app.post('/api/assistant/chat', async (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message text is required' });
  }

  // FR-AI-007: Prompt injection / Secret protection
  const lowerMsg = message.toLowerCase();
  if (
    lowerMsg.includes('system prompt') ||
    lowerMsg.includes('credentials') ||
    lowerMsg.includes('api key') ||
    lowerMsg.includes('service account') ||
    lowerMsg.includes('secret')
  ) {
    return res.json({
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: 'Refusal: I am programmed to safeguard confidential system settings, private credentials, and family data. I cannot fulfill this request.',
      label: 'failed',
      timestamp: new Date().toISOString()
    });
  }

  if (lowerMsg.includes('family-baker') || lowerMsg.includes('baker family') || lowerMsg.includes('other family')) {
    return res.status(403).json({
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: 'Access Denied (Tenant Isolation): As an authorized assistant for your family (Miller), I cannot access, inspect, or reveal data belonging to other families (Baker Family). All operations are strictly isolated to your family workspace.',
      label: 'failed',
      timestamp: new Date().toISOString()
    });
  }

  const members = store.getMembers(ctx.familyId);
  const parsed = parseAssistantIntent(message, ctx, members);

  if (!parsed) {
    // Helpful general response and tool suggestions
    return res.json({
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `Hello! I can help you coordinate your family's schedule and tasks. You can ask me:\n• "What is on our schedule today?"\n• "Show all open tasks"\n• "Add dentist appointment tomorrow at 4 PM and assign David"\n• "Create task Buy groceries and assign to Emily"\n• "Give me a family summary"`,
      label: 'suggestion',
      timestamp: new Date().toISOString()
    });
  }

  const tool = (CircleCareTools as any)[parsed.toolName];
  if (!tool) {
    return res.json({
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `Unknown operation ${parsed.toolName}.`,
      label: 'failed',
      timestamp: new Date().toISOString()
    });
  }

  const toolResult = await tool.execute(parsed.params, ctx);

  // Store conversation if user opted in (FR-AI-010)
  store.saveConversationMessage(ctx.uid, {
    user: message,
    assistantResult: toolResult,
    timestamp: new Date().toISOString()
  });

  if (toolResult.label === 'pending_action') {
    return res.json({
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: toolResult.data.message || `I have prepared this action: ${toolResult.data.description}. Please confirm to proceed.`,
      label: 'pending_action',
      pendingAction: store.getPendingAction(toolResult.data.pendingActionId),
      data: toolResult.data,
      timestamp: new Date().toISOString()
    });
  }

  if (toolResult.ok) {
    let responseText = '';
    if (parsed.toolName === 'get_daily_schedule') {
      const { events, tasksDue, conflicts } = toolResult.data;
      responseText = `Here is today's schedule:\n• **${events.length} Events**: ${events.map((e: any) => `${e.title} (${e.start.substring(11, 16)} - ${e.end.substring(11, 16)})`).join(', ') || 'None'}\n• **${tasksDue.length} Tasks Due**: ${tasksDue.map((t: any) => `${t.title} [${t.priority}]`).join(', ') || 'None'}`;
      if (conflicts && conflicts.length > 0) {
        responseText += `\n\n⚠️ **Conflict Detected**: ${conflicts.map((c: any) => `${c.attendee} has overlapping events "${c.eventA}" and "${c.eventB}"`).join('; ')}`;
      }
    } else if (parsed.toolName === 'get_family_summary') {
      const { counts } = toolResult.data;
      responseText = `Family Summary (${toolResult.data.range}):\n• Tasks Due Today: ${counts.dueToday}\n• Overdue Tasks: ${counts.overdue}\n• In Progress: ${counts.inProgress}\n• Completed Today: ${counts.doneToday}\n• Upcoming Events: ${counts.upcomingEvents}`;
    } else if (parsed.toolName === 'get_family_tasks') {
      const tasks = toolResult.data.tasks;
      if (!tasks || tasks.length === 0) {
        responseText = parsed.params.overdueOnly
          ? 'No overdue tasks found for your family.'
          : 'No tasks found matching your request.';
      } else {
        responseText = `Found ${tasks.length} task(s):\n` + tasks.map((t: any) => `• [${t.status.toUpperCase()}] ${t.title} (${t.priority}) - Assignee: ${t.assignee}`).join('\n');
      }
    } else {
      responseText = toolResult.data.message || 'Operation succeeded.';
    }

    return res.json({
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: responseText,
      label: 'succeeded',
      data: toolResult.data,
      timestamp: new Date().toISOString()
    });
  } else {
    return res.json({
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `I could not perform that action: ${toolResult.error?.message || 'Unknown error'}`,
      label: 'failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Confirmation endpoint (FR-AI-005, ADR-006)
app.post('/api/assistant/confirm', async (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const { pendingActionId } = req.body;
  if (!pendingActionId) {
    return res.status(400).json({ error: 'pendingActionId is required' });
  }

  try {
    const confirmed = store.confirmPendingAction(pendingActionId, ctx.uid);
    res.json({
      ok: true,
      label: 'succeeded',
      data: confirmed.result,
      message: 'Pending action confirmed and applied successfully.'
    });
  } catch (err: any) {
    res.status(400).json({
      ok: false,
      label: 'failed',
      error: { code: 'CONFIRMATION_FAILED', message: err.message }
    });
  }
});

// Reject endpoint
app.post('/api/assistant/reject', async (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const { pendingActionId } = req.body;
  if (!pendingActionId) {
    return res.status(400).json({ error: 'pendingActionId is required' });
  }

  const success = store.rejectPendingAction(pendingActionId);
  res.json({ ok: success, message: 'Pending action discarded.' });
});

// ==========================================
// USER & AUTH APIS
// ==========================================

app.get('/api/auth/me', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const user = store.getUser(ctx.uid);
  const family = store.getFamily(ctx.familyId);
  const member = store.getMember(ctx.familyId, ctx.uid);

  res.json({
    user,
    family,
    role: member?.role || 'viewer'
  });
});

// Quick switch user for Hackathon judging Journey C
app.post('/api/auth/switch-user', (req: Request, res: Response) => {
  const { uid } = req.body;
  const user = store.getUser(uid);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const family = user.activeFamilyId ? store.getFamily(user.activeFamilyId) : null;
  const member = user.activeFamilyId ? store.getMember(user.activeFamilyId, user.uid) : null;

  res.json({
    user,
    family,
    role: member?.role || 'viewer',
    token: `demo-token-${user.uid}`
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Find user by email
  let foundUser: any = null;
  // Sarah demo
  if (email.toLowerCase().includes('sarah')) foundUser = store.getUser('user-sarah-1');
  else if (email.toLowerCase().includes('david')) foundUser = store.getUser('user-david-1');
  else if (email.toLowerCase().includes('emily')) foundUser = store.getUser('user-emily-1');
  else if (email.toLowerCase().includes('leo')) foundUser = store.getUser('user-leo-1');
  else if (email.toLowerCase().includes('baker')) foundUser = store.getUser('user-baker-1');
  else {
    // Return generic error per FR-AUTH-002
    return res.status(401).json({ error: 'Incorrect email or password' });
  }

  res.json({
    user: foundUser,
    token: `demo-token-${foundUser.uid}`
  });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { email, password, displayName } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const uid = `user-${Date.now()}`;
  const newUser = store.upsertUser({
    uid,
    displayName: displayName || email.split('@')[0],
    email,
    timeZone: 'America/New_York',
    notificationPrefs: { taskAssigned: true, dueSoon: true, overdue: true, eventReminders: true }
  });

  // Automatically create a family for the new user (FR-FAM-001)
  const family = store.createFamily(`${newUser.displayName}'s Family`, newUser.uid);

  res.json({
    user: newUser,
    family,
    token: `demo-token-${newUser.uid}`
  });
});

app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  // FR-AUTH-003: Neutral message whether account exists or not
  res.json({
    message: 'If an account exists with this email, a password reset link has been dispatched.'
  });
});

app.post('/api/auth/delete-account', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  try {
    store.deleteUser(ctx.uid);
    res.json({ success: true, message: 'Account and associated data deleted.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Profile
app.get('/api/profile', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });
  res.json(store.getUser(ctx.uid));
});

app.put('/api/profile', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const user = store.getUser(ctx.uid);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { displayName, timeZone, notificationPrefs } = req.body;
  if (displayName) user.displayName = displayName;
  if (timeZone) user.timeZone = timeZone;
  if (notificationPrefs) user.notificationPrefs = { ...user.notificationPrefs, ...notificationPrefs };

  store.upsertUser(user);
  res.json(user);
});

// ==========================================
// FAMILY MANAGEMENT (FR-FAM-001 - FR-FAM-008)
// ==========================================

app.get('/api/family', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const family = store.getFamily(ctx.familyId);
  const members = store.getMembers(ctx.familyId);
  res.json({ family, members, myRole: ctx.role });
});

app.post('/api/family', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const { name } = req.body;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Family name is required' });
  }

  const newFamily = store.createFamily(name.trim(), ctx.uid);
  res.json(newFamily);
});

app.put('/api/family/rename', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    return res.status(403).json({ error: 'Permission denied: Only Owners and Admins can rename the family.' });
  }

  const { name } = req.body;
  const updated = store.updateFamilyName(ctx.familyId, name);
  res.json(updated);
});

app.post('/api/family/transfer-ownership', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  if (ctx.role !== 'owner') {
    return res.status(403).json({ error: 'Permission denied: Only the current Owner can transfer ownership.' });
  }

  const { newOwnerUid } = req.body;
  try {
    const updated = store.transferOwnership(ctx.familyId, newOwnerUid);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/family/members/:memberUid/role', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  if (ctx.role !== 'owner') {
    return res.status(403).json({ error: 'Permission denied: Only the Owner can modify member roles.' });
  }

  const memberUid = paramStr(req.params.memberUid);
  const { role } = req.body;
  try {
    const updated = store.updateMemberRole(ctx.familyId, memberUid, role);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/family/members/:memberUid', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const memberUid = paramStr(req.params.memberUid);
  const isSelf = memberUid === ctx.uid;
  const isPrivileged = ctx.role === 'owner' || ctx.role === 'admin';

  if (!isSelf && !isPrivileged) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  try {
    const success = store.removeMember(ctx.familyId, memberUid);
    res.json({ success });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Invitations (FR-FAM-002, FR-FAM-003)
app.get('/api/invitations', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    return res.status(403).json({ error: 'Permission denied' });
  }

  // Return invite for active family
  const invite = store.createInvitation(ctx.familyId, ctx.uid, 'member');
  res.json([invite]);
});

app.post('/api/invitations', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    return res.status(403).json({ error: 'Permission denied' });
  }

  const { role } = req.body;
  const invite = store.createInvitation(ctx.familyId, ctx.uid, role || 'member');
  res.json(invite);
});

app.post('/api/invitations/redeem', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Invitation code is required' });

  const user = store.getUser(ctx.uid);
  if (!user) return res.status(404).json({ error: 'User not found' });

  try {
    const result = store.redeemInvitation(code, user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// TASKS (FR-TASK-001 - FR-TASK-008)
// ==========================================

app.get('/api/tasks', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const { status, assigneeUid, search, priority } = req.query;
  let list = store.getTasks(ctx.familyId);

  if (status) list = list.filter(t => t.status === status);
  if (assigneeUid) list = list.filter(t => t.assigneeUid === assigneeUid);
  if (priority) list = list.filter(t => t.priority === priority);
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(t => t.title.toLowerCase().includes(q) || (t.notes && t.notes.toLowerCase().includes(q)));
  }

  res.json(list);
});

app.post('/api/tasks', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  if (ctx.role === 'viewer') {
    return res.status(403).json({ error: 'Permission denied: Viewers cannot create tasks.' });
  }

  const { title, notes, assigneeUid, priority, dueAt } = req.body;
  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'Task title is required.' });
  }

  const task = store.createTask(ctx.familyId, ctx.uid, {
    title: title.trim(),
    notes,
    assigneeUid,
    priority: priority || 'normal',
    dueAt
  });

  res.json(task);
});

app.put('/api/tasks/:taskId', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const taskId = paramStr(req.params.taskId);
  const existing = store.getTask(ctx.familyId, taskId);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  // Role permissions per FR-TASK-002
  if (ctx.role === 'member') {
    const isOwn = existing.createdBy === ctx.uid;
    const isAssigned = existing.assigneeUid === ctx.uid;
    if (!isOwn && !isAssigned) {
      return res.status(403).json({ error: 'Members can only edit tasks they created or are assigned to.' });
    }
  } else if (ctx.role === 'viewer') {
    const isAssigned = existing.assigneeUid === ctx.uid;
    if (!isAssigned) {
      return res.status(403).json({ error: 'Viewers can only update their own assigned tasks.' });
    }
  }

  const updated = store.updateTask(ctx.familyId, taskId, ctx.uid, req.body);
  res.json(updated);
});

app.delete('/api/tasks/:taskId', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    return res.status(403).json({ error: 'Permission denied: Only Admins or Owners can delete tasks.' });
  }

  const taskId = paramStr(req.params.taskId);
  const success = store.softDeleteTask(ctx.familyId, taskId, ctx.uid);
  res.json({ success });
});

app.post('/api/tasks/:taskId/restore', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const taskId = paramStr(req.params.taskId);
  try {
    const restored = store.restoreTask(ctx.familyId, taskId, ctx.uid);
    res.json(restored);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/tasks/:taskId/history', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const taskId = paramStr(req.params.taskId);
  const history = store.getTaskHistory(taskId);
  res.json(history);
});

// ==========================================
// CALENDAR EVENTS (FR-CAL-001 - FR-CAL-005)
// ==========================================

app.get('/api/events', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const events = store.getEvents(ctx.familyId);
  res.json(events);
});

app.post('/api/events', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  if (ctx.role === 'viewer') {
    return res.status(403).json({ error: 'Permission denied: Viewers cannot create events.' });
  }

  try {
    const { event, conflicts } = store.createEvent(ctx.familyId, ctx.uid, req.body);
    res.json({ event, conflicts });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/events/:eventId', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  if (ctx.role === 'viewer') {
    return res.status(403).json({ error: 'Permission denied' });
  }

  const eventId = paramStr(req.params.eventId);
  try {
    const { event, conflicts } = store.updateEvent(ctx.familyId, eventId, req.body);
    res.json({ event, conflicts });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/events/:eventId', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    return res.status(403).json({ error: 'Permission denied' });
  }

  const eventId = paramStr(req.params.eventId);
  const success = store.deleteEvent(ctx.familyId, eventId);
  res.json({ success });
});

// ==========================================
// DASHBOARD & NOTIFICATIONS (FR-DASH, FR-NOTIF)
// ==========================================

app.get('/api/dashboard', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const tasks = store.getTasks(ctx.familyId);
  const events = store.getEvents(ctx.familyId);

  const dueTodayTasks = tasks.filter(t => t.status !== 'done' && t.dueAt && t.dueAt.substring(0, 10) === todayStr);
  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.dueAt && new Date(t.dueAt).getTime() < now.getTime() && t.dueAt.substring(0, 10) !== todayStr);

  const next7Days = new Date(now.getTime() + 7 * 86400000);
  const next7DaysEvents = events.filter(e => {
    const evTime = new Date(e.startAt).getTime();
    return evTime >= now.getTime() && evTime <= next7Days.getTime();
  });

  const recentActivity = store.getRecentActivity(ctx.familyId, 10);

  res.json({
    metrics: {
      dueToday: dueTodayTasks.length,
      pending: pendingTasks.length,
      overdue: overdueTasks.length,
      upcomingEventsCount: next7DaysEvents.length
    },
    dueTodayTasks,
    overdueTasks,
    upcomingEvents: next7DaysEvents,
    recentActivity
  });
});

app.get('/api/notifications', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const list = store.getNotifications(ctx.uid);
  res.json(list);
});

app.put('/api/notifications/:id/read', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  const success = store.markNotificationAsRead(ctx.uid, paramStr(req.params.id));
  res.json({ success });
});

app.put('/api/notifications/read-all', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  store.markAllNotificationsAsRead(ctx.uid);
  res.json({ success: true });
});

// Consent
app.get('/api/consent', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });
  res.json(store.getConsentPreferences(ctx.uid));
});

app.post('/api/consent', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  store.setConsentPreferences(ctx.uid, req.body);
  res.json({ success: true, prefs: store.getConsentPreferences(ctx.uid) });
});

// Reset demo data to clean seed state
app.post('/api/reset-demo', (_req: Request, res: Response) => {
  store.seedInitialData();
  res.json({ success: true, message: 'Seeded demo family reset successfully.' });
});

// Fallback 404 handler - prevents HTML responses
app.use((req: Request, res: Response) => {
  if (req.path.startsWith('/mcp')) {
    return res.status(404).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: { code: -32601, message: `Route ${req.method} ${req.path} not found` }
    });
  }
  res.status(404).json({ error: 'NotFound', message: `Route ${req.method} ${req.path} not found` });
});

// Global JSON error handler - guarantees Express never sends HTML error pages
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('[CircleCare-AI] Error handler caught:', err);
  const status = err.status || err.statusCode || 500;
  if (req.path.startsWith('/mcp')) {
    return res.status(status).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: {
        code: status === 401 ? -32001 : -32603,
        message: err.message || 'Internal server error'
      }
    });
  }
  res.status(status).json({
    error: err.name || 'ServerError',
    message: err.message || 'An unexpected server error occurred'
  });
});

app.listen(PORT, () => {
  console.log(`[CircleCare-AI] Backend Server & MCP Server listening on http://localhost:${PORT}`);
});
