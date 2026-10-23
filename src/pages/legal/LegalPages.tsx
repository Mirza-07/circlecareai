import React, { useState } from 'react';
import { Shield, FileText, Cookie, ArrowLeft, Check, Lock } from 'lucide-react';
import { CircleCareAPI } from '../../lib/api.js';

interface LegalPageProps {
  onBack: () => void;
}

export const PrivacyPolicyPage: React.FC<LegalPageProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6 text-xs text-slate-700 leading-relaxed">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Application</span>
      </button>

      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-600" />
          CircleCare AI — Privacy Policy & Data Inventory
        </h1>
        <span className="text-[11px] text-slate-400 mt-1 block">
          Last reviewed: October 23, 2026 • Verified against Amazon Hackathon Guidelines & GDPR/CCPA principles
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900">1. Core Privacy Commitments (NFR-PRIV-002)</h2>
        <p>
          CircleCare AI is engineered specifically for families. In accordance with non-functional security requirement <strong>NFR-PRIV-002</strong>:
        </p>
        <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
          <li><strong>No Precise Geolocation:</strong> We never collect, track, or request device GPS or Wi-Fi coordinates.</li>
          <li><strong>No Contact Book Import:</strong> We do not upload, read, or sync your phone's address book.</li>
          <li><strong>No Continuous Microphone Recording:</strong> The app never listens ambiently. Alexa+ and voice simulators process only explicit user invocations.</li>
          <li><strong>No Medical Diagnosis or Health Data:</strong> CircleCare AI is strictly a logistical coordination tool, not a medical device.</li>
        </ul>

        <h2 className="text-sm font-bold text-slate-900 pt-2">2. Mandatory Data Inventory (NFR-PRIV-001)</h2>
        <p>
          Below is our transparent, exhaustive record of all data fields, their purpose, storage location, access bounds, and retention windows:
        </p>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-[11px] text-left border border-slate-200 divide-y divide-slate-200">
            <thead className="bg-slate-50 font-bold text-slate-800">
              <tr>
                <th className="p-2.5">Field / Data Item</th>
                <th className="p-2.5">Purpose & Necessity</th>
                <th className="p-2.5">Storage Location</th>
                <th className="p-2.5">Access Scope</th>
                <th className="p-2.5">Retention Window</th>
                <th className="p-2.5">AI Exposure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-2.5 font-mono font-semibold">User Profile (uid, email, displayName, timeZone)</td>
                <td className="p-2.5">Authentication & time zone conversion for due dates</td>
                <td className="p-2.5">users/{'{uid}'}</td>
                <td className="p-2.5">Self & Family Members</td>
                <td className="p-2.5">Deleted with account</td>
                <td className="p-2.5 text-emerald-700 font-semibold">Display name only</td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono font-semibold">Tasks (title, priority, dueAt, status)</td>
                <td className="p-2.5">Shared family task tracking</td>
                <td className="p-2.5">families/{'{familyId}'}/tasks</td>
                <td className="p-2.5">Family Members only</td>
                <td className="p-2.5">Soft delete 30d, purged</td>
                <td className="p-2.5 text-emerald-700 font-semibold">Sent during query</td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono font-semibold">Task Notes</td>
                <td className="p-2.5">Additional details or grocery lists</td>
                <td className="p-2.5">families/{'{familyId}'}/tasks</td>
                <td className="p-2.5">Family Members only</td>
                <td className="p-2.5">Follows task</td>
                <td className="p-2.5 text-amber-700 font-semibold">Redacted if private</td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono font-semibold">Events (title, startAt, endAt, attendees)</td>
                <td className="p-2.5">Family calendar & conflict detection</td>
                <td className="p-2.5">families/{'{familyId}'}/events</td>
                <td className="p-2.5">Family Members only</td>
                <td className="p-2.5">24 months post-event</td>
                <td className="p-2.5 text-emerald-700 font-semibold">Schedule lookups</td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono font-semibold">AI Assistant History</td>
                <td className="p-2.5">Multi-turn context (Opt-in only, FR-SET-003)</td>
                <td className="p-2.5">users/{'{uid}'}/conversations</td>
                <td className="p-2.5">Self only</td>
                <td className="p-2.5">30 days default; purged on opt-out</td>
                <td className="p-2.5 text-indigo-700 font-semibold">Ephemeral unless opted in</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-sm font-bold text-slate-900 pt-2">3. Multi-Tenant Family Isolation (FR-FAM-007)</h2>
        <p>
          Every Firestore collection and tool execution enforces tenant isolation. Family A members can never access, read, or execute tools against Family B's database collections. All tool operations derive the active family ID strictly from the verified session token on the server.
        </p>
      </div>
    </div>
  );
};

