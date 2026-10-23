import {
  Family,
  FamilyMember,
  TaskItem,
  CalendarEvent,
  TaskHistoryEntry,
  FamilyInvitation,
  AppNotification,
  PendingAction,
  UserProfile,
  FamilyRole
} from '../src/types/index.js';

// In-Memory live data store with realistic seed data for Hackathon Demo (Journey C)
// Can be synced with Firestore or used directly for standalone zero-friction judging
export class CircleCareDataStore {
  private users: Map<string, UserProfile> = new Map();
  private families: Map<string, Family> = new Map();
  private members: Map<string, Map<string, FamilyMember>> = new Map(); // familyId -> (uid -> member)
  private tasks: Map<string, Map<string, TaskItem>> = new Map(); // familyId -> (taskId -> task)
  private taskHistory: Map<string, TaskHistoryEntry[]> = new Map(); // taskId -> history[]
  private events: Map<string, Map<string, CalendarEvent>> = new Map(); // familyId -> (eventId -> event)
  private invitations: Map<string, Map<string, FamilyInvitation>> = new Map(); // familyId -> (inviteId -> invite)
  private notifications: Map<string, AppNotification[]> = new Map(); // uid -> notifications[]
  private pendingActions: Map<string, PendingAction> = new Map(); // pendingActionId -> pendingAction
  private conversationHistory: Map<string, any[]> = new Map(); // uid -> conversations[]
  private userConsent: Map<string, { analytics: boolean; aiHistory: boolean; functional: boolean }> = new Map();

  constructor() {
    this.seedInitialData();
  }

