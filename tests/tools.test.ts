import { describe, it, expect, beforeEach } from 'vitest';
import { CircleCareTools, ToolContext } from '../server/tools.js';
import { store } from '../server/store.js';

describe('CircleCare AI Shared Tool Layer & Security Tests', () => {
  beforeEach(() => {
    store.seedInitialData();
  });

  const sarahCtx: ToolContext = {
    uid: 'user-sarah-1',
    familyId: 'family-miller-1',
    role: 'owner'
  };

  const davidCtx: ToolContext = {
    uid: 'user-david-1',
    familyId: 'family-miller-1',
    role: 'admin'
  };

  const emilyCtx: ToolContext = {
    uid: 'user-emily-1',
    familyId: 'family-miller-1',
    role: 'member'
  };

  const leoCtx: ToolContext = {
    uid: 'user-leo-1',
    familyId: 'family-miller-1',
    role: 'viewer'
  };

  const bakerCtx: ToolContext = {
    uid: 'user-baker-1',
    familyId: 'family-baker-2',
    role: 'owner'
  };

  describe('FR-AI-002 & FR-AI-003: Six Tools & Zod Input/Output Validation', () => {
    it('should expose exactly six tools', () => {
      const toolNames = Object.keys(CircleCareTools);
      expect(toolNames.sort()).toEqual([
        'create_family_event',
        'create_family_task',
        'get_daily_schedule',
        'get_family_summary',
        'get_family_tasks',
        'update_family_task'
      ].sort());
    });

    it('should reject invalid input for get_daily_schedule (fuzzing/bad date)', async () => {
      const res = await CircleCareTools.get_daily_schedule.execute(
        { date: 'invalid-not-a-date' },
        sarahCtx
      );
      expect(res.ok).toBe(false);
      expect(res.label).toBe('failed');
      expect(res.error?.code).toBe('INVALID_INPUT');
    });

    it('should reject empty title for create_family_task', async () => {
      const res = await CircleCareTools.create_family_task.execute(
        { title: '' },
        sarahCtx
      );
      expect(res.ok).toBe(false);
      expect(res.label).toBe('failed');
      expect(res.error?.code).toBe('INVALID_INPUT');
    });

    it('should reject title longer than 120 chars for create_family_task', async () => {
      const longTitle = 'A'.repeat(125);
      const res = await CircleCareTools.create_family_task.execute(
        { title: longTitle },
        sarahCtx
      );
      expect(res.ok).toBe(false);
      expect(res.label).toBe('failed');
    });
  });

  describe('FR-AI-005 & ADR-006: State-changing tools return pending action first', () => {
    it('create_family_task returns a pending action and does NOT immediately persist task', async () => {
      const initialTaskCount = store.getTasks('family-miller-1').length;

      const res = await CircleCareTools.create_family_task.execute(
        { title: 'Test Pending Task', priority: 'high' },
        sarahCtx
      );

      expect(res.ok).toBe(true);
      expect(res.label).toBe('pending_action');
      expect(res.data.pendingActionId).toBeDefined();
      expect(res.data.confirmationRequired).toBe(true);

      // Verify no task was written yet
      expect(store.getTasks('family-miller-1').length).toBe(initialTaskCount);

      // Verify pending action exists and expires in ~5 minutes
      const pending = store.getPendingAction(res.data.pendingActionId);
      expect(pending).toBeDefined();
      expect(pending?.status).toBe('pending');
      const expiry = new Date(pending!.expiresAt).getTime();
      expect(expiry - Date.now()).toBeGreaterThan(4 * 60 * 1000);

      // Confirm pending action
      const confirmed = store.confirmPendingAction(res.data.pendingActionId, sarahCtx.uid);
      expect(confirmed.success).toBe(true);
      expect(store.getTasks('family-miller-1').length).toBe(initialTaskCount + 1);
    });

    it('create_family_event returns pending action and flags conflicts', async () => {
      const today = new Date().toISOString().split('T')[0];
      // David is already booked between 14:00-15:00 and 14:30-16:00
      const res = await CircleCareTools.create_family_event.execute(
        {
          title: 'Emergency Doctor Visit',
          startAt: `${today}T14:15:00Z`,
          endAt: `${today}T15:15:00Z`,
          timeZone: 'America/New_York',
          attendeeIds: ['user-david-1']
        },
        sarahCtx
      );

      expect(res.ok).toBe(true);
      expect(res.label).toBe('pending_action');
      expect(res.data.conflicts.length).toBeGreaterThan(0);
      expect(res.data.conflicts[0]).toContain('Overlap detected');
    });
  });

  describe('Role-Based Access Control (FR-FAM-004, FR-TASK-002)', () => {
    it('Viewer (Leo) cannot create tasks', async () => {
      const res = await CircleCareTools.create_family_task.execute(
        { title: 'Leo trying to create task' },
        leoCtx
      );
      expect(res.ok).toBe(false);
      expect(res.error?.message).toContain('Permission denied');
    });

    it('Member (Emily) cannot edit tasks neither created by nor assigned to her', async () => {
      // task-101 was created by Sarah and assigned to David
      const res = await CircleCareTools.update_family_task.execute(
        {
          taskId: 'task-101',
          patch: { title: 'Emily changing David task' }
        },
        emilyCtx
      );
      expect(res.ok).toBe(false);
      expect(res.error?.message).toContain('Permission denied');
    });

    it('Member (Emily) CAN update tasks assigned to her', async () => {
      // task-102 is assigned to Emily
      const res = await CircleCareTools.update_family_task.execute(
        {
          taskId: 'task-102',
          patch: { status: 'done' },
          skipConfirmation: true
        },
        emilyCtx
      );
      expect(res.ok).toBe(true);
      expect(res.label).toBe('succeeded');
      expect(store.getTask('family-miller-1', 'task-102')?.status).toBe('done');
    });

    it('Admin (David) CAN update any family task', async () => {
      // task-104 is assigned to Sarah
      const res = await CircleCareTools.update_family_task.execute(
        {
          taskId: 'task-104',
          patch: { priority: 'high' },
          skipConfirmation: true
        },
        davidCtx
      );
      expect(res.ok).toBe(true);
      expect(res.label).toBe('succeeded');
    });
  });

  describe('Multi-Tenant Family Isolation (FR-FAM-007, FR-AI-004)', () => {
    it('Baker family owner cannot view Miller family tasks', async () => {
      const res = await CircleCareTools.get_family_tasks.execute({}, bakerCtx);
      expect(res.ok).toBe(true);
      // Baker family only has tasks belonging to family-baker-2 (currently 0)
      expect(res.data.count).toBe(0);

      // Ensure Miller tasks were not returned
      const titles = res.data.tasks.map((t: any) => t.title);
      expect(titles).not.toContain('Pick up prescription at CVS');
    });

    it('Assigning a task to someone outside the family fails', async () => {
      const res = await CircleCareTools.create_family_task.execute(
        {
          title: 'Cross family assignment attempt',
          assigneeId: 'user-baker-1' // Not in family-miller-1
        },
        sarahCtx
      );
      expect(res.ok).toBe(false);
      expect(res.error?.message).toContain('is not a member of this family');
    });
  });
});
