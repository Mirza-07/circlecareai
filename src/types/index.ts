export type FamilyRole = 'owner' | 'admin' | 'member' | 'viewer';

export type TaskPriority = 'low' | 'normal' | 'high';
export type TaskStatus = 'open' | 'in_progress' | 'done';

export interface NotificationPreferences {
  taskAssigned: boolean;
  dueSoon: boolean;
  overdue: boolean;
  eventReminders: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  timeZone: string;
  activeFamilyId?: string;
  notificationPrefs: NotificationPreferences;
  createdAt?: string;
  updatedAt?: string;
}

export interface Family {
  familyId: string;
  name: string;
  ownerUid: string;
  createdAt: string;
}

export interface FamilyMember {
  familyId: string;
  uid: string;
  displayName: string;
  email: string;
  role: FamilyRole;
  joinedAt: string;
  avatarUrl?: string;
}

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  actorUid: string;
  actorName: string;
  change: string;
  at: string;
}

export interface TaskItem {
  taskId: string;
  familyId: string;
  title: string;
  notes?: string;
  assigneeUid?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string; // ISO string
  createdAt: string;
  createdBy: string;
  completedAt?: string;
  completedBy?: string;
  deletedAt?: string | null; // soft-delete timestamp (FR-TASK-008)
}

export interface CalendarEvent {
  eventId: string;
  familyId: string;
  title: string;
  startAt: string; // ISO string
  endAt: string; // ISO string
  timeZone: string;
  createdBy: string;
  attendeeIds: string[];
  attendeeUids?: string[];
  notes?: string;
  recurrence?: 'none' | 'daily' | 'weekly';
  reminderMinutes?: number;
}

export interface FamilyInvitation {
  inviteId: string;
  familyId: string;
  familyName: string;
  code: string;
  role: FamilyRole;
  expiresAt: string; // ISO string
  status: 'active' | 'used' | 'revoked';
  createdBy: string;
}

export type NotificationType = 'task_assigned' | 'due_soon' | 'overdue' | 'event_reminder';

export interface AppNotification {
  id: string;
  uid: string;
  type: NotificationType;
  title: string;
  message: string;
  refPath?: string;
  createdAt: string;
  read: boolean;
  readAt?: string;
}

export type AssistantResponseLabel = 'suggestion' | 'pending_action' | 'succeeded' | 'failed';

export interface PendingAction {
  id: string;
  familyId: string;
  uid: string;
  toolName: 'create_family_task' | 'update_family_task' | 'create_family_event';
  params: Record<string, any>;
  description: string;
  conflicts?: string[];
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'expired';
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  label?: AssistantResponseLabel;
  timestamp: string;
  pendingAction?: PendingAction;
  data?: any;
}

export interface ConsentPreferences {
  analytics: boolean;
  aiHistory: boolean;
  functional: boolean;
  updatedAt: string;
}
