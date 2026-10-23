import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useFamily } from '../context/FamilyContext.js';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  AlertTriangle,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Bell
} from 'lucide-react';
import { CalendarEvent } from '../types/index.js';

export const CalendarPage: React.FC = () => {
  const { user, role } = useAuth();
  const { members, events, createEvent, deleteEvent } = useFamily();

  const [viewMode, setViewMode] = useState<'day' | 'week' | 'list'>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('14:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('15:00');
  const [attendeeIds, setAttendeeIds] = useState<string[]>([user?.uid || '']);
  const [notes, setNotes] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState(30);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly'>('none');
  const [conflictWarning, setConflictWarning] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const canCreate = role === 'owner' || role === 'admin' || role === 'member';

  const userTimeZone = user?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // Check conflicts locally
  const checkLocalConflicts = (startAt: string, endAt: string, attendees: string[]) => {
    const startMs = new Date(startAt).getTime();
    const endMs = new Date(endAt).getTime();
    const warnings: string[] = [];

    for (const ev of events) {
      const evStart = new Date(ev.startAt).getTime();
      const evEnd = new Date(ev.endAt).getTime();
      const hasOverlap = startMs < evEnd && endMs > evStart;
      if (hasOverlap && ev.attendeeIds) {
        const shared = ev.attendeeIds.filter((id: string) => attendees.includes(id));
        if (shared.length > 0) {
          const names = shared.map((id: string) => members.find(m => m.uid === id)?.displayName || id).join(', ');
          warnings.push(`Overlap: ${names} is already attending "${ev.title}" (${new Date(ev.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(ev.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
        }
      }
    }
    return warnings;
  };

  const handleTimeChange = (startD: string, startT: string, endD: string, endT: string, atts: string[]) => {
    if (startD && startT && endD && endT) {
      const startIso = `${startD}T${startT}:00Z`;
      const endIso = `${endD}T${endT}:00Z`;
      const warnings = checkLocalConflicts(startIso, endIso, atts);
      setConflictWarning(warnings);
    }
  };

  const handleOpenAddModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    setTitle('');
    setNotes('');
    setConflictWarning([]);
    setFormError(null);
    setShowAddModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Event title is required');
      return;
    }

    const startIso = `${startDate}T${startTime}:00Z`;
    const endIso = `${endDate}T${endTime}:00Z`;

    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setFormError('End time must be strictly after start time');
      return;
    }

    try {
      await createEvent({
        title: title.trim(),
        startAt: startIso,
        endAt: endIso,
        timeZone: userTimeZone,
        attendeeIds,
        notes: notes.trim() || undefined,
        recurrence,
        reminderMinutes
      });
      setShowAddModal(false);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (role !== 'owner' && role !== 'admin') {
      alert('Only Owners and Admins can delete calendar events.');
      return;
    }
    if (confirm('Delete this calendar event?')) {
      await deleteEvent(eventId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-emerald-600" />
            Family Calendar & Events
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Viewer Timezone: <strong className="text-slate-700">{userTimeZone}</strong> • Real-time attendee conflict warnings (FR-CAL-003).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded-lg transition ${
                viewMode === 'day' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-lg transition ${
                viewMode === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg transition ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Upcoming List
            </button>
          </div>

          {canCreate && (
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Events View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        {events.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No events scheduled yet. Click "Add Event" to plan an activity.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(ev => {
              const start = new Date(ev.startAt);
              const end = new Date(ev.endAt);
              const attendees = (ev.attendeeIds || []).map((id: string) => members.find(m => m.uid === id)?.displayName || id);

              // Check if this event conflicts with any other event
              const localConflicts = checkLocalConflicts(ev.startAt, ev.endAt, ev.attendeeIds || [])
                .filter(c => !c.includes(ev.title));

              return (
                <div
                  key={ev.eventId}
                  className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">
                        {ev.title}
                      </span>
                      {ev.recurrence && ev.recurrence !== 'none' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold uppercase">
                          Repeats: {ev.recurrence}
                        </span>
                      )}
                      {ev.reminderMinutes && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium flex items-center gap-1">
                          <Bell className="w-3 h-3" /> {ev.reminderMinutes}m Reminder
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })},{' '}
                        {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      <span className="flex items-center gap-1 text-slate-500">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Attendees: <strong className="text-slate-700">{attendees.join(', ')}</strong>
                      </span>
                    </div>

                    {ev.notes && (
                      <p className="text-xs text-slate-500 mt-1">
                        {ev.notes}
                      </p>
                    )}

                    {/* Overlap / Conflict Warning Banner (FR-CAL-003) */}
                    {localConflicts.length > 0 && (
                      <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold">Schedule Conflict Detected:</strong>
                          <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-[11px]">
                            {localConflicts.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  {(role === 'owner' || role === 'admin') && (
                    <button
                      onClick={() => handleDeleteEvent(ev.eventId)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 self-end md:self-center transition"
                      title="Delete event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-emerald-600" />
                Add Family Event
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="mt-4 space-y-4 text-xs">
              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                  {formError}
                </div>
              )}

              {/* Real-time Conflict Alert in Modal (FR-CAL-003) */}
              {conflictWarning.length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Notice: Attendee Overlap</span>
                    <ul className="list-disc list-inside mt-0.5">
                      {conflictWarning.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                    <span className="text-[10px] text-amber-700 block mt-1">
                      You may still proceed to schedule if intended.
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Emily Soccer Tournament"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setEndDate(e.target.value);
                      handleTimeChange(e.target.value, startTime, e.target.value, endTime, attendeeIds);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      handleTimeChange(startDate, e.target.value, endDate, endTime, attendeeIds);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      handleTimeChange(startDate, startTime, endDate, e.target.value, attendeeIds);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Recurrence</label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="none">One-time</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              {/* Attendees Checkboxes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Attendees (Select family members)
                </label>
                <div className="grid grid-cols-2 gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50">
                  {members.map(m => {
                    const isChecked = attendeeIds.includes(m.uid);
                    return (
                      <label key={m.uid} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let nextAtts: string[];
                            if (e.target.checked) nextAtts = [...attendeeIds, m.uid];
                            else nextAtts = attendeeIds.filter(id => id !== m.uid);
                            setAttendeeIds(nextAtts);
                            handleTimeChange(startDate, startTime, endDate, endTime, nextAtts);
                          }}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{m.displayName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  In-App Reminder (FR-CAL-004)
                </label>
                <select
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before (Default)</option>
                  <option value={60}>1 hour before</option>
                  <option value={1440}>1 day before</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Location, what to bring, etc."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
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
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
