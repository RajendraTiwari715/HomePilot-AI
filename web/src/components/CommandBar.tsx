import React, { useState } from 'react';
import { Sparkles, Loader2, Send, CornerDownLeft, ArrowRight } from 'lucide-react';

interface CommandBarProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  isPlanRunning: boolean;
  error?: string | null;
}

export const SAMPLE_COMMANDS = [
  {
    label: 'Core Demo Scenario',
    prompt: 'I’m leaving home for three days. Prepare a departure checklist, remind my roommate to water the plants, add milk and eggs to my shopping list for when I return, and show me anything that still needs attention.'
  },
  {
    label: 'Quick Restock',
    prompt: 'Add whole milk, cold brew coffee, and sourdough bread to my shopping list.'
  },
  {
    label: 'Roommate Reminder',
    prompt: 'Remind my roommate to water the living room Fiddle Leaf Fig tomorrow morning.'
  },
  {
    label: 'Household Status',
    prompt: 'Show me current plant hydration, low stock groceries, and pending chores.'
  }
];

export const CommandBar: React.FC<CommandBarProps> = ({
  onSubmit,
  isLoading,
  isPlanRunning,
  error
}) => {
  const [prompt, setPrompt] = useState(
    'I’m leaving home for three days. Prepare a departure checklist, remind my roommate to water the plants, add milk and eggs to my shopping list for when I return, and show me anything that still needs attention.'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading || isPlanRunning) return;
    onSubmit(prompt.trim());
  };

  const handleSelectChip = (text: string) => {
    setPrompt(text);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl glow-blue">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Alexa+ Household Command</span>
        </div>
        <span className="text-xs text-slate-400">Natural Language Action Planner</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading || isPlanRunning}
            rows={3}
            placeholder="What should HomePilot prepare for your household?..."
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 resize-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />

          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium mr-1">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">Enter ↵</kbd>
            </span>
            <button
              type="submit"
              disabled={!prompt.trim() || isLoading || isPlanRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs tracking-wide shadow-md shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Planning...</span>
                </>
              ) : isPlanRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Executing Plan...</span>
                </>
              ) : (
                <>
                  <span>Run HomePilot</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <span className="font-semibold">Planning Error:</span> {error}
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Quick Demos:
          </span>
          {SAMPLE_COMMANDS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading || isPlanRunning}
              onClick={() => handleSelectChip(chip.prompt)}
              className="group flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-xs text-slate-300 hover:text-white transition-all disabled:opacity-40"
            >
              <span>{chip.label}</span>
              <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </button>
          ))}
        </div>
      </form>
    </div>
  );
};
