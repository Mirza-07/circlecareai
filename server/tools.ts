import { z } from 'zod';
import { store } from './store.js';
import { FamilyRole, TaskPriority, TaskStatus } from '../src/types/index.js';

// Zod schemas for input validation (FR-AI-003)
export const GetFamilyTasksInputSchema = z.object({
  status: z.enum(['open', 'in_progress', 'done']).optional(),
  assigneeId: z.string().optional(),
  dueFrom: z.string().optional(),
  dueTo: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(50).optional(),
  overdueOnly: z.boolean().optional(),
  targetFamilyId: z.string().optional()
});

export const CreateFamilyTaskInputSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(120, 'Title cannot exceed 120 characters'),
  notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional(),
  assigneeId: z.string().optional(),
  dueAt: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal').optional(),
  // For confirmation execution bypass if already approved
  skipConfirmation: z.boolean().optional()
});

export const UpdateFamilyTaskInputSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  patch: z.object({
    title: z.string().min(1).max(120).optional(),
    notes: z.string().max(2000).optional(),
    assigneeId: z.string().optional(),
    dueAt: z.string().optional(),
    priority: z.enum(['low', 'normal', 'high']).optional(),
    status: z.enum(['open', 'in_progress', 'done']).optional()
  }),
  skipConfirmation: z.boolean().optional()
});

export const GetDailyScheduleInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Date must be in ISO format (YYYY-MM-DD)'),
  timeZone: z.string().optional()
});

export const CreateFamilyEventInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  startAt: z.string().min(1, 'startAt ISO string is required'),
  endAt: z.string().min(1, 'endAt ISO string is required'),
  timeZone: z.string().default('UTC').optional(),
  attendeeIds: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
  skipConfirmation: z.boolean().optional()
});

export const GetFamilySummaryInputSchema = z.object({
  range: z.enum(['today', 'week']).default('today')
});

// Tool execution context guaranteed by verified server session (FR-AI-004)
export interface ToolContext {
  uid: string;
  familyId: string;
  role: FamilyRole;
}

export interface ToolResult {
  ok: boolean;
  label: 'suggestion' | 'pending_action' | 'succeeded' | 'failed';
  data?: any;
  error?: {
    code: string;
    message: string;
  };
}

// Role checker
function verifyRole(ctx: ToolContext, allowedRoles: FamilyRole[]): void {
  if (!allowedRoles.includes(ctx.role)) {
    throw new Error(`Permission denied: Your role (${ctx.role}) cannot perform this operation.`);
  }
}

