import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  LATEST_PROTOCOL_VERSION
} from '@modelcontextprotocol/sdk/types.js';
import { CircleCareTools, ToolContext } from './tools.js';
import { store } from './store.js';

// Resolve user & family from Bearer ID token (FR-MCP-003)
export function authenticateToken(tokenHeader: string | undefined): ToolContext | null {
  if (!tokenHeader) return null;
  const token = tokenHeader.replace(/^Bearer\s+/i, '').trim();

  // Support demo tokens and mock firebase tokens
  let uid = '';
  if (token.startsWith('demo-token-')) {
    uid = token.replace('demo-token-', '');
  } else if (token.startsWith('user-')) {
    uid = token;
  } else if (token === 'valid-sarah-token') {
    uid = 'user-sarah-1';
  } else if (token === 'valid-david-token') {
    uid = 'user-david-1';
  } else {
    // Check if token matches any known user
    const foundUser = store.getUser(token);
    if (foundUser) uid = foundUser.uid;
    else return null;
  }

  const user = store.getUser(uid);
  if (!user || !user.activeFamilyId) return null;

  const member = store.getMember(user.activeFamilyId, user.uid);
  if (!member) return null;

  return {
    uid: user.uid,
    familyId: user.activeFamilyId,
    role: member.role
  };
}

// Format rich card for Daily Schedule simulator (FR-MCP-006)
export function formatRichScheduleCard(data: any) {
  return {
    cardType: 'AlexaDailyScheduleCard',
    version: '2.0',
    title: `CircleCare Daily Schedule - ${data.date}`,
    summary: `${data.events.length} events, ${data.tasksDue.length} tasks due. ${data.hasConflict ? '⚠️ Overlap Detected!' : 'All clear.'}`,
    events: data.events,
    tasksDue: data.tasksDue,
    conflicts: data.conflicts,
    visualTheme: {
      backgroundColor: '#F8FAFC',
      primaryAccent: '#4F46E5',
      warningColor: '#E11D48'
    }
  };
}

// Full MCP Tool Definitions (FR-AI-002, FR-MCP-001)
export function getMCPToolsDefinitions() {
  return [
    {
      name: 'get_family_tasks',
      description: CircleCareTools.get_family_tasks.description,
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['open', 'in_progress', 'done'] },
          assigneeId: { type: 'string' },
          dueFrom: { type: 'string' },
          dueTo: { type: 'string' },
          limit: { type: 'number', minimum: 1, maximum: 50 },
          overdueOnly: { type: 'boolean' },
          targetFamilyId: { type: 'string' }
        }
      }
    },
    {
      name: 'create_family_task',
      description: CircleCareTools.create_family_task.description,
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          notes: { type: 'string' },
          assigneeId: { type: 'string' },
          dueAt: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'normal', 'high'] }
        },
        required: ['title']
      }
    },
    {
      name: 'update_family_task',
      description: CircleCareTools.update_family_task.description,
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          patch: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              notes: { type: 'string' },
              assigneeId: { type: 'string' },
              dueAt: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'normal', 'high'] },
              status: { type: 'string', enum: ['open', 'in_progress', 'done'] }
            }
          }
        },
        required: ['taskId', 'patch']
      }
    },
    {
      name: 'get_daily_schedule',
      description: CircleCareTools.get_daily_schedule.description,
      inputSchema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'ISO date string (YYYY-MM-DD)' },
          timeZone: { type: 'string' }
        },
        required: ['date']
      }
    },
    {
      name: 'create_family_event',
      description: CircleCareTools.create_family_event.description,
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          startAt: { type: 'string' },
          endAt: { type: 'string' },
          timeZone: { type: 'string' },
          attendeeIds: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' }
        },
        required: ['title', 'startAt', 'endAt']
      }
    },
    {
      name: 'get_family_summary',
      description: CircleCareTools.get_family_summary.description,
      inputSchema: {
        type: 'object',
        properties: {
          range: { type: 'string', enum: ['today', 'week'] }
        }
      }
    }
  ];
}

export function createMCPServer(ctx: ToolContext) {
  const server = new Server(
    {
      name: 'circlecare-mcp-server',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // List tools (FR-AI-002, FR-MCP-001)
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: getMCPToolsDefinitions()
    };
  });

  // Call tool (FR-MCP-001, FR-MCP-002)
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = (CircleCareTools as any)[name];

    if (!tool) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 'UNKNOWN_TOOL',
              message: `Tool "${name}" is not supported.`
            })
          }
        ]
      };
    }

    const result = await tool.execute(args, ctx);

    // FR-MCP-006: Include rich card representation if get_daily_schedule
    let content: any[] = [
      {
        type: 'text',
        text: JSON.stringify(result)
      }
    ];

    if (name === 'get_daily_schedule' && result.ok && result.data) {
      const richCard = formatRichScheduleCard(result.data);
      content.push({
        type: 'text',
        text: JSON.stringify({ richCard })
      });
    }

    return {
      isError: !result.ok,
      content
    };
  });

  return server;
}
