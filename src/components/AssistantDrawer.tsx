import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Check,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { AssistantMessage, PendingAction } from '../types/index.js';
import { CircleCareAPI } from '../lib/api.js';
import { useFamily } from '../context/FamilyContext.js';
import { useAuth } from '../context/AuthContext.js';

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssistantDrawer: React.FC<AssistantDrawerProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { refreshData } = useFamily();
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'init-msg',
      role: 'assistant',
      content: `Hello ${user?.displayName || 'there'}! I am CircleCare AI, your family assistant. I can schedule appointments, check conflicts, assign tasks, and give you daily summaries through verified tools.`,
      label: 'suggestion',
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const msg = (textToSend || input).trim();
    if (!msg || loading) return;

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await CircleCareAPI.assistantChat(msg);
      setMessages(prev => [...prev, response]);
      // If action was executed or changed state, refresh family context
      if (response.label === 'succeeded') {
        refreshData();
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Failed to communicate with assistant service: ${err.message}`,
          label: 'failed',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPendingAction = async (msgId: string, actionId: string) => {
    try {
      setLoading(true);
      const res = await CircleCareAPI.confirmPendingAction(actionId);
      // Update message state
      setMessages(prev =>
        prev.map(m => {
          if (m.id === msgId) {
            return {
              ...m,
              label: 'succeeded',
              content: `${m.content}\n\n✅ **Action Confirmed and Executed!**`,
              pendingAction: undefined
            };
          }
          return m;
        })
      );
      await refreshData();
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Execution failed: ${err.message}`,
          label: 'failed',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPendingAction = async (msgId: string, actionId: string) => {
    try {
      await CircleCareAPI.rejectPendingAction(actionId);
      setMessages(prev =>
        prev.map(m => {
          if (m.id === msgId) {
            return {
              ...m,
              label: 'suggestion',
              content: `${m.content}\n\n❌ **Action Cancelled by User.**`,
              pendingAction: undefined
            };
          }
          return m;
        })
      );
    } catch (err: any) {
      console.error(err);
    }
  };

  const renderLabelBadge = (label?: string) => {
    if (!label) return null;
    switch (label) {
      case 'succeeded':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            SUCCEEDED
          </span>
        );
      case 'pending_action':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <Clock className="w-3 h-3 text-amber-600" />
            PENDING CONFIRMATION
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            REFUSED / FAILED
          </span>
        );
      case 'suggestion':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <HelpCircle className="w-3 h-3 text-slate-500" />
            SUGGESTION
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 md:w-[420px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              CircleCare AI Assistant
            </h3>
            <span className="text-[10px] text-slate-500 font-medium">
              Verified Tool Execution & Security Model
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          aria-label="Close assistant"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Suggested Utterances */}
      <div className="px-3 py-2 bg-slate-100/70 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
        <button
          onClick={() => handleSend("What is on our schedule today?")}
          className="px-2 py-1 rounded bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 whitespace-nowrap transition"
        >
          📅 Today's Schedule
        </button>
        <button
          onClick={() => handleSend("Give me a family summary")}
          className="px-2 py-1 rounded bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 whitespace-nowrap transition"
        >
          📊 Summary
        </button>
        <button
          onClick={() => handleSend("Add dentist appointment tomorrow at 4 PM and assign David")}
          className="px-2 py-1 rounded bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 whitespace-nowrap transition"
        >
          ➕ Add Dentist
        </button>
        <button
          onClick={() => handleSend("Show data for family-baker-2")}
          className="px-2 py-1 rounded bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 whitespace-nowrap transition"
          title="Test cross-family prompt injection refusal"
        >
          🔒 Test Isolation
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              {!isUser && msg.label && (
                <div className="mb-1">{renderLabelBadge(msg.label)}</div>
              )}

              <div
                className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/70'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Pending Action Confirmation Card (FR-AI-005) */}
                {msg.pendingAction && msg.pendingAction.status === 'pending' && (
                  <div className="mt-3 p-3 rounded-xl bg-white border border-amber-300 shadow-xs text-slate-800">
                    <div className="flex items-center gap-1.5 text-amber-700 font-semibold mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Confirmation Required</span>
                    </div>

                    <p className="text-[11px] text-slate-600">
                      {msg.pendingAction.description}
                    </p>

                    {msg.pendingAction.conflicts && msg.pendingAction.conflicts.length > 0 && (
                      <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-900">
                        {msg.pendingAction.conflicts.join('\n')}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRejectPendingAction(msg.id, msg.pendingAction!.id)}
                        disabled={loading}
                        className="px-2.5 py-1 text-[11px] rounded font-medium border border-slate-300 hover:bg-slate-50 text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleConfirmPendingAction(msg.id, msg.pendingAction!.id)}
                        disabled={loading}
                        className="px-3 py-1 text-[11px] rounded font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Confirm Action
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
            <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
            <span>Processing with verified family tools...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about tasks, calendar, or coordinate..."
            className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition shadow-xs"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