  public seedInitialData() {
    this.users.clear();
    this.families.clear();
    this.members.clear();
    this.tasks.clear();
    this.taskHistory.clear();
    this.events.clear();
    this.invitations.clear();
    this.notifications.clear();
    this.pendingActions.clear();

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Seed Users for Family Miller
    const sarah: UserProfile = {
      uid: 'user-sarah-1',
      displayName: 'Sarah Miller',
      email: 'sarah.miller@circlecare.example.com',
      timeZone: 'America/New_York',
      activeFamilyId: 'family-miller-1',
      notificationPrefs: { taskAssigned: true, dueSoon: true, overdue: true, eventReminders: true }
    };
    const david: UserProfile = {
      uid: 'user-david-1',
      displayName: 'David Miller',
      email: 'david.miller@circlecare.example.com',
      timeZone: 'America/New_York',
      activeFamilyId: 'family-miller-1',
      notificationPrefs: { taskAssigned: true, dueSoon: true, overdue: true, eventReminders: true }
    };
    const emily: UserProfile = {
      uid: 'user-emily-1',
      displayName: 'Emily Miller',
      email: 'emily.miller@circlecare.example.com',
      timeZone: 'America/New_York',
      activeFamilyId: 'family-miller-1',
      notificationPrefs: { taskAssigned: true, dueSoon: true, overdue: false, eventReminders: true }
    };
    const leo: UserProfile = {
      uid: 'user-leo-1',
      displayName: 'Leo Miller',
      email: 'leo.miller@circlecare.example.com',
      timeZone: 'America/New_York',
      activeFamilyId: 'family-miller-1',
      notificationPrefs: { taskAssigned: true, dueSoon: false, overdue: false, eventReminders: true }
    };

    // User for Family Baker (Cross-family isolation test)
    const bob: UserProfile = {
      uid: 'user-baker-1',
      displayName: 'Bob Baker',
      email: 'bob.baker@circlecare.example.com',
      timeZone: 'America/Chicago',
      activeFamilyId: 'family-baker-2',
      notificationPrefs: { taskAssigned: true, dueSoon: true, overdue: true, eventReminders: true }
    };

    [sarah, david, emily, leo, bob].forEach(u => this.users.set(u.uid, u));

    // Seed Families
    const millerFamily: Family = {
      familyId: 'family-miller-1',
      name: 'The Miller Family',
      ownerUid: sarah.uid,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    };
    const bakerFamily: Family = {
      familyId: 'family-baker-2',
      name: 'The Baker Family',
      ownerUid: bob.uid,
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
    };

    this.families.set(millerFamily.familyId, millerFamily);
    this.families.set(bakerFamily.familyId, bakerFamily);

    // Seed Family Members
    const millerMembers = new Map<string, FamilyMember>();
    millerMembers.set(sarah.uid, {
      familyId: millerFamily.familyId,
      uid: sarah.uid,
      displayName: sarah.displayName,
      email: sarah.email,
      role: 'owner',
      joinedAt: millerFamily.createdAt
    });
    millerMembers.set(david.uid, {
      familyId: millerFamily.familyId,
      uid: david.uid,
      displayName: david.displayName,
      email: david.email,
      role: 'admin',
      joinedAt: millerFamily.createdAt
    });
    millerMembers.set(emily.uid, {
      familyId: millerFamily.familyId,
      uid: emily.uid,
      displayName: emily.displayName,
      email: emily.email,
      role: 'member',
      joinedAt: millerFamily.createdAt
    });
    millerMembers.set(leo.uid, {
      familyId: millerFamily.familyId,
      uid: leo.uid,
      displayName: leo.displayName,
      email: leo.email,
      role: 'viewer',
      joinedAt: millerFamily.createdAt
    });
    this.members.set(millerFamily.familyId, millerMembers);

    const bakerMembers = new Map<string, FamilyMember>();
    bakerMembers.set(bob.uid, {
      familyId: bakerFamily.familyId,
      uid: bob.uid,
      displayName: bob.displayName,
      email: bob.email,
      role: 'owner',
      joinedAt: bakerFamily.createdAt
    });
    this.members.set(bakerFamily.familyId, bakerMembers);

    // Seed Tasks for Miller family
    const millerTasks = new Map<string, TaskItem>();

    const task1: TaskItem = {
      taskId: 'task-101',
      familyId: millerFamily.familyId,
      title: 'Pick up prescription at CVS',
      notes: 'Refill #49281 under David. Bring photo ID.',
      assigneeUid: david.uid,
      status: 'open',
      priority: 'high',
      dueAt: new Date(now.getTime() + 4 * 3600000).toISOString(), // today
      createdAt: new Date(now.getTime() - 24 * 3600000).toISOString(),
      createdBy: sarah.uid
    };

    const task2: TaskItem = {
      taskId: 'task-102',
      familyId: millerFamily.familyId,
      title: 'Math project poster board',
      notes: 'Need glue sticks and trifold cardboard before 5 PM.',
      assigneeUid: emily.uid,
      status: 'in_progress',
      priority: 'normal',
      dueAt: new Date(now.getTime() + 6 * 3600000).toISOString(), // today
      createdAt: new Date(now.getTime() - 12 * 3600000).toISOString(),
      createdBy: david.uid
    };

    const task3: TaskItem = {
      taskId: 'task-103',
      familyId: millerFamily.familyId,
      title: 'Feed and walk Buster the dog',
      notes: 'Evening 20-min loop around Maple Park.',
      assigneeUid: leo.uid,
      status: 'done',
      priority: 'normal',
      dueAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
      createdAt: new Date(now.getTime() - 8 * 3600000).toISOString(),
      createdBy: sarah.uid,
      completedAt: new Date(now.getTime() - 1 * 3600000).toISOString(),
      completedBy: leo.uid
    };

    const task4: TaskItem = {
      taskId: 'task-104',
      familyId: millerFamily.familyId,
      title: 'Schedule yearly dental checkups',
      notes: 'Call Dr. Hernandez office for Emily and Leo.',
      assigneeUid: sarah.uid,
      status: 'open',
      priority: 'normal',
      dueAt: new Date(now.getTime() - 24 * 3600000).toISOString(), // overdue
      createdAt: new Date(now.getTime() - 48 * 3600000).toISOString(),
      createdBy: sarah.uid
    };

    const task5: TaskItem = {
      taskId: 'task-105',
      familyId: millerFamily.familyId,
      title: 'Weekly family grocery haul',
      notes: 'Eggs, almond milk, sourdough, fresh apples, chicken breast.',
      assigneeUid: david.uid,
      status: 'open',
      priority: 'normal',
      dueAt: new Date(now.getTime() + 26 * 3600000).toISOString(), // tomorrow
      createdAt: new Date(now.getTime() - 6 * 3600000).toISOString(),
      createdBy: david.uid
    };

    [task1, task2, task3, task4, task5].forEach(t => {
      millerTasks.set(t.taskId, t);
      this.taskHistory.set(t.taskId, [
        {
          id: `hist-${t.taskId}-init`,
          taskId: t.taskId,
          actorUid: t.createdBy,
          actorName: this.users.get(t.createdBy)?.displayName || 'System',
          change: `Created task "${t.title}" (Priority: ${t.priority})`,
          at: t.createdAt
        }
      ]);
    });

    this.tasks.set(millerFamily.familyId, millerTasks);

    // Seed Events for Miller family (with conflict for David between 14:30 and 15:00)
    const millerEvents = new Map<string, CalendarEvent>();

    const event1: CalendarEvent = {
      eventId: 'event-201',
      familyId: millerFamily.familyId,
      title: 'Dentist Appointment (Emily)',
      startAt: `${todayStr}T14:00:00Z`,
      endAt: `${todayStr}T15:00:00Z`,
      timeZone: 'America/New_York',
      createdBy: sarah.uid,
      attendeeIds: [emily.uid, david.uid],
      notes: 'Dr. Hernandez suite 302. David driving Emily.'
    };

    const event2: CalendarEvent = {
      eventId: 'event-202',
      familyId: millerFamily.familyId,
      title: 'Soccer Practice (Leo)',
      startAt: `${todayStr}T14:30:00Z`,
      endAt: `${todayStr}T16:00:00Z`,
      timeZone: 'America/New_York',
      createdBy: david.uid,
      attendeeIds: [leo.uid, david.uid], // Overlaps with David on event-201!
      notes: 'Memorial Field 4. Bring shin guards and water bottle.'
    };

    const tomorrow = new Date(now.getTime() + 24 * 3600000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const event3: CalendarEvent = {
      eventId: 'event-203',
      familyId: millerFamily.familyId,
      title: 'Family Dinner & Game Night',
      startAt: `${tomorrowStr}T18:30:00Z`,
      endAt: `${tomorrowStr}T20:30:00Z`,
      timeZone: 'America/New_York',
      createdBy: sarah.uid,
      attendeeIds: [sarah.uid, david.uid, emily.uid, leo.uid],
      notes: 'Homemade pizza and Catan.'
    };

    [event1, event2, event3].forEach(e => millerEvents.set(e.eventId, e));
    this.events.set(millerFamily.familyId, millerEvents);

    // Seed Invitations
    const millerInvites = new Map<string, FamilyInvitation>();
    const activeInvite: FamilyInvitation = {
      inviteId: 'inv-301',
      familyId: millerFamily.familyId,
      familyName: millerFamily.name,
      code: 'MILLER2026',
      role: 'member',
      expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
      status: 'active',
      createdBy: sarah.uid
    };
    millerInvites.set(activeInvite.inviteId, activeInvite);
    this.invitations.set(millerFamily.familyId, millerInvites);

    // Seed Notifications for David and Emily
    this.notifications.set(david.uid, [
      {
        id: 'notif-1',
        uid: david.uid,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: 'Sarah assigned "Pick up prescription at CVS" to you.',
        refPath: `/tasks?id=${task1.taskId}`,
        createdAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
        read: false
      },
      {
        id: 'notif-2',
        uid: david.uid,
        type: 'event_reminder',
        title: 'Upcoming Schedule Conflict',
        message: 'Notice: "Dentist Appointment" overlaps with "Soccer Practice (Leo)".',
        refPath: '/calendar',
        createdAt: new Date(now.getTime() - 1 * 3600000).toISOString(),
        read: false
      }
    ]);

    this.notifications.set(sarah.uid, [
      {
        id: 'notif-3',
        uid: sarah.uid,
        type: 'overdue',
        title: 'Task Overdue',
        message: 'Task "Schedule yearly dental checkups" was due yesterday.',
        refPath: `/tasks?id=${task4.taskId}`,
        createdAt: new Date(now.getTime() - 10 * 3600000).toISOString(),
        read: true,
        readAt: new Date(now.getTime() - 8 * 3600000).toISOString()
      }
    ]);
  }

  // User management
  public getUser(uid: string): UserProfile | undefined {
    return this.users.get(uid);
  }

  public upsertUser(user: UserProfile): UserProfile {
    this.users.set(user.uid, user);
    return user;
  }

  public deleteUser(uid: string): boolean {
    // Check if user is sole owner of any family
    for (const [, fam] of this.families) {
      if (fam.ownerUid === uid) {
        const members = this.getMembers(fam.familyId);
        const otherAdult = members.find(m => m.uid !== uid && (m.role === 'admin' || m.role === 'member'));
        if (!otherAdult) {
          throw new Error('Cannot delete account: You are the sole owner of a family. Please transfer ownership or delete the family first.');
        }
      }
    }
    this.users.delete(uid);
    this.notifications.delete(uid);
    this.conversationHistory.delete(uid);
    return true;
  }

  // Family queries
  public getFamily(familyId: string): Family | undefined {
    return this.families.get(familyId);
  }

  public createFamily(name: string, ownerUid: string): Family {
    const familyId = `family-${Date.now()}`;
    const family: Family = {
      familyId,
      name,
      ownerUid,
      createdAt: new Date().toISOString()
    };
    this.families.set(familyId, family);

    const user = this.getUser(ownerUid);
    const memberMap = new Map<string, FamilyMember>();
    const member: FamilyMember = {
      familyId,
      uid: ownerUid,
      displayName: user?.displayName || 'Family Creator',
      email: user?.email || '',
      role: 'owner',
      joinedAt: family.createdAt
    };
    memberMap.set(ownerUid, member);
    this.members.set(familyId, memberMap);

    if (user) {
      user.activeFamilyId = familyId;
      this.upsertUser(user);
    }
    return family;
  }

  public updateFamilyName(familyId: string, name: string): Family {
    const fam = this.families.get(familyId);
    if (!fam) throw new Error('Family not found');
    fam.name = name;
    return fam;
  }

  public transferOwnership(familyId: string, newOwnerUid: string): Family {
    const fam = this.families.get(familyId);
    if (!fam) throw new Error('Family not found');
    const members = this.members.get(familyId);
    if (!members || !members.has(newOwnerUid)) {
      throw new Error('Target user is not a member of this family');
    }
    const oldOwner = members.get(fam.ownerUid);
    const newOwner = members.get(newOwnerUid);
    if (oldOwner) oldOwner.role = 'admin';
    if (newOwner) newOwner.role = 'owner';
    fam.ownerUid = newOwnerUid;
    return fam;
  }

  public getMembers(familyId: string): FamilyMember[] {
    const map = this.members.get(familyId);
    return map ? Array.from(map.values()) : [];
  }

  public getMember(familyId: string, uid: string): FamilyMember | undefined {
    return this.members.get(familyId)?.get(uid);
  }

  public updateMemberRole(familyId: string, targetUid: string, role: FamilyRole): FamilyMember {
    const member = this.getMember(familyId, targetUid);
    if (!member) throw new Error('Member not found');
    member.role = role;
    return member;
  }

  public removeMember(familyId: string, targetUid: string): boolean {
    const fam = this.families.get(familyId);
    if (fam && fam.ownerUid === targetUid) {
      throw new Error('Cannot remove the family owner. Transfer ownership first.');
    }
    const map = this.members.get(familyId);
    if (map) {
      return map.delete(targetUid);
    }
    return false;
  }

  // Invitations
  public createInvitation(familyId: string, createdBy: string, role: FamilyRole = 'member'): FamilyInvitation {
    const fam = this.families.get(familyId);
    if (!fam) throw new Error('Family not found');

    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const code = `${fam.name.replace(/[^a-zA-Z]/g, '').substring(0, 5).toUpperCase()}-${randomSuffix}`;
    const invite: FamilyInvitation = {
      inviteId: `inv-${Date.now()}`,
      familyId,
      familyName: fam.name,
      code,
      role,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'active',
      createdBy
    };

    if (!this.invitations.has(familyId)) {
      this.invitations.set(familyId, new Map());
    }
    this.invitations.get(familyId)!.set(invite.inviteId, invite);
    return invite;
  }

  public redeemInvitation(code: string, user: UserProfile): { family: Family; member: FamilyMember } {
    let foundInvite: FamilyInvitation | null = null;

    for (const [, inviteMap] of this.invitations) {
      for (const [, inv] of inviteMap) {
        if (inv.code.toUpperCase() === code.trim().toUpperCase()) {
          foundInvite = inv;
          break;
        }
      }
      if (foundInvite) break;
    }

    if (!foundInvite) {
      throw new Error('Invalid or expired invitation code.');
    }

    if (foundInvite.status !== 'active') {
      throw new Error('This invitation has already been used or revoked.');
    }

    if (new Date(foundInvite.expiresAt).getTime() < Date.now()) {
      foundInvite.status = 'revoked';
      throw new Error('This invitation code has expired.');
    }

    foundInvite.status = 'used';
    const fam = this.getFamily(foundInvite.familyId);
    if (!fam) throw new Error('Family not found');

    const member: FamilyMember = {
      familyId: fam.familyId,
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      role: foundInvite.role,
      joinedAt: new Date().toISOString()
    };

    if (!this.members.has(fam.familyId)) {
      this.members.set(fam.familyId, new Map());
    }
    this.members.get(fam.familyId)!.set(user.uid, member);

    user.activeFamilyId = fam.familyId;
    this.upsertUser(user);

    return { family: fam, member };
  }

  // Tasks
  public getTasks(familyId: string, includeDeleted = false): TaskItem[] {
    const map = this.tasks.get(familyId);
    if (!map) return [];
    const list = Array.from(map.values());
    if (includeDeleted) return list;
    return list.filter(t => !t.deletedAt);
  }

  public getTask(familyId: string, taskId: string): TaskItem | undefined {
    return this.tasks.get(familyId)?.get(taskId);
  }

  public createTask(familyId: string, actorUid: string, data: Partial<TaskItem>): TaskItem {
    const taskId = `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const task: TaskItem = {
      taskId,
      familyId,
      title: data.title || 'Untitled Task',
      notes: data.notes || '',
      assigneeUid: data.assigneeUid,
      status: data.status || 'open',
      priority: data.priority || 'normal',
      dueAt: data.dueAt,
      createdAt: new Date().toISOString(),
      createdBy: actorUid,
      deletedAt: null
    };

    if (!this.tasks.has(familyId)) {
      this.tasks.set(familyId, new Map());
    }
    this.tasks.get(familyId)!.set(taskId, task);

    const actor = this.getUser(actorUid);
    const historyEntry: TaskHistoryEntry = {
      id: `hist-${Date.now()}`,
      taskId,
      actorUid,
      actorName: actor?.displayName || 'User',
      change: `Created task "${task.title}" (Priority: ${task.priority})`,
      at: task.createdAt
    };
    this.taskHistory.set(taskId, [historyEntry]);

    // Send in-app notification if assigned to another user
    if (task.assigneeUid && task.assigneeUid !== actorUid) {
      this.addNotification(task.assigneeUid, {
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `${actor?.displayName || 'A family member'} assigned "${task.title}" to you.`,
        refPath: `/tasks?id=${task.taskId}`
      });
    }

    return task;
  }

  public updateTask(
    familyId: string,
    taskId: string,
    actorUid: string,
    patch: Partial<TaskItem>
  ): TaskItem {
    const task = this.getTask(familyId, taskId);
    if (!task) throw new Error('Task not found');

    const actor = this.getUser(actorUid);
    const changes: string[] = [];

    if (patch.title !== undefined && patch.title !== task.title) {
      changes.push(`Title changed to "${patch.title}"`);
      task.title = patch.title;
    }
    if (patch.notes !== undefined && patch.notes !== task.notes) {
      changes.push(`Notes updated`);
      task.notes = patch.notes;
    }
    if (patch.priority !== undefined && patch.priority !== task.priority) {
      changes.push(`Priority changed to ${patch.priority}`);
      task.priority = patch.priority;
    }
    if (patch.dueAt !== undefined && patch.dueAt !== task.dueAt) {
      changes.push(`Due date updated`);
      task.dueAt = patch.dueAt;
    }
    if (patch.assigneeUid !== undefined && patch.assigneeUid !== task.assigneeUid) {
      const newAssignee = patch.assigneeUid ? this.getUser(patch.assigneeUid)?.displayName : 'Unassigned';
      changes.push(`Assignee changed to ${newAssignee}`);
      task.assigneeUid = patch.assigneeUid;

      if (patch.assigneeUid && patch.assigneeUid !== actorUid) {
        this.addNotification(patch.assigneeUid, {
          type: 'task_assigned',
          title: 'Task Reassigned',
          message: `${actor?.displayName || 'Someone'} assigned "${task.title}" to you.`,
          refPath: `/tasks?id=${task.taskId}`
        });
      }
    }
    if (patch.status !== undefined && patch.status !== task.status) {
      changes.push(`Status changed from ${task.status} to ${patch.status}`);
      task.status = patch.status;
      if (patch.status === 'done') {
        task.completedAt = new Date().toISOString();
        task.completedBy = actorUid;
      } else {
        task.completedAt = undefined;
        task.completedBy = undefined;
      }
    }

    if (changes.length > 0) {
      const historyList = this.taskHistory.get(taskId) || [];
      historyList.push({
        id: `hist-${Date.now()}`,
        taskId,
        actorUid,
        actorName: actor?.displayName || 'User',
        change: changes.join(', '),
        at: new Date().toISOString()
      });
      this.taskHistory.set(taskId, historyList);
    }

    return task;
  }

  public softDeleteTask(familyId: string, taskId: string, actorUid: string): boolean {
    const task = this.getTask(familyId, taskId);
    if (!task) return false;
    task.deletedAt = new Date().toISOString();

    const actor = this.getUser(actorUid);
    const historyList = this.taskHistory.get(taskId) || [];
    historyList.push({
      id: `hist-${Date.now()}`,
      taskId,
      actorUid,
      actorName: actor?.displayName || 'User',
      change: 'Soft-deleted task (retainable for 30 days)',
      at: task.deletedAt
    });
    return true;
  }

  public restoreTask(familyId: string, taskId: string, actorUid: string): TaskItem {
    const task = this.getTask(familyId, taskId);
    if (!task) throw new Error('Task not found');
    task.deletedAt = null;

    const actor = this.getUser(actorUid);
    const historyList = this.taskHistory.get(taskId) || [];
    historyList.push({
      id: `hist-${Date.now()}`,
      taskId,
      actorUid,
      actorName: actor?.displayName || 'User',
      change: 'Restored soft-deleted task',
      at: new Date().toISOString()
    });
    return task;
  }

  public getTaskHistory(taskId: string): TaskHistoryEntry[] {
    return this.taskHistory.get(taskId) || [];
  }

  // Calendar Events
  public getEvents(familyId: string): CalendarEvent[] {
    const map = this.events.get(familyId);
    return map ? Array.from(map.values()) : [];
  }

  public getEvent(familyId: string, eventId: string): CalendarEvent | undefined {
    return this.events.get(familyId)?.get(eventId);
  }

  public findConflicts(
    familyId: string,
    startAt: string,
    endAt: string,
    attendeeIds: string[],
    excludeEventId?: string
  ): { event: CalendarEvent; overlappingAttendeeIds: string[] }[] {
    const events = this.getEvents(familyId);
    const newStart = new Date(startAt).getTime();
    const newEnd = new Date(endAt).getTime();
    const conflicts: { event: CalendarEvent; overlappingAttendeeIds: string[] }[] = [];

    for (const ev of events) {
      if (excludeEventId && ev.eventId === excludeEventId) continue;
      const evStart = new Date(ev.startAt).getTime();
      const evEnd = new Date(ev.endAt).getTime();

      // Check time overlap: (start1 < end2) && (end1 > start2)
      const hasTimeOverlap = newStart < evEnd && newEnd > evStart;
      if (hasTimeOverlap) {
        const sharedAttendees = ev.attendeeIds.filter(id => attendeeIds.includes(id));
        if (sharedAttendees.length > 0) {
          conflicts.push({
            event: ev,
            overlappingAttendeeIds: sharedAttendees
          });
        }
      }
    }
    return conflicts;
  }

  public createEvent(
    familyId: string,
    actorUid: string,
    data: {
      title: string;
      startAt: string;
      endAt: string;
      timeZone: string;
      attendeeIds?: string[];
      notes?: string;
      recurrence?: 'none' | 'daily' | 'weekly';
      reminderMinutes?: number;
    }
  ): { event: CalendarEvent; conflicts: string[] } {
    if (new Date(data.endAt).getTime() < new Date(data.startAt).getTime()) {
      throw new Error('Event end time cannot be before start time');
    }

    const attendeeIds = data.attendeeIds || [actorUid];
    const detectedConflicts = this.findConflicts(familyId, data.startAt, data.endAt, attendeeIds);

    const eventId = `event-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const event: CalendarEvent = {
      eventId,
      familyId,
      title: data.title,
      startAt: data.startAt,
      endAt: data.endAt,
      timeZone: data.timeZone || 'UTC',
      createdBy: actorUid,
      attendeeIds,
      notes: data.notes || '',
      recurrence: data.recurrence || 'none',
      reminderMinutes: data.reminderMinutes || 30
    };

    if (!this.events.has(familyId)) {
      this.events.set(familyId, new Map());
    }
    this.events.get(familyId)!.set(eventId, event);

    const conflictSummaries = detectedConflicts.map(c => {
      const names = c.overlappingAttendeeIds
        .map(id => this.getUser(id)?.displayName || id)
        .join(', ');
      return `Warning: ${names} is already booked for "${c.event.title}" (${new Date(c.event.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(c.event.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    });

    return { event, conflicts: conflictSummaries };
  }

  public updateEvent(
    familyId: string,
    eventId: string,
    patch: Partial<CalendarEvent>
  ): { event: CalendarEvent; conflicts: string[] } {
    const event = this.getEvent(familyId, eventId);
    if (!event) throw new Error('Event not found');

    const updated = { ...event, ...patch };
    if (new Date(updated.endAt).getTime() < new Date(updated.startAt).getTime()) {
      throw new Error('Event end time cannot be before start time');
    }

    const conflicts = this.findConflicts(
      familyId,
      updated.startAt,
      updated.endAt,
      updated.attendeeIds,
      eventId
    ).map(c => `Warning: Attendee conflict with "${c.event.title}"`);

    this.events.get(familyId)!.set(eventId, updated);
    return { event: updated, conflicts };
  }

  public deleteEvent(familyId: string, eventId: string): boolean {
    return this.events.get(familyId)?.delete(eventId) || false;
  }

  // Pending Actions (FR-AI-005, ADR-006)
  public createPendingAction(
    familyId: string,
    uid: string,
    toolName: 'create_family_task' | 'update_family_task' | 'create_family_event',
    params: Record<string, any>,
    description: string,
    conflicts?: string[]
  ): PendingAction {
    const id = `action-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const pendingAction: PendingAction = {
      id,
      familyId,
      uid,
      toolName,
      params,
      description,
      conflicts,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes expiration per FR-AI-005
      status: 'pending'
    };
    this.pendingActions.set(id, pendingAction);
    return pendingAction;
  }

  public getPendingAction(id: string): PendingAction | undefined {
    const action = this.pendingActions.get(id);
    if (!action) return undefined;
    if (action.status === 'pending' && new Date(action.expiresAt).getTime() < Date.now()) {
      action.status = 'expired';
    }
    return action;
  }

  public confirmPendingAction(id: string, uid: string): { success: boolean; result: any } {
    const action = this.getPendingAction(id);
    if (!action) throw new Error('Pending action not found');
    if (action.status !== 'pending') throw new Error(`Action is already ${action.status}`);

    action.status = 'confirmed';
    let result: any = null;

    if (action.toolName === 'create_family_task') {
      result = this.createTask(action.familyId, uid, action.params);
    } else if (action.toolName === 'update_family_task') {
      result = this.updateTask(action.familyId, action.params.taskId, uid, action.params.patch);
    } else if (action.toolName === 'create_family_event') {
      result = this.createEvent(action.familyId, uid, action.params as any);
    }

    return { success: true, result };
  }

  public rejectPendingAction(id: string): boolean {
    const action = this.getPendingAction(id);
    if (!action) return false;
    action.status = 'rejected';
    return true;
  }

  // Notifications
  public getNotifications(uid: string): AppNotification[] {
    return this.notifications.get(uid) || [];
  }

  public addNotification(uid: string, notif: Omit<AppNotification, 'id' | 'uid' | 'createdAt' | 'read'>): AppNotification {
    const user = this.getUser(uid);
    // Check if user has muted this category
    if (user?.notificationPrefs) {
      if (notif.type === 'task_assigned' && !user.notificationPrefs.taskAssigned) return {} as any;
      if (notif.type === 'due_soon' && !user.notificationPrefs.dueSoon) return {} as any;
      if (notif.type === 'overdue' && !user.notificationPrefs.overdue) return {} as any;
      if (notif.type === 'event_reminder' && !user.notificationPrefs.eventReminders) return {} as any;
    }

    const item: AppNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      uid,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      refPath: notif.refPath,
      createdAt: new Date().toISOString(),
      read: false
    };

    const list = this.notifications.get(uid) || [];
    list.unshift(item);
    this.notifications.set(uid, list);
    return item;
  }

  public markNotificationAsRead(uid: string, notificationId: string): boolean {
    const list = this.notifications.get(uid);
    if (!list) return false;
    const found = list.find(n => n.id === notificationId);
    if (found) {
      found.read = true;
      found.readAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  public markAllNotificationsAsRead(uid: string): void {
    const list = this.notifications.get(uid);
    if (list) {
      const now = new Date().toISOString();
      list.forEach(n => {
        n.read = true;
        n.readAt = now;
      });
    }
  }

  // Activity Log (DASH-002: 10 most recent entries)
  public getRecentActivity(familyId: string, limit = 10): TaskHistoryEntry[] {
    const allHistory: TaskHistoryEntry[] = [];
    const tasks = this.getTasks(familyId, true);
    for (const t of tasks) {
      const hist = this.taskHistory.get(t.taskId) || [];
      allHistory.push(...hist);
    }
    allHistory.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return allHistory.slice(0, limit);
  }

  // Conversation history opt-in
  public getConversationHistory(uid: string): any[] {
    return this.conversationHistory.get(uid) || [];
  }

  public saveConversationMessage(uid: string, message: any): void {
    const consent = this.userConsent.get(uid);
    if (!consent?.aiHistory) return; // Opted-out: do not store!

    const list = this.conversationHistory.get(uid) || [];
    list.push(message);
    this.conversationHistory.set(uid, list);
  }

  public setConsentPreferences(uid: string, prefs: { analytics: boolean; aiHistory: boolean; functional: boolean }): void {
    this.userConsent.set(uid, prefs);
    if (!prefs.aiHistory) {
      this.conversationHistory.delete(uid); // delete on opt-out per Section 25
    }
  }

  public getConsentPreferences(uid: string): { analytics: boolean; aiHistory: boolean; functional: boolean } {
    return this.userConsent.get(uid) || { analytics: false, aiHistory: false, functional: true };
  }
}

// Global singleton data store
export const store = new CircleCareDataStore();
