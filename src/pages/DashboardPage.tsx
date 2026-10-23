import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useFamily } from '../context/FamilyContext.js';
import {
  Calendar,
  CheckSquare,
  Clock,
  AlertCircle,
  Plus,
  Users,
  Radio,
  ArrowRight,
  Sparkles,
  History,
  CheckCircle2
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (route: string) => void;
  onOpenAssistant: () => void;
}

export const DashboardPage: React.FC<DashboardProps> = ({ onNavigate, onOpenAssistant }) => {
  const { user, role, family } = useAuth();
  const { tasks, events, dashboardMetrics, recentActivity, updateTask } = useFamily();

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const dueTodayTasks = tasks.filter(t => t.status !== 'done' && t.dueAt && t.dueAt.substring(0, 10) === todayStr);
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.dueAt && new Date(t.dueAt).getTime() < now.getTime() && t.dueAt.substring(0, 10) !== todayStr);
  const pendingTasks = tasks.filter(t => t.status !== 'done');

  const next7Days = new Date(now.getTime() + 7 * 86400000);
  const upcomingEvents = events.filter(e => {
    const evTime = new Date(e.startAt).getTime();
    return evTime >= now.getTime() && evTime <= next7Days.getTime();
  });

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'done' ? 'open' : 'done';
    try {
      await updateTask(taskId, { status: nextStatus as any });
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-100 text-xs font-semibold mb-3 backdrop-blur-xs">
            <span className="capitalize">{role} View</span> • {family?.name}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Welcome back, {user?.displayName}!
          </h1>
          <p className="text-sm text-indigo-100 leading-relaxed">
            Your family's central workspace for synchronized tasks, calendar conflict detection, and voice coordination via Alexa+ Model Context Protocol.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenAssistant}
              className="px-4 py-2 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs shadow-sm flex items-center gap-2 transition"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Ask AI Assistant</span>
            </button>
            <button
              onClick={() => onNavigate('alexa-simulator')}
              className="px-4 py-2 rounded-xl bg-indigo-500/40 hover:bg-indigo-500/60 text-white font-semibold text-xs border border-white/20 flex items-center gap-2 transition"
            >
              <Radio className="w-4 h-4" />
              <span>Open Alexa+ Simulator (MCP)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards (FR-DASH-001) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Due Today */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Due Today
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {dueTodayTasks.length}
            </div>
            <span className="text-[11px] text-slate-400">Tasks requiring attention</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Open / In Progress
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {pendingTasks.length}
            </div>
            <span className="text-[11px] text-slate-400">Total active family tasks</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <CheckSquare className="w-6 h-6" />
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Overdue
            </span>
            <div className={`text-2xl font-extrabold mt-1 ${overdueTasks.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {overdueTasks.length}
            </div>
            <span className="text-[11px] text-slate-400">Past target date</span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${overdueTasks.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Next 7 Days Events */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Upcoming Events
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {upcomingEvents.length}
            </div>
            <span className="text-[11px] text-slate-400">Next 7 days on calendar</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Tasks & Today's Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-slate-900 text-sm">Tasks Due Today</h2>
            </div>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 flex-1 space-y-2.5">
            {dueTodayTasks.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No tasks due today. All caught up!
              </div>
            ) : (
              dueTodayTasks.map(task => (
                <div
                  key={task.taskId}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition flex items-center justify-between border border-slate-200/60"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleTaskStatus(task.taskId, task.status)}
                      className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                        task.status === 'done'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 bg-white hover:border-indigo-500'
                      }`}
                    >
                      {task.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                      <span className={`text-xs font-medium text-slate-900 block ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>
                        {task.title}
                      </span>
                      {task.notes && (
                        <span className="text-[11px] text-slate-500 line-clamp-1">
                          {task.notes}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold capitalize ${
                      task.priority === 'high' ? 'bg-rose-50 text-rose-700' :
                      task.priority === 'low' ? 'bg-slate-100 text-slate-600' :
                      'bg-indigo-50 text-indigo-700'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Next 7 Days Events */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-slate-900 text-sm">Upcoming Family Schedule</h2>
            </div>
            <button
              onClick={() => onNavigate('calendar')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>View calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 flex-1 space-y-2.5">
            {upcomingEvents.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No events scheduled for the next 7 days.
              </div>
            ) : (
              upcomingEvents.map(ev => {
                const start = new Date(ev.startAt);
                const end = new Date(ev.endAt);
                return (
                  <div
                    key={ev.eventId}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition flex items-center justify-between border border-slate-200/60"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        {ev.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span>{start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        <span>•</span>
                        <span>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                      {(ev.attendeeIds || []).length} Attendee{(ev.attendeeIds || []).length !== 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Family Activity Log (FR-DASH-002: 10 most recent entries) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <History className="w-4 h-4 text-slate-600" />
          <h2 className="font-bold text-slate-900 text-sm">Recent Family Activity Log</h2>
          <span className="text-[11px] text-slate-400">(Live Audit Trail)</span>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {recentActivity.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              No recent activity recorded yet.
            </div>
          ) : (
            recentActivity.map(act => (
              <div key={act.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-900">{act.actorName}</span>
                  <span className="text-slate-600 ml-1.5">{act.change}</span>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                  {new Date(act.at).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                  {new Date(act.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
