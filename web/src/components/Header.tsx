import React from 'react';
import { Bot, Radio, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Badge } from './ui/Badge';

interface HeaderProps {
  isConnected: boolean;
  activeSessions?: number;
  onRefreshHealth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isConnected,
  activeSessions = 0,
  onRefreshHealth
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: HomePilot Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-zinc-950 shadow-sm shadow-cyan-500/20">
            <Bot className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
              HomePilot <span className="text-cyan-400 font-mono text-xs">AI</span>
            </span>
            <span className="hidden sm:inline-flex text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
              Alexa+ Track
            </span>
          </div>
        </div>

        {/* Center: Environment Badge */}
        <div className="flex items-center">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Simulated demo data</span>
          </div>
        </div>

        {/* Right: MCP Connection Status */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefreshHealth}
            title={isConnected ? 'MCP Streamable HTTP online on port 3001' : 'Click to retry connection'}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 transition-colors"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span className="hidden sm:inline font-mono text-[11px]">
              {isConnected ? 'MCP: Streamable HTTP' : 'MCP: Offline'}
            </span>
            {isConnected && activeSessions > 0 && (
              <span className="text-[10px] font-mono text-zinc-400 px-1 py-0.2 rounded bg-zinc-800">
                {activeSessions} active
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
