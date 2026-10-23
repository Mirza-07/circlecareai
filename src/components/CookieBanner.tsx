import React, { useState, useEffect } from 'react';
import { Shield, Cookie, X, Check } from 'lucide-react';
import { CircleCareAPI } from '../lib/api.js';

export const CookieBanner: React.FC<{ onOpenFullPreferences?: () => void }> = ({ onOpenFullPreferences }) => {
  const [showBanner, setShowBanner] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [aiHistory, setAiHistory] = useState(false);

  useEffect(() => {
    const consentSet = localStorage.getItem('circlecare_cookie_consent');
    if (!consentSet) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = async () => {
    const prefs = { analytics: true, aiHistory: true, functional: true, updatedAt: new Date().toISOString() };
    localStorage.setItem('circlecare_cookie_consent', JSON.stringify(prefs));
    setShowBanner(false);
    setShowManageModal(false);
    try {
      await CircleCareAPI.updateConsent(prefs);
    } catch {}
  };

  const handleRejectOptional = async () => {
    // Optional categories start OFF per FR-SET-004
    const prefs = { analytics: false, aiHistory: false, functional: true, updatedAt: new Date().toISOString() };
    localStorage.setItem('circlecare_cookie_consent', JSON.stringify(prefs));
    setShowBanner(false);
    setShowManageModal(false);
    try {
      await CircleCareAPI.updateConsent(prefs);
    } catch {}
  };

  const handleSaveCustom = async () => {
    const prefs = { analytics, aiHistory, functional: true, updatedAt: new Date().toISOString() };
    localStorage.setItem('circlecare_cookie_consent', JSON.stringify(prefs));
    setShowBanner(false);
    setShowManageModal(false);
    try {
      await CircleCareAPI.updateConsent(prefs);
    } catch {}
  };

  if (!showBanner && !showManageModal) return null;

  return (
    <>
      {showBanner && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 bg-white border-t border-slate-200 shadow-2xl animate-in slide-in-from-bottom duration-200">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3 max-w-3xl">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                <Cookie className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Your Privacy & Cookie Choices
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  CircleCare AI respects family confidentiality. We strictly limit data collection. Essential cookies are required for secure family authentication and tenant isolation. Optional analytics and AI conversation history are turned off by default unless you choose to enable them.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={handleRejectOptional}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
              >
                Reject Optional
              </button>
              <button
                onClick={() => setShowManageModal(true)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
              >
                Manage
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold transition shadow-xs"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Preferences Modal */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Cookie & Privacy Preferences</h3>
              </div>
              <button
                onClick={() => setShowManageModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {/* Essential */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">Strictly Necessary Cookies</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    Always Active
                  </span>
                </div>
                <p className="text-slate-500 mt-1">
                  Required for user sessions, tenant isolation, and security rule tokens. Cannot be switched off.
                </p>
              </div>

              {/* Analytics */}
              <div className="p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900">Performance & Analytics</span>
                    <p className="text-slate-500 mt-0.5">
                      Helps us measure latency (NFR-PERF-001) and error frequencies without collecting personal data.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* AI Conversation History (FR-SET-003) */}
              <div className="p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900">AI Conversation Storage (Unticked Default)</span>
                    <p className="text-slate-500 mt-0.5">
                      Retains multi-turn assistant messages for up to 30 days. When unticked, messages are discarded immediately after response.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={aiHistory}
                    onChange={(e) => setAiHistory(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={handleRejectOptional}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                Reject Optional
              </button>
              <button
                onClick={handleSaveCustom}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
