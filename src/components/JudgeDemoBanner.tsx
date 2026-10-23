import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useFamily } from '../context/FamilyContext.js';
import { Users, RotateCcw, ShieldCheck, Radio } from 'lucide-react';

export const JudgeDemoBanner: React.FC<{ onNavigateToSimulator?: () => void }> = ({ onNavigateToSimulator }) => {
  const { user, role, switchUser } = useAuth();
  const { resetDemo } = useFamily();

  const personas = [
    { uid: 'user-sarah-1', name: 'Sarah', role: 'Owner', desc: 'Full permissions & role admin' },
    { uid: 'user-david-1', name: 'David', role: 'Admin', desc: 'Can manage all tasks & invites' },
    { uid: 'user-emily-1', name: 'Emily', role: 'Member', desc: 'Can edit own/assigned tasks' },
    { uid: 'user-leo-1', name: 'Leo', role: 'Viewer', desc: 'Child/read-only account' },
    { uid: 'user-baker-1', name: 'Bob Baker', role: 'Other Family', desc: 'Test multi-tenant isolation' }
  ];

  return (
    <div className="bg-slate-900 text-slate-100 text-xs py-2 px-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-inner">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-semibold text-emerald-400 tracking-wide uppercase text-[11px]">
          Hackathon Evaluation Bar:
        </span>
        <span className="text-slate-300 hidden sm:inline">
          Switch persona to test role permissions (Journey C)
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-slate-400 mr-1 flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> Personas:
        </span>
        {personas.map(p => {
          const isActive = user?.uid === p.uid;
          return (
            <button
              key={p.uid}
              onClick={() => switchUser(p.uid)}
              className={`px-2 py-1 rounded transition flex items-center gap-1 text-[11px] font-medium ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              title={p.desc}
            >
              <span>{p.name}</span>
              <span className={`text-[10px] px-1 rounded ${
                p.role === 'Owner' ? 'bg-amber-500/20 text-amber-300' :
                p.role === 'Admin' ? 'bg-blue-500/20 text-blue-300' :
                p.role === 'Member' ? 'bg-emerald-500/20 text-emerald-300' :
                p.role === 'Viewer' ? 'bg-purple-500/20 text-purple-300' :
                'bg-red-500/20 text-red-300'
              }`}>
                {p.role}
              </span>
            </button>
          );
        })}

        <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block"></div>

        <button
          onClick={resetDemo}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium flex items-center gap-1 transition"
          title="Reset tasks, events, and pending actions to clean initial seed data"
        >
          <RotateCcw className="w-3 h-3 text-slate-400" />
          <span>Reset Demo</span>
        </button>

        {onNavigateToSimulator && (
          <button
            onClick={onNavigateToSimulator}
            className="px-2.5 py-1 bg-indigo-500 hover:bg-indigo-400 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition shadow-sm ml-1"
          >
            <Radio className="w-3 h-3" />
            <span>Alexa+ MCP Live</span>
          </button>
        )}
      </div>
    </div>
  );
};