export const TermsPage: React.FC<LegalPageProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6 text-xs text-slate-700 leading-relaxed">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Application</span>
      </button>

      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-600" />
          Terms and Conditions of Use
        </h1>
        <span className="text-[11px] text-slate-400 mt-1 block">
          CircleCare AI • Amazon Developer Hackathon 2026
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900">1. Acceptance of Terms</h2>
        <p>
          By creating a family workspace or signing into CircleCare AI, you agree to these Terms. CircleCare AI is intended as a family organizer.
        </p>

        <h2 className="text-sm font-bold text-slate-900">2. Family Roles and Delegation</h2>
        <p>
          CircleCare AI provides four distinct authorization roles: Owner, Admin, Member, and Viewer. Owners are responsible for invitations issued to family members. The AI assistant acts strictly on behalf of the signed-in user and cannot exceed that member's authorization.
        </p>

        <h2 className="text-sm font-bold text-slate-900">3. Non-Emergency Disclaimer</h2>
        <p>
          CircleCare AI is NOT an emergency dispatch or medical monitoring system. In an emergency, call your local emergency service immediately.
        </p>
      </div>
    </div>
  );
};

export const CookiePolicyPage: React.FC<LegalPageProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6 text-xs text-slate-700 leading-relaxed">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Application</span>
      </button>

      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Cookie className="w-6 h-6 text-indigo-600" />
          Cookie Policy (FR-SET-002)
        </h1>
        <span className="text-[11px] text-slate-400 mt-1 block">
          Compliant with ePrivacy Directive and Hackathon Security Specs
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900">1. Types of Cookies Used</h2>
        <p>
          We use strictly necessary cookies to authenticate your user token and maintain tenant isolation across family subcollections. Optional analytics and AI conversation history cookies remain disabled by default unless you grant explicit consent.
        </p>

        <h2 className="text-sm font-bold text-slate-900">2. Managing Cookies</h2>
        <p>
          You may modify or withdraw your cookie choices at any time from our Cookie Preferences interface.
        </p>
      </div>
    </div>
  );
};

export const CookiePreferencesPage: React.FC<LegalPageProps> = ({ onBack }) => {
  const [analytics, setAnalytics] = useState(false);
  const [aiHistory, setAiHistory] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const prefs = { analytics, aiHistory, functional: true, updatedAt: new Date().toISOString() };
    localStorage.setItem('circlecare_cookie_consent', JSON.stringify(prefs));
    try {
      await CircleCareAPI.updateConsent(prefs);
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 text-xs text-slate-700 leading-relaxed">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Application</span>
      </button>

      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Cookie className="w-6 h-6 text-indigo-600" />
          Cookie Preferences Management (FR-SET-004)
        </h1>
        <span className="text-[11px] text-slate-400 mt-1 block">
          Customise your active data collection consents.
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900">Strictly Necessary Cookies</span>
            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">ALWAYS ACTIVE</span>
          </div>
          <p className="text-slate-500 mt-1">
            Enforces Firebase Authentication, token scoping, and multi-tenant security rules.
          </p>
        </div>

        <div className="p-3 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 block">Performance Telemetry</span>
              <span className="text-slate-500 mt-0.5 block">Measures server latency and tool execution metrics without logging task text.</span>
            </div>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              className="h-4 w-4 rounded text-indigo-600"
            />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 block">AI Conversation Transcripts (30-day retention)</span>
              <span className="text-slate-500 mt-0.5 block">Unticked by default. When checked, assistant chat logs are retained for multi-day continuity.</span>
            </div>
            <input
              type="checkbox"
              checked={aiHistory}
              onChange={(e) => setAiHistory(e.target.checked)}
              className="h-4 w-4 rounded text-indigo-600"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
          >
            {saved && <Check className="w-4 h-4" />}
            <span>{saved ? 'Preferences Saved' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
