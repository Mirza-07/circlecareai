import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  FamilyMember,
  TaskItem,
  CalendarEvent,
  AppNotification,
  TaskHistoryEntry
} from '../types/index.js';
import { CircleCareAPI } from '../lib/api.js';
import { useAuth } from './AuthContext.js';

interface FamilyContextType {
  members: FamilyMember[];
  tasks: TaskItem[];
  events: CalendarEvent[];
  notifications: AppNotification[];
  recentActivity: TaskHistoryEntry[];
  dashboardMetrics: any;
  loading: boolean;
  refreshData: () => Promise<void>;
  createTask: (data: Partial<TaskItem>) => Promise<TaskItem>;
  updateTask: (taskId: string, patch: Partial<TaskItem>) => Promise<TaskItem>;
  deleteTask: (taskId: string) => Promise<boolean>;
  restoreTask: (taskId: string) => Promise<TaskItem>;
  createEvent: (data: Partial<CalendarEvent>) => Promise<{ event: CalendarEvent; conflicts: string[] }>;
  updateEvent: (eventId: string, patch: Partial<CalendarEvent>) => Promise<{ event: CalendarEvent; conflicts: string[] }>;
  deleteEvent: (eventId: string) => Promise<boolean>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  resetDemo: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [recentActivity, setRecentActivity] = useState<TaskHistoryEntry[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>({
    dueToday: 0,
    pending: 0,
    overdue: 0,
    upcomingEventsCount: 0
  });
  const [loading, setLoading] = useState<boolean>(false);

  const refreshData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [famRes, dashRes, notifRes, evRes] = await Promise.all([
        CircleCareAPI.getFamily(),
        CircleCareAPI.getDashboard(),
        CircleCareAPI.getNotifications(),
        CircleCareAPI.getEvents()
      ]);

      setMembers(famRes.members || []);
      setDashboardMetrics(dashRes.metrics || {});
      setRecentActivity(dashRes.recentActivity || []);
      setNotifications(notifRes || []);
      setEvents(evRes || []);

      const taskList = await CircleCareAPI.getTasks();
      setTasks(taskList);
    } catch (err: any) {
      console.error('Error fetching family data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const createTask = async (data: Partial<TaskItem>) => {
    const newTask = await CircleCareAPI.createTask(data);
    await refreshData();
    return newTask;
  };

  const updateTask = async (taskId: string, patch: Partial<TaskItem>) => {
    const updated = await CircleCareAPI.updateTask(taskId, patch);
    await refreshData();
    return updated;
  };

  const deleteTask = async (taskId: string) => {
    const success = await CircleCareAPI.deleteTask(taskId);
    await refreshData();
    return success;
  };

  const restoreTask = async (taskId: string) => {
    const restored = await CircleCareAPI.restoreTask(taskId);
    await refreshData();
    return restored;
  };

  const createEvent = async (data: Partial<CalendarEvent>) => {
    const res = await CircleCareAPI.createEvent(data);
    await refreshData();
    return res;
  };

  const updateEvent = async (eventId: string, patch: Partial<CalendarEvent>) => {
    const res = await CircleCareAPI.updateEvent(eventId, patch);
    await refreshData();
    return res;
  };

  const deleteEvent = async (eventId: string) => {
    const success = await CircleCareAPI.deleteEvent(eventId);
    await refreshData();
    return success;
  };

  const markNotificationRead = async (id: string) => {
    await CircleCareAPI.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = async () => {
    await CircleCareAPI.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const resetDemo = async () => {
    await CircleCareAPI.resetDemoData();
    await refreshData();
  };

  return (
    <FamilyContext.Provider
      value={{
        members,
        tasks,
        events,
        notifications,
        recentActivity,
        dashboardMetrics,
        loading,
        refreshData,
        createTask,
        updateTask,
        deleteTask,
        restoreTask,
        createEvent,
        updateEvent,
        deleteEvent,
        markNotificationRead,
        markAllNotificationsRead,
        resetDemo
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
};
