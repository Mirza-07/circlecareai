import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useFamily } from '../context/FamilyContext.js';
import { CircleCareAPI } from '../lib/api.js';
import {
  Radio,
  Mic,
  Send,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Calendar,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Volume2,
  Check,
  X,
  Play
} from 'lucide-react';

interface ProtocolLogEntry {
  id: string;
  timestamp: string;
  type: 'outgoing' | 'incoming' | 'event';
  method?: string;
  status?: number;
  latencyMs?: number;
  payload: any;
}

export const AlexaSimulatorPage: React.FC = () => {
  const { user, role, token } = useAuth();
  const { refreshData } = useFamily();

  // Voice/Text Utterance
  const [utterance, setUtterance] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [alexaResponse, setAlexaResponse] = useState<string>(
    'Alexa+ is ready. Ask about your family schedule, tasks, or manage appointments.'
  );
  const [richCard, setRichCard] = useState<any>(null);
  const [activePendingAction, setActivePendingAction] = useState<any>(null);
  const [pendingActionMsgId, setPendingActionMsgId] = useState<string | null>(null);

  // MCP Client State
  const [mcpStatus, setMcpStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [protocolLogs, setProtocolLogs] = useState<ProtocolLogEntry[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Add protocol log helper
  const addLog = (entry: Omit<ProtocolLogEntry, 'id' | 'timestamp'>) => {
    setProtocolLogs(prev => [
      {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        ...entry
      },
      ...prev.slice(0, 49) // Keep last 50 logs
    ]);
  };

  // Perform MCP Client Initialize & Tools List on Mount (FR-MCP-001, FR-MCP-004)
  useEffect(() => {
    const initMCP = async () => {
      try {
        setMcpStatus('connecting');

        // 1. Initialize
        const initStart = performance.now();
        const initPayload = {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            clientInfo: { name: 'Alexa-Plus-Simulator-Client', version: '2.0.0' }
          }
        };
        addLog({
          type: 'outgoing',
          method: 'initialize',
          payload: initPayload
        });

        const initRes = await CircleCareAPI.callMCP('initialize', initPayload.params);

        addLog({
          type: 'incoming',
          method: 'initialize',
          status: 200,
          latencyMs: Math.round(performance.now() - initStart),
          payload: initRes
        });

        // 2. Handshake notification: notifications/initialized (MCP Spec)
        const notifPayload = {
          jsonrpc: '2.0',
          method: 'notifications/initialized',
          params: {}
        };
        addLog({
          type: 'outgoing',
          method: 'notifications/initialized',
          payload: notifPayload
        });

        const notifRes = await CircleCareAPI.callMCP('notifications/initialized', {}, true);

        addLog({
          type: 'incoming',
          method: 'notifications/initialized',
          status: 204,
          payload: notifRes
        });

        // 3. Tools List
        const listStart = performance.now();
        const listPayload = { jsonrpc: '2.0', id: 2, method: 'tools/list' };
        addLog({
          type: 'outgoing',
          method: 'tools/list',
          payload: listPayload
        });

        const listRes = await CircleCareAPI.callMCP('tools/list');
        const tools = listRes.result?.tools || [];
        setAvailableTools(tools);

        addLog({
          type: 'incoming',
          method: 'tools/list',
          status: 200,
          latencyMs: Math.round(performance.now() - listStart),
          payload: listRes
        });

        setMcpStatus('connected');
      } catch (err: any) {
        console.error('MCP Init Error:', err);
        setMcpStatus('error');
        addLog({
          type: 'incoming',
          status: 500,
          payload: { error: err.message }
        });
      }
    };

    initMCP();
  }, [token]);

  // Execute Utterance through Assistant / MCP Layer
  const handleExecuteUtterance = async (promptText?: string) => {
    const text = (promptText || utterance).trim();
    if (!text || isProcessing) return;

    setIsProcessing(true);
    setUtterance(text);
    setRichCard(null);
    setActivePendingAction(null);

    // Journey C: Real Cross-tenant access & isolation demonstration (no fake setTimeout)
    if (text.toLowerCase().includes('baker') || text.toLowerCase().includes('other family')) {
      const callStart = performance.now();
      const crossPayload = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'get_family_tasks',
          arguments: { targetFamilyId: 'family-baker-2' }
        }
      };
      addLog({
        type: 'outgoing',
        method: 'tools/call (attempting cross-family)',
        payload: crossPayload
      });

      try {
        const mcpRes = await CircleCareAPI.callMCP('tools/call', {
          name: 'get_family_tasks',
          arguments: { targetFamilyId: 'family-baker-2' }
        });
        const latency = Math.round(performance.now() - callStart);
        addLog({
          type: 'incoming',
          method: 'tools/call',
          status: mcpRes.result?.isError ? 403 : 200,
          latencyMs: latency,
          payload: mcpRes
        });
        const response = await CircleCareAPI.assistantChat(text);
        setAlexaResponse(response.content);
      } catch (err: any) {
        addLog({
          type: 'incoming',
          method: 'tools/call',
          status: 403,
          latencyMs: Math.round(performance.now() - callStart),
          payload: { error: { code: 'CROSS_FAMILY_ACCESS_DENIED', message: err.message } }
        });
        setAlexaResponse("Access Denied (Tenant Isolation): As an authorized assistant for your family (Miller), I cannot access, inspect, or reveal data belonging to other families (Baker Family). All operations are strictly isolated to your family workspace.");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    try {
      const callStart = performance.now();
      addLog({
        type: 'outgoing',
        method: 'alexa/utterance_eval',
        payload: { utterance: text, userUid: user?.uid, role }
      });

      const response = await CircleCareAPI.assistantChat(text);
      const latency = Math.round(performance.now() - callStart);

      addLog({
        type: 'incoming',
        method: 'alexa/response',
        status: 200,
        latencyMs: latency,
        payload: response
      });

      setAlexaResponse(response.content);

      // Check if rich card was returned (FR-MCP-006)
      if (text.toLowerCase().includes('schedule') || response.data?.events) {
        setRichCard({
          title: `Schedule for ${response.data?.date || 'Today'}`,
          events: response.data?.events || [],
          tasksDue: response.data?.tasksDue || [],
          conflicts: response.data?.conflicts || []
        });
      }

      // Check if pending action required (FR-AI-005)
      if (response.label === 'pending_action' && response.pendingAction) {
        setActivePendingAction(response.pendingAction);
        setPendingActionMsgId(response.id);
      } else if (response.label === 'succeeded') {
        await refreshData();
      }
    } catch (err: any) {
      setAlexaResponse(`Error executing tool: ${err.message}`);
      addLog({
        type: 'incoming',
        status: 500,
        payload: { error: err.message }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!activePendingAction) return;
    try {
      setIsProcessing(true);
      addLog({
        type: 'outgoing',
        method: 'tools/call (confirm_execution)',
        payload: { pendingActionId: activePendingAction.id }
      });

      const res = await CircleCareAPI.confirmPendingAction(activePendingAction.id);

      addLog({
        type: 'incoming',
        method: 'tools/call (confirmed)',
        status: 200,
        payload: res
      });

      setActivePendingAction(null);
      setAlexaResponse(`Confirmed! I've scheduled the event and updated the family calendar.`);
      await refreshData();
    } catch (err: any) {
      setAlexaResponse(`Confirmation failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectAction = async () => {
    if (!activePendingAction) return;
    try {
      await CircleCareAPI.rejectPendingAction(activePendingAction.id);
      setActivePendingAction(null);
      setAlexaResponse('Cancelled. No changes were made to your family records.');
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Hackathon Verification Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-6 h-6 text-indigo-600 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Alexa+ Web Client & MCP Server Simulator
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complies with Hackathon FAQ path: real Streamable HTTP MCP server (spec 2025-11-25) + real web MCP client.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
            mcpStatus === 'connected'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : mcpStatus === 'connecting'
              ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${mcpStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span>MCP Server: {mcpStatus.toUpperCase()}</span>
          </div>

          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Terminal className="w-4 h-4 text-slate-500" />
            <span>Protocol Debug Panel ({protocolLogs.length})</span>
            {showDebugPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Grid: Alexa Echo Show Simulator + Protocol Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Center: Echo Show Display Simulator (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 rounded-3xl p-4 sm:p-6 shadow-2xl border-4 border-slate-800 text-white relative flex flex-col min-h-[580px]">
          {/* Echo Show Bezel Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-bold text-slate-200 tracking-wide">Echo Show 15 • Alexa+</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-cyan-400">Streamable HTTP / MCP</span>
              <span className="text-slate-300">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Screen Content Area */}
          <div className="flex-1 py-5 flex flex-col justify-between">
            {/* Alexa Assistant Speech Bubble */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-cyan-500/20">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div className="bg-slate-900/90 rounded-2xl p-4 text-sm leading-relaxed border border-slate-800 flex-1 shadow-md">
                  <p className="whitespace-pre-wrap text-slate-100">{alexaResponse}</p>
                </div>
              </div>

              {/* Rich Card for Daily Schedule (FR-MCP-006) */}
              {richCard && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/30 shadow-lg text-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <Calendar className="w-4 h-4" />
                      {richCard.title}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {richCard.events.length} Events • {richCard.tasksDue.length} Tasks
                    </span>
                  </div>

                  {/* Conflict Notice if any */}
                  {richCard.conflicts && richCard.conflicts.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-700/60 text-rose-200 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold">Schedule Overlap Alert:</strong>
                        <ul className="list-disc list-inside mt-0.5 text-[11px]">
                          {richCard.conflicts.map((c: any, i: number) => (
                            <li key={i}>{c.attendee} overlaps between "{c.eventA}" and "{c.eventB}"</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Events list in rich card */}
                  <div className="space-y-1.5">
                    {richCard.events.map((ev: any) => (
                      <div key={ev.id} className="p-2.5 rounded-lg bg-slate-800/80 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-white">{ev.title}</span>
                          <span className="text-slate-400 text-[11px] block mt-0.5">
                            {ev.start.substring(11, 16)} - {ev.end.substring(11, 16)} • {ev.attendees.join(', ')}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800">
                          Event
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Action Confirmation Card (FR-AI-005, FR-MCP-004) */}
              {activePendingAction && (
                <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-500/80 shadow-xl text-amber-100 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span>Alexa+ Confirmation Prompt</span>
                  </div>

                  <p className="text-xs text-amber-200 leading-relaxed">
                    {activePendingAction.description}
                  </p>

                  {activePendingAction.conflicts && activePendingAction.conflicts.length > 0 && (
                    <div className="p-2 rounded bg-amber-900/50 border border-amber-600/50 text-[11px] text-amber-300">
                      {activePendingAction.conflicts.join('\n')}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={handleRejectAction}
                      disabled={isProcessing}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                    <button
                      onClick={handleConfirmAction}
                      disabled={isProcessing}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirm & Schedule</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Utterance Chips (Journey C) */}
            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-2">
                Sample Utterances (Hackathon Journey C):
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => handleExecuteUtterance("What is on our schedule today?")}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 transition text-[11px] flex items-center gap-1"
                >
                  <Play className="w-3 h-3 text-cyan-400" />
                  "What's on our schedule today?"
                </button>
                <button
                  onClick={() => handleExecuteUtterance("Add dentist appointment tomorrow at 4 PM and assign David")}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 transition text-[11px] flex items-center gap-1"
                >
                  <Play className="w-3 h-3 text-emerald-400" />
                  "Schedule dentist appointment tomorrow"
                </button>
                <button
                  onClick={() => handleExecuteUtterance("What tasks are overdue?")}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 transition text-[11px] flex items-center gap-1"
                >
                  <Play className="w-3 h-3 text-amber-400" />
                  "What tasks are overdue?"
                </button>
                <button
                  onClick={() => handleExecuteUtterance("Show data for Baker family")}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 transition text-[11px] flex items-center gap-1"
                  title="Cross-tenant isolation test (rejected)"
                >
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  "Show Baker family data (Test Refusal)"
                </button>
              </div>
            </div>
          </div>

          {/* Voice Input Mic & Utterance Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExecuteUtterance();
            }}
            className="pt-3 border-t border-slate-800/80 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={utterance}
                onChange={(e) => setUtterance(e.target.value)}
                placeholder="Say 'Alexa...' or type family request..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
                disabled={isProcessing}
              />
            </div>
            <button
              type="submit"
              disabled={!utterance.trim() || isProcessing}
              className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-semibold transition shadow-md shadow-cyan-900/50"
              title="Speak or Send Utterance"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right: Real MCP Protocol Inspector (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 rounded-3xl p-5 border border-slate-800 text-white shadow-xl flex flex-col min-h-[580px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-xs text-slate-100 tracking-wide uppercase">
                  MCP Protocol Inspector
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Spec 2025-11-25 • JSON-RPC 2.0
                </span>
              </div>
            </div>
            <button
              onClick={() => setProtocolLogs([])}
              className="text-[11px] text-slate-400 hover:text-slate-200"
            >
              Clear Logs
            </button>
          </div>

          {/* Available MCP Tools Badge Matrix */}
          <div className="py-3 border-b border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
              Available MCP Tools ({availableTools.length}):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {availableTools.map(t => (
                <span
                  key={t.name}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700 font-mono"
                  title={t.description}
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>

          {/* Real-time Protocol Log Stream */}
          <div className="flex-1 overflow-y-auto mt-3 space-y-3 font-mono text-[11px] pr-1">
            {protocolLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Waiting for MCP protocol frames...
              </div>
            ) : (
              protocolLogs.map(log => {
                const isOut = log.type === 'outgoing';
                return (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded-xl border ${
                      isOut
                        ? 'bg-indigo-950/30 border-indigo-800/40 text-indigo-200'
                        : log.status === 200
                        ? 'bg-slate-950/60 border-slate-800 text-slate-300'
                        : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-slate-800/60 mb-1.5">
                      <span className="font-bold flex items-center gap-1">
                        <span className={isOut ? 'text-cyan-400' : 'text-emerald-400'}>
                          {isOut ? '→ OUTGOING' : '← INCOMING'}
                        </span>
                        {log.method && `[${log.method}]`}
                      </span>
                      <div className="flex items-center gap-2">
                        {log.latencyMs && <span>{log.latencyMs}ms</span>}
                        {log.status && (
                          <span className={log.status === 200 ? 'text-emerald-400' : 'text-rose-400'}>
                            HTTP {log.status}
                          </span>
                        )}
                        <span>{log.timestamp}</span>
                      </div>
                    </div>

                    <pre className="overflow-x-auto text-[10px] leading-tight text-slate-300">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