// Exactly six tools definitions per FR-AI-002
export const CircleCareTools = {
  get_family_tasks: {
    name: 'get_family_tasks',
    description: 'Retrieve tasks for the current family, optionally filtered by status, assignee, or date range.',
    inputSchema: GetFamilyTasksInputSchema,
    minRole: 'viewer' as FamilyRole,
    requiresConfirmation: false,
    async execute(rawInput: unknown, ctx: ToolContext): Promise<ToolResult> {
      try {
        verifyRole(ctx, ['owner', 'admin', 'member', 'viewer']);
        const input = GetFamilyTasksInputSchema.parse(rawInput);

        // Enforce multi-tenant isolation (FR-FAM-007, FR-AI-004)
        if (input.targetFamilyId && input.targetFamilyId !== ctx.familyId) {
          throw new Error('Access denied: Cross-family access is strictly forbidden by CircleCare Security Rules.');
        }

        const allTasks = store.getTasks(ctx.familyId);
        let filtered = allTasks;

        if (input.overdueOnly) {
          const nowMs = Date.now();
          filtered = filtered.filter(t => t.status !== 'done' && t.dueAt && new Date(t.dueAt).getTime() < nowMs);
        }
        if (input.status) {
          filtered = filtered.filter(t => t.status === input.status);
        }
        if (input.assigneeId) {
          filtered = filtered.filter(t => t.assigneeUid === input.assigneeId);
        }
        if (input.dueFrom) {
          const fromTime = new Date(input.dueFrom).getTime();
          filtered = filtered.filter(t => t.dueAt && new Date(t.dueAt).getTime() >= fromTime);
        }
        if (input.dueTo) {
          const toTime = new Date(input.dueTo).getTime();
          filtered = filtered.filter(t => t.dueAt && new Date(t.dueAt).getTime() <= toTime);
        }

        const limit = input.limit || 50;
        const resultTasks = filtered.slice(0, limit).map(t => ({
          id: t.taskId,
          title: t.title,
          assignee: t.assigneeUid ? store.getUser(t.assigneeUid)?.displayName || t.assigneeUid : 'Unassigned',
          assigneeId: t.assigneeUid,
          due: t.dueAt,
          priority: t.priority,
          status: t.status
        }));

        return {
          ok: true,
          label: 'succeeded',
          data: {
            tasks: resultTasks,
            count: resultTasks.length
          }
        };
      } catch (err: any) {
        return {
          ok: false,
          label: 'failed',
          error: {
            code: err.name === 'ZodError' ? 'INVALID_INPUT' : 'OPERATION_FAILED',
            message: err.message
          }
        };
      }
    }
  },

  create_family_task: {
    name: 'create_family_task',
    description: 'Create a new family task. Requires user confirmation before changing family state.',
    inputSchema: CreateFamilyTaskInputSchema,
    minRole: 'member' as FamilyRole,
    requiresConfirmation: true,
    async execute(rawInput: unknown, ctx: ToolContext): Promise<ToolResult> {
      try {
        verifyRole(ctx, ['owner', 'admin', 'member']);
        const input = CreateFamilyTaskInputSchema.parse(rawInput);

        // Check if assignee is member of this family
        if (input.assigneeId) {
          const isMember = store.getMember(ctx.familyId, input.assigneeId);
          if (!isMember) {
            throw new Error(`Assignee ${input.assigneeId} is not a member of this family.`);
          }
        }

        // FR-AI-005: State-changing tools return a pending action first!
        if (!input.skipConfirmation) {
          const assigneeName = input.assigneeId
            ? store.getUser(input.assigneeId)?.displayName || 'someone'
            : 'Unassigned';
          const description = `Create task "${input.title}" (Priority: ${input.priority || 'normal'}, Assignee: ${assigneeName}${input.dueAt ? `, Due: ${input.dueAt}` : ''})`;

          const pendingAction = store.createPendingAction(
            ctx.familyId,
            ctx.uid,
            'create_family_task',
            {
              title: input.title,
              notes: input.notes,
              assigneeUid: input.assigneeId,
              dueAt: input.dueAt,
              priority: input.priority || 'normal'
            },
            description
          );

          return {
            ok: true,
            label: 'pending_action',
            data: {
              pendingActionId: pendingAction.id,
              description,
              expiresAt: pendingAction.expiresAt,
              confirmationRequired: true,
              message: `I need your confirmation before creating this task: "${input.title}". Please confirm to proceed.`
            }
          };
        }

        // Execution if skipConfirmation is true (e.g. user confirmed)
        const task = store.createTask(ctx.familyId, ctx.uid, {
          title: input.title,
          notes: input.notes,
          assigneeUid: input.assigneeId,
          dueAt: input.dueAt,
          priority: input.priority || 'normal'
        });

        return {
          ok: true,
          label: 'succeeded',
          data: {
            task,
            message: `Task "${task.title}" has been successfully created.`
          }
        };
      } catch (err: any) {
        return {
          ok: false,
          label: 'failed',
          error: {
            code: err.name === 'ZodError' ? 'INVALID_INPUT' : 'OPERATION_FAILED',
            message: err.message
          }
        };
      }
    }
  },

  update_family_task: {
    name: 'update_family_task',
    description: 'Update a task (status, assignee, priority, due date, notes). Requires user confirmation before execution.',
    inputSchema: UpdateFamilyTaskInputSchema,
    minRole: 'member' as FamilyRole,
    requiresConfirmation: true,
    async execute(rawInput: unknown, ctx: ToolContext): Promise<ToolResult> {
      try {
        const input = UpdateFamilyTaskInputSchema.parse(rawInput);
        const existingTask = store.getTask(ctx.familyId, input.taskId);
        if (!existingTask) {
          throw new Error(`Task with ID ${input.taskId} not found in this family.`);
        }

        // Role verification (FR-TASK-002):
        // Members can only edit their own created or assigned tasks. Owners & Admins can edit any task.
        if (ctx.role === 'member') {
          const isOwn = existingTask.createdBy === ctx.uid;
          const isAssigned = existingTask.assigneeUid === ctx.uid;
          if (!isOwn && !isAssigned) {
            throw new Error('Permission denied: As a Member, you can only edit tasks you created or are assigned to.');
          }
        } else if (ctx.role === 'viewer') {
          // Viewers can only change status of their own assigned tasks
          const isAssigned = existingTask.assigneeUid === ctx.uid;
          const onlyStatus = Object.keys(input.patch).length === 1 && input.patch.status !== undefined;
          if (!isAssigned || !onlyStatus) {
            throw new Error('Permission denied: Viewers can only update the status of tasks assigned to them.');
          }
        }

        if (input.patch.assigneeId) {
          const isMember = store.getMember(ctx.familyId, input.patch.assigneeId);
          if (!isMember) {
            throw new Error(`Assignee ${input.patch.assigneeId} is not a member of this family.`);
          }
        }

        // FR-AI-005: State-changing tools return a pending action first!
        if (!input.skipConfirmation) {
          const patchSummary = Object.entries(input.patch)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
          const description = `Update task "${existingTask.title}" (${patchSummary})`;

          const pendingAction = store.createPendingAction(
            ctx.familyId,
            ctx.uid,
            'update_family_task',
            {
              taskId: input.taskId,
              patch: {
                title: input.patch.title,
                notes: input.patch.notes,
                assigneeUid: input.patch.assigneeId,
                dueAt: input.patch.dueAt,
                priority: input.patch.priority,
                status: input.patch.status
              }
            },
            description
          );

          return {
            ok: true,
            label: 'pending_action',
            data: {
              pendingActionId: pendingAction.id,
              description,
              expiresAt: pendingAction.expiresAt,
              confirmationRequired: true,
              message: `I need your confirmation to apply updates to "${existingTask.title}". Please confirm.`
            }
          };
        }

        const updated = store.updateTask(ctx.familyId, input.taskId, ctx.uid, {
          title: input.patch.title,
          notes: input.patch.notes,
          assigneeUid: input.patch.assigneeId,
          dueAt: input.patch.dueAt,
          priority: input.patch.priority,
          status: input.patch.status
        });

        return {
          ok: true,
          label: 'succeeded',
          data: {
            task: updated,
            message: `Task "${updated.title}" was updated successfully.`
          }
        };
      } catch (err: any) {
        return {
          ok: false,
          label: 'failed',
          error: {
            code: err.name === 'ZodError' ? 'INVALID_INPUT' : 'OPERATION_FAILED',
            message: err.message
          }
        };
      }
    }
  },

  get_daily_schedule: {
    name: 'get_daily_schedule',
    description: 'Retrieve all events and tasks scheduled for a specific date, with overlaps and conflicts flagged.',
    inputSchema: GetDailyScheduleInputSchema,
    minRole: 'viewer' as FamilyRole,
    requiresConfirmation: false,
    async execute(rawInput: unknown, ctx: ToolContext): Promise<ToolResult> {
      try {
        verifyRole(ctx, ['owner', 'admin', 'member', 'viewer']);
        const input = GetDailyScheduleInputSchema.parse(rawInput);
        const targetDate = input.date.substring(0, 10); // YYYY-MM-DD

        const allEvents = store.getEvents(ctx.familyId);
        const dailyEvents = allEvents.filter(e => {
          const startDay = e.startAt.substring(0, 10);
          return startDay === targetDate;
        });

        // Detect conflicts among daily events (FR-CAL-003)
        const conflicts: { eventA: string; eventB: string; attendee: string }[] = [];
        for (let i = 0; i < dailyEvents.length; i++) {
          for (let j = i + 1; j < dailyEvents.length; j++) {
            const a = dailyEvents[i];
            const b = dailyEvents[j];
            const aStart = new Date(a.startAt).getTime();
            const aEnd = new Date(a.endAt).getTime();
            const bStart = new Date(b.startAt).getTime();
            const bEnd = new Date(b.endAt).getTime();

            if (aStart < bEnd && aEnd > bStart) {
              const shared = a.attendeeIds.filter(id => b.attendeeIds.includes(id));
              shared.forEach(attendeeId => {
                const userName = store.getUser(attendeeId)?.displayName || attendeeId;
                conflicts.push({
                  eventA: a.title,
                  eventB: b.title,
                  attendee: userName
                });
              });
            }
          }
        }

        // Get tasks due that day
        const allTasks = store.getTasks(ctx.familyId);
        const dueTasks = allTasks.filter(t => t.dueAt && t.dueAt.substring(0, 10) === targetDate);

        return {
          ok: true,
          label: 'succeeded',
          data: {
            date: targetDate,
            events: dailyEvents.map(e => ({
              id: e.eventId,
              title: e.title,
              start: e.startAt,
              end: e.endAt,
              attendees: e.attendeeIds.map(id => store.getUser(id)?.displayName || id),
              notes: e.notes
            })),
            tasksDue: dueTasks.map(t => ({
              id: t.taskId,
              title: t.title,
              assignee: t.assigneeUid ? store.getUser(t.assigneeUid)?.displayName || t.assigneeUid : 'Unassigned',
              status: t.status,
              priority: t.priority
            })),
            conflicts,
            hasConflict: conflicts.length > 0
          }
        };
      } catch (err: any) {
        return {
          ok: false,
          label: 'failed',
          error: {
            code: err.name === 'ZodError' ? 'INVALID_INPUT' : 'OPERATION_FAILED',
            message: err.message
          }
        };
      }
    }
  },

  create_family_event: {
    name: 'create_family_event',
    description: 'Add a new calendar appointment or family event. Checks for schedule conflicts and requires confirmation.',
    inputSchema: CreateFamilyEventInputSchema,
    minRole: 'member' as FamilyRole,
    requiresConfirmation: true,
    async execute(rawInput: unknown, ctx: ToolContext): Promise<ToolResult> {
      try {
        verifyRole(ctx, ['owner', 'admin', 'member']);
        const input = CreateFamilyEventInputSchema.parse(rawInput);

        const attendees = input.attendeeIds && input.attendeeIds.length > 0
          ? input.attendeeIds
          : [ctx.uid];

        // Check for conflicts before proposing or creating (FR-CAL-003)
        const conflictsFound = store.findConflicts(
          ctx.familyId,
          input.startAt,
          input.endAt,
          attendees
        );

        const conflictWarnings = conflictsFound.map(c => {
          const names = c.overlappingAttendeeIds.map(id => store.getUser(id)?.displayName || id).join(', ');
          return `Overlap detected: ${names} already has "${c.event.title}" booked at this time.`;
        });

        // FR-AI-005: State-changing tools return pending action first!
        if (!input.skipConfirmation) {
          const attendeeNames = attendees.map(id => store.getUser(id)?.displayName || id).join(', ');
          const description = `Create event "${input.title}" on ${input.startAt.substring(0, 10)} (${attendeeNames})`;

          const pendingAction = store.createPendingAction(
            ctx.familyId,
            ctx.uid,
            'create_family_event',
            {
              title: input.title,
              startAt: input.startAt,
              endAt: input.endAt,
              timeZone: input.timeZone || 'UTC',
              attendeeIds: attendees,
              notes: input.notes
            },
            description,
            conflictWarnings
          );

          return {
            ok: true,
            label: 'pending_action',
            data: {
              pendingActionId: pendingAction.id,
              description,
              conflicts: conflictWarnings,
              expiresAt: pendingAction.expiresAt,
              confirmationRequired: true,
              message: conflictWarnings.length > 0
                ? `I found an overlap: ${conflictWarnings.join(' ')} Do you still want me to schedule "${input.title}"?`
                : `Ready to schedule "${input.title}". Please confirm to add it to the calendar.`
            }
          };
        }

        const { event, conflicts } = store.createEvent(ctx.familyId, ctx.uid, {
          title: input.title,
          startAt: input.startAt,
          endAt: input.endAt,
          timeZone: input.timeZone || 'UTC',
          attendeeIds: attendees,
          notes: input.notes
        });

        return {
          ok: true,
          label: 'succeeded',
          data: {
            event,
            conflicts,
            message: `Event "${event.title}" has been successfully added to the calendar.`
          }
        };
      } catch (err: any) {
        return {
          ok: false,
          label: 'failed',
          error: {
            code: err.name === 'ZodError' ? 'INVALID_INPUT' : 'OPERATION_FAILED',
            message: err.message
          }
        };
      }
    }
  },

  get_family_summary: {
    name: 'get_family_summary',
    description: 'Get an overview of tasks and calendar events (due today, overdue, upcoming, completed counts).',
    inputSchema: GetFamilySummaryInputSchema,
    minRole: 'viewer' as FamilyRole,
    requiresConfirmation: false,
    async execute(rawInput: unknown, ctx: ToolContext): Promise<ToolResult> {
      try {
        verifyRole(ctx, ['owner', 'admin', 'member', 'viewer']);
        const input = GetFamilySummaryInputSchema.parse(rawInput);

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const tasks = store.getTasks(ctx.familyId);
        const events = store.getEvents(ctx.familyId);

        const dueToday = tasks.filter(t => t.status !== 'done' && t.dueAt && t.dueAt.substring(0, 10) === todayStr);
        const overdue = tasks.filter(t => t.status !== 'done' && t.dueAt && new Date(t.dueAt).getTime() < now.getTime() && t.dueAt.substring(0, 10) !== todayStr);
        const inProgress = tasks.filter(t => t.status === 'in_progress');
        const doneToday = tasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt.substring(0, 10) === todayStr);

        const upcomingEvents = events.filter(e => {
          const eventTime = new Date(e.startAt).getTime();
          const limitTime = input.range === 'today'
            ? new Date(todayStr + 'T23:59:59Z').getTime()
            : now.getTime() + 7 * 86400000;
          return eventTime >= now.getTime() && eventTime <= limitTime;
        });

        return {
          ok: true,
          label: 'succeeded',
          data: {
            range: input.range,
            counts: {
              dueToday: dueToday.length,
              overdue: overdue.length,
              inProgress: inProgress.length,
              doneToday: doneToday.length,
              upcomingEvents: upcomingEvents.length
            },
            dueTodayTasks: dueToday.map(t => ({ id: t.taskId, title: t.title, priority: t.priority })),
            overdueTasks: overdue.map(t => ({ id: t.taskId, title: t.title, priority: t.priority, dueAt: t.dueAt })),
            upcomingEvents: upcomingEvents.map(e => ({ id: e.eventId, title: e.title, startAt: e.startAt }))
          }
        };
      } catch (err: any) {
        return {
          ok: false,
          label: 'failed',
          error: {
            code: err.name === 'ZodError' ? 'INVALID_INPUT' : 'OPERATION_FAILED',
            message: err.message
          }
        };
      }
    }
  }
};
