import {
  UserProfile,
  Family,
  FamilyMember,
  TaskItem,
  CalendarEvent,
  AppNotification,
  TaskHistoryEntry,
  PendingAction,
  AssistantMessage,
  ConsentPreferences
} from '../types/index.js';

const API_BASE = ''; // proxied via Vite to http://localhost:3001

export class CircleCareAPI {
  private static getToken(): string {
    return localStorage.getItem('circlecare_token') || 'demo-token-user-sarah-1';
  }

  private static getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    };
  }

  // Auth & Session
  static async getMe(): Promise<{ user: UserProfile; family: Family; role: any }> {
    const res = await fetch(`${API_BASE}/api/auth/me`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch session');
    return res.json();
  }

  static async switchUser(uid: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/auth/switch-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid })
    });
    if (!res.ok) throw new Error('Failed to switch user');
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('circlecare_token', data.token);
    }
    return data;
  }

  static async login(email: string, password: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to sign in');
    if (data.token) {
      localStorage.setItem('circlecare_token', data.token);
    }
    return data;
  }

  static async register(email: string, password: string, displayName: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to register');
    if (data.token) {
      localStorage.setItem('circlecare_token', data.token);
    }
    return data;
  }

  static async resetPassword(email: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return res.json();
  }

  static async deleteAccount(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/auth/delete-account`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete account');
    return data;
  }

  // Profile
  static async updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/api/profile`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(patch)
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  }

  // Family
  static async getFamily(): Promise<{ family: Family; members: FamilyMember[]; myRole: any }> {
    const res = await fetch(`${API_BASE}/api/family`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch family details');
    return res.json();
  }

  static async renameFamily(name: string): Promise<Family> {
    const res = await fetch(`${API_BASE}/api/family/rename`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error('Failed to rename family');
    return res.json();
  }

  static async transferOwnership(newOwnerUid: string): Promise<Family> {
    const res = await fetch(`${API_BASE}/api/family/transfer-ownership`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ newOwnerUid })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to transfer ownership');
    return data;
  }

  static async updateMemberRole(memberUid: string, role: string): Promise<FamilyMember> {
    const res = await fetch(`${API_BASE}/api/family/members/${memberUid}/role`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update member role');
    return data;
  }

  static async removeMember(memberUid: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/api/family/members/${memberUid}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to remove member');
    return data.success;
  }

  static async createInvitation(role = 'member'): Promise<any> {
    const res = await fetch(`${API_BASE}/api/invitations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ role })
    });
    if (!res.ok) throw new Error('Failed to generate invitation');
    return res.json();
  }

  static async redeemInvitation(code: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/invitations/redeem`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to redeem invitation');
    return data;
  }

  // Tasks
  static async getTasks(filters?: { status?: string; assigneeUid?: string; priority?: string; search?: string }): Promise<TaskItem[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assigneeUid) params.append('assigneeUid', filters.assigneeUid);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.search) params.append('search', filters.search);

    const res = await fetch(`${API_BASE}/api/tasks?${params.toString()}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  }

  static async createTask(task: Partial<TaskItem>): Promise<TaskItem> {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(task)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create task');
    return data;
  }

  static async updateTask(taskId: string, patch: Partial<TaskItem>): Promise<TaskItem> {
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(patch)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update task');
    return data;
  }

  static async deleteTask(taskId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete task');
    return data.success;
  }

  static async restoreTask(taskId: string): Promise<TaskItem> {
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}/restore`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to restore task');
    return data;
  }

  static async getTaskHistory(taskId: string): Promise<TaskHistoryEntry[]> {
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}/history`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch task history');
    return res.json();
  }

  // Events
  static async getEvents(): Promise<CalendarEvent[]> {
    const res = await fetch(`${API_BASE}/api/events`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  }

  static async createEvent(event: Partial<CalendarEvent>): Promise<{ event: CalendarEvent; conflicts: string[] }> {
    const res = await fetch(`${API_BASE}/api/events`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(event)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create event');
    return data;
  }

  static async updateEvent(eventId: string, patch: Partial<CalendarEvent>): Promise<{ event: CalendarEvent; conflicts: string[] }> {
    const res = await fetch(`${API_BASE}/api/events/${eventId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(patch)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update event');
    return data;
  }

  static async deleteEvent(eventId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/api/events/${eventId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete event');
    return data.success;
  }

  // Dashboard & Activity
  static async getDashboard(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/dashboard`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch dashboard data');
    return res.json();
  }

  // Notifications
  static async getNotifications(): Promise<AppNotification[]> {
    const res = await fetch(`${API_BASE}/api/notifications`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  }

  static async markNotificationRead(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: this.getHeaders()
    });
    return res.ok;
  }

  static async markAllNotificationsRead(): Promise<boolean> {
    const res = await fetch(`${API_BASE}/api/notifications/read-all`, {
      method: 'PUT',
      headers: this.getHeaders()
    });
    return res.ok;
  }

  // Consent & Privacy
  static async getConsent(): Promise<ConsentPreferences> {
    const res = await fetch(`${API_BASE}/api/consent`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch consent preferences');
    return res.json();
  }

  static async updateConsent(prefs: Partial<ConsentPreferences>): Promise<any> {
    const res = await fetch(`${API_BASE}/api/consent`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(prefs)
    });
    return res.json();
  }

  // AI Assistant Chat & Confirmations
  static async assistantChat(message: string): Promise<AssistantMessage> {
    const res = await fetch(`${API_BASE}/api/assistant/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ message })
    });
    const text = await res.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Unexpected non-JSON response from assistant (${res.status}): ${text.substring(0, 100)}`);
    }
    if (!res.ok) {
      if (data && data.content) {
        return data as AssistantMessage;
      }
      throw new Error(data?.error || data?.message || `Failed to communicate with assistant (status ${res.status})`);
    }
    return data;
  }

  static async confirmPendingAction(pendingActionId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/assistant/confirm`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ pendingActionId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to confirm action');
    return data;
  }

  static async rejectPendingAction(pendingActionId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/assistant/reject`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ pendingActionId })
    });
    return res.json();
  }

  // Reset demo
  static async resetDemoData(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/reset-demo`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    return res.json();
  }

  // MCP JSON-RPC Client Calls
  static async callMCP(method: string, params?: any, isNotification: boolean = false): Promise<any> {
    const payload: any = {
      jsonrpc: '2.0',
      method,
      params
    };
    if (!isNotification) {
      payload.id = Date.now();
    }
    const res = await fetch(`${API_BASE}/mcp`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.status === 204) {
      return { jsonrpc: '2.0', result: {} };
    }
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Invalid JSON response from MCP server (status ${res.status}): ${text.substring(0, 100)}`);
    }
  }
}
