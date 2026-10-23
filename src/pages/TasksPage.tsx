import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useFamily } from '../context/FamilyContext.js';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Clock,
  History,
  Trash2,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  X,
  UserCheck
} from 'lucide-react';
import { TaskItem, TaskPriority, TaskStatus, TaskHistoryEntry } from '../types/index.js';
import { CircleCareAPI } from '../lib/api.js';

export const TasksPage: React.FC = () => {
  const { user, role } = useAuth();
  const { members, tasks, createTask, updateTask, deleteTask, restoreTask } = useFamily();

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeTaskHistory, setActiveTaskHistory] = useState<TaskHistoryEntry[]>([]);
  const [activeTaskTitle, setActiveTaskTitle] = useState('');
  const [showRestoreDrawer, setShowRestoreDrawer] = useState(false);
  const [deletedTasks, setDeletedTasks] = useState<TaskItem[]>([]);

  // Add Task Form State
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newAssignee, setNewAssignee] = useState(user?.uid || '');
  const [newPriority, setNewPriority] = useState<TaskPriority>('normal');
  const [newDueDate, setNewDueDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const now = new Date();

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.notes?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (assigneeFilter !== 'all' && t.assigneeUid !== assigneeFilter) return false;
    return true;
  });

  const canCreate = role === 'owner' || role === 'admin' || role === 'member';

  const canEditTask = (t: TaskItem) => {
    if (role === 'owner' || role === 'admin') return true;
    if (role === 'member') {
      return t.createdBy === user?.uid || t.assigneeUid === user?.uid;
    }
    // Viewer: only status change on assigned
    return false;
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newTitle.trim()) {
      setFormError('Task title is required (1-120 characters)');
      return;
    }
    if (newTitle.length > 120) {
      setFormError('Task title cannot exceed 120 characters');
      return;
    }

    try {
      await createTask({
        title: newTitle.trim(),
        notes: newNotes.trim() || undefined,
        assigneeUid: newAssignee || undefined,
        priority: newPriority,
        dueAt: newDueDate ? new Date(newDueDate).toISOString() : undefined
      });
      setShowAddModal(false);
      setNewTitle('');
      setNewNotes('');
      setNewDueDate('');
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleToggleStatus = async (task: TaskItem) => {
    let nextStatus: TaskStatus = 'open';
    if (task.status === 'open') nextStatus = 'in_progress';
    else if (task.status === 'in_progress') nextStatus = 'done';
    else if (task.status === 'done') nextStatus = 'open';

    try {
      await updateTask(task.taskId, { status: nextStatus });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleViewHistory = async (task: TaskItem) => {
    try {
      const hist = await CircleCareAPI.getTaskHistory(task.taskId);
      setActiveTaskHistory(hist);
      setActiveTaskTitle(task.title);
      setShowHistoryModal(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (role !== 'owner' && role !== 'admin') {
      alert('Permission denied: Only Owners and Admins can delete tasks.');
      return;
    }
    if (confirm('Move this task to trash? It can be restored within 30 days.')) {
      try {
        await deleteTask(taskId);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleOpenRestoreDrawer = async () => {
    // Fetch all including deleted
    try {
      const res = await fetch('/api/tasks?includeDeleted=true');
      // Or filter from store
      setShowRestoreDrawer(true);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-indigo-600" />
            Family Tasks & Chores
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Coordinate responsibilities, track completion timestamps, and audit history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canCreate && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>
          )}

          {(role === 'owner' || role === 'admin') && (
            <button
              onClick={handleOpenRestoreDrawer}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              title="View and restore soft-deleted tasks"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Trash (30d)</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar (FR-TASK-006) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search tasks by title or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-xs"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Completed</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:ring-indigo-500"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Assignee Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Assignee:</span>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:ring-indigo-500"
          >
            <option value="all">All Members</option>
            {members.map(m => (
              <option key={m.uid} value={m.uid}>
                {m.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No tasks match your filters.
          </div>
        ) : (
          filteredTasks.map(task => {
            const assignee = members.find(m => m.uid === task.assigneeUid);
            const isOverdue = task.status !== 'done' && task.dueAt && new Date(task.dueAt).getTime() < now.getTime();
            const editable = canEditTask(task);

            return (
              <div
                key={task.taskId}
                className="p-4 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left: Checkbox + Title & Notes */}
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => handleToggleStatus(task)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition ${
                      task.status === 'done'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : task.status === 'in_progress'
                        ? 'bg-amber-100 border-amber-400 text-amber-700 font-bold text-[10px]'
                        : 'border-slate-300 bg-white hover:border-indigo-500'
                    }`}
                    title={`Current: ${task.status}. Click to cycle status.`}
                  >
                    {task.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {task.status === 'in_progress' && '▶'}
                  </button>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold text-slate-900 ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>
                        {task.title}
                      </span>

                      {/* Status Tag */}
                      <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                        task.status === 'done' ? 'bg-emerald-50 text-emerald-700' :
                        task.status === 'in_progress' ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>

                      {/* Priority Tag */}
                      <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold uppercase ${
                        task.priority === 'high' ? 'bg-rose-50 text-rose-700' :
                        task.priority === 'low' ? 'bg-slate-100 text-slate-500' :
                        'bg-indigo-50 text-indigo-700'
                      }`}>
                        {task.priority}
                      </span>

                      {isOverdue && (
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-rose-50 text-rose-600 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> OVERDUE
                        </span>
                      )}
                    </div>

                    {task.notes && (
                      <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                        {task.notes}
                      </p>
                    )}

                    {/* Metadata: Assignee & Due Date */}
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-2 flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        Assignee: <strong className="text-slate-700">{assignee?.displayName || 'Unassigned'}</strong>
                      </span>

                      {task.dueAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Due: {new Date(task.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}

                      {task.completedAt && (
                        <span className="text-emerald-700">
                          Completed on {new Date(task.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions: History Audit + Delete */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleViewHistory(task)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    title="View append-only change history (FR-TASK-007)"
                  >
                    <History className="w-4 h-4" />
                  </button>

                  {(role === 'owner' || role === 'admin') && (
                    <button
                      onClick={() => handleDelete(task.taskId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Move to trash (Soft-delete for 30 days)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Add New Family Task
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="mt-4 space-y-4 text-xs">
              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Task Title * (1-120 chars)
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Pick up groceries at Trader Joe's"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notes (up to 2,000 chars)
                </label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Add specifics, grocery list items, or location notes..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assignee (FR-TASK-003)
                  </label>
                  <select
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.uid} value={m.uid}>
                        {m.displayName} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High (Urgent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Due Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Audit Modal (FR-TASK-007) */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Audit History: {activeTaskTitle}
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-3 text-xs">
              {activeTaskHistory.length === 0 ? (
                <div className="py-6 text-center text-slate-400">
                  No previous audit records.
                </div>
              ) : (
                activeTaskHistory.map((h, i) => (
                  <div key={h.id || i} className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <strong className="text-slate-800">{h.actorName}</strong>
                      <span>{new Date(h.at).toLocaleDateString()} {new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-700">{h.change}</p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 mt-4 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
