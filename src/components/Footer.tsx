import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';

interface FooterProps {
  onNavigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-auto py-8 text-xs text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-800">CircleCare AI</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">
              Built for Amazon Developer Hackathon 2026 (Alexa+ Track)
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-4 text-xs">
            <button
              onClick={() => onNavigate('privacy')}
              className="hover:text-indigo-600 transition underline-offset-4 hover:underline"
            >
              Privacy Policy & Data Inventory
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => onNavigate('terms')}
              className="hover:text-indigo-600 transition underline-offset-4 hover:underline"
            >
              Terms & Conditions
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => onNavigate('cookies')}
              className="hover:text-indigo-600 transition underline-offset-4 hover:underline"
            >
              Cookie Policy
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => onNavigate('cookie-preferences')}
              className="hover:text-indigo-600 transition underline-offset-4 hover:underline"
            >
              Cookie Preferences
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-400 text-[11px]">
          <div>
            &copy; {new Date().getFullYear()} CircleCare AI. Multi-tenant privacy, role authorization, and MCP streamable protocol compliant.
          </div>
          <div className="flex items-center gap-1">
            Family coordination with peace of mind.
          </div>
        </div>
      </div>
    </footer>
  );
};
