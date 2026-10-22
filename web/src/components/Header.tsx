import React from 'react';
import { Home, Radio, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  activeSessions?: number;
}

export const Header: React.FC<HeaderProps> = ({ isConnected, activeSessions = 0 }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Home className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                HomePilot <span className="text-cyan-400">AI</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300">
                Alexa+ Track
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Action-first household agent powered by Model Context Protocol (Streamable HTTP)
            </p>
          </div>
        </div>

        {/* Right Badges */}
        <div className="flex items-center gap-3">
          {/* Simulated Demo Data Badge (Non-negotiable requirement 9) */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Simulated demo data</span>
          </div>

          {/* Connection Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-medium">
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
            <span className={isConnected ? 'text-slate-200' : 'text-rose-300'}>
              {isConnected ? `MCP Online (Port 3001)` : 'MCP Offline'}
            </span>
            {isConnected && activeSessions > 0 && (
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-700 text-slate-300">
                {activeSessions} {activeSessions === 1 ? 'client' : 'clients'}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
