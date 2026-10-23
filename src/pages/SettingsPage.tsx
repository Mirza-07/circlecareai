import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { CircleCareAPI } from '../lib/api.js';
import {
  Settings,
  User,
  Bell,
  Shield,
  Trash2,
  Check,
  AlertTriangle,
  Globe
} from 'lucide-react';
import { ConsentPreferences, NotificationPreferences } from '../types/index.js';

export const SettingsPage: React.FC<{ onNavigate: (route: string) => void }> = ({ onNavigate }) => {
  const { user, role, updateProfile, deleteAccount } = useAuth();

  // Profile Section
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [timeZone, setTimeZone] = useState(user?.timeZone || 'America/New_York');
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Notification Preferences Section
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    taskAssigned: user?.notificationPrefs?.taskAssigned ?? true,
    dueSoon: user?.notificationPrefs?.dueSoon ?? true,
    overdue: user?.notificationPrefs?.overdue ?? true,
    eventReminders: user?.notificationPrefs?.eventReminders ?? true
  });
  const [notifSaved, setNotifSaved] = useState(false);

  // Privacy & Consent Section
  const [consent, setConsent] = useState<ConsentPreferences>({
    analytics: false,
    aiHistory: false, // FR-SET-003: unticked default
    functional: true,
    updatedAt: new Date().toISOString()
  });
  const [consentSaved, setConsentSaved] = useState(false);

  // Account Deletion Section
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    CircleCareAPI.getConsent().then(setConsent).catch(() => {});
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    try {
      await updateProfile({ displayName: displayName.trim(), timeZone });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err: any) {
      setProfileError(err.message);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await updateProfile({ notificationPrefs: notifPrefs });
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveConsent = async () => {
    try {
      await CircleCareAPI.updateConsent(consent);
      setConsentSaved(true);
      setTimeout(() => setConsentSaved(false), 2000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    try {
      await deleteAccount();
      alert('Your account and profile data have been deleted.');
    } catch (err: any) {
      setDeleteError(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          Settings & Privacy Controls (FR-SET-001)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your profile, notification categories, data retention, and account lifecycle.
        </p>
      </div>

      {/* 1. Profile Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <User className="w-4 h-4 text-indigo-600" />
          <h2 className="font-bold text-slate-900 text-sm">Profile & Time Zone</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="mt-4 space-y-4 text-xs">
          {profileError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
              {profileError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Display Name (FR-PROF-001)
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                IANA Time Zone (FR-PROF-003)
              </label>
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="America/New_York">America/New_York (Eastern)</option>
                <option value="America/Chicago">America/Chicago (Central)</option>
                <option value="America/Denver">America/Denver (Mountain)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (Pacific)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500">
              Email: <strong>{user?.email}</strong> (Managed by Firebase Auth)
            </span>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition flex items-center gap-1 shadow-xs"
            >
              {profileSaved && <Check className="w-3.5 h-3.5" />}
              <span>{profileSaved ? 'Saved' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Notification Preferences Section (FR-NOTIF-002) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Bell className="w-4 h-4 text-indigo-600" />
          <h2 className="font-bold text-slate-900 text-sm">In-App Notification Categories</h2>
        </div>

        <div className="mt-4 space-y-3 text-xs">
          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <div>
              <span className="font-semibold text-slate-900 block">Task Assignment Alerts</span>
              <span className="text-[11px] text-slate-500">Receive in-app alerts when another family member assigns a task to you.</span>
            </div>
            <input
              type="checkbox"
              checked={notifPrefs.taskAssigned}
              onChange={(e) => setNotifPrefs(prev => ({ ...prev, taskAssigned: e.target.checked }))}
              className="h-4 w-4 rounded text-indigo-600"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <div>
              <span className="font-semibold text-slate-900 block">Due Soon Warnings (24h & 1h)</span>
              <span className="text-[11px] text-slate-500">Alerts when pending tasks are nearing their scheduled deadline.</span>
            </div>
            <input
              type="checkbox"
              checked={notifPrefs.dueSoon}
              onChange={(e) => setNotifPrefs(prev => ({ ...prev, dueSoon: e.target.checked }))}
              className="h-4 w-4 rounded text-indigo-600"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <div>
              <span className="font-semibold text-slate-900 block">Overdue Task Warnings</span>
              <span className="text-[11px] text-slate-500">Highlighted notifications for tasks past their target due date.</span>
            </div>
            <input
              type="checkbox"
              checked={notifPrefs.overdue}
              onChange={(e) => setNotifPrefs(prev => ({ ...prev, overdue: e.target.checked }))}
              className="h-4 w-4 rounded text-indigo-600"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <div>
              <span className="font-semibold text-slate-900 block">Calendar Event & Conflict Reminders</span>
              <span className="text-[11px] text-slate-500">30-minute default reminders and attendee schedule conflict warnings.</span>
            </div>
            <input
              type="checkbox"
              checked={notifPrefs.eventReminders}
              onChange={(e) => setNotifPrefs(prev => ({ ...prev, eventReminders: e.target.checked }))}
              className="h-4 w-4 rounded text-indigo-600"
            />
          </label>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveNotifications}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition flex items-center gap-1 shadow-xs"
            >
              {notifSaved && <Check className="w-3.5 h-3.5" />}
              <span>{notifSaved ? 'Saved Preferences' : 'Save Preferences'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Privacy & AI Consent (FR-SET-003) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Shield className="w-4 h-4 text-indigo-600" />
          <h2 className="font-bold text-slate-900 text-sm">Privacy & AI Data Retention</h2>
        </div>

        <div className="mt-4 space-y-3 text-xs">
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">
                  AI Conversation History Storage (Unticked Default, FR-SET-003)
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block max-w-xl">
                  Allow CircleCare AI to retain conversation transcripts in your private user profile for up to 30 days. When unticked, conversations are processed ephemerally and discarded immediately after response.
                </span>
              </div>
              <input
                type="checkbox"
                checked={consent.aiHistory}
                onChange={(e) => setConsent(prev => ({ ...prev, aiHistory: e.target.checked }))}
                className="h-4 w-4 rounded text-indigo-600"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">
                  Anonymous Performance Telemetry
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block max-w-xl">
                  Helps us measure tool round-trip latencies without recording any personal family content.
                </span>
              </div>
              <input
                type="checkbox"
                checked={consent.analytics}
                onChange={(e) => setConsent(prev => ({ ...prev, analytics: e.target.checked }))}
                className="h-4 w-4 rounded text-indigo-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => onNavigate('privacy')}
              className="text-xs text-indigo-600 hover:underline"
            >
              View Full Data Inventory & Privacy Policy (NFR-PRIV-001) →
            </button>

            <button
              onClick={handleSaveConsent}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition flex items-center gap-1 shadow-xs"
            >
              {consentSaved && <Check className="w-3.5 h-3.5" />}
              <span>{consentSaved ? 'Updated Consent' : 'Save Privacy Controls'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Danger Zone: Delete Account (FR-AUTH-006) */}
      <div className="bg-rose-50/50 rounded-2xl border border-rose-200 p-6">
        <div className="flex items-center gap-2 pb-3 border-b border-rose-200/60 text-rose-900">
          <Trash2 className="w-4 h-4 text-rose-600" />
          <h2 className="font-bold text-sm">Delete Account (FR-AUTH-006)</h2>
        </div>

        <div className="mt-4 space-y-3 text-xs text-slate-700">
          <p>
            Deleting your account removes your user profile, personal notifications, and privacy preferences.
          </p>
          <p className="font-medium text-rose-800">
            Note: If you are the sole Owner of a family, you must transfer ownership to an existing adult member before deletion can proceed.
          </p>

          {deleteError && (
            <div className="p-3 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 font-semibold">
              {deleteError}
            </div>
          )}

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs"
            >
              Delete My Account...
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-white border border-rose-300 space-y-2">
              <span className="font-bold text-rose-700 block">
                Are you absolutely sure? This action is permanent.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-1.5 rounded-lg bg-rose-700 text-white font-bold"
                >
                  Confirm Delete Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
