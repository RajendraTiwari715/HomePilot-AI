import React, { useState } from 'react';
import { Sparkles, Loader2, ArrowUpRight, CornerDownLeft, Sparkle } from 'lucide-react';
import { Button } from './ui/Button';

interface CommandBarProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  isPlanRunning: boolean;
  error?: string | null;
}

export const DEMO_PRESETS = [
  {
    chip: 'Prepare to leave for 3 days',
    prompt:
      'I’m leaving home for three days. Prepare a departure checklist, remind my roommate to water the plants, add milk and eggs to my shopping list for when I return, and show me anything that still needs attention.',
  },
  {
    chip: 'What needs attention at home?',
    prompt:
      'Show me current plant hydration, low stock groceries, and pending chores that require attention.',
  },
  {
    chip: 'Add groceries for my return',
    prompt:
      'Add milk, eggs, and sourdough bread to my shopping list for when I return home.',
  },
];

export const CommandBar: React.FC<CommandBarProps> = ({
  onSubmit,
  isLoading,
  isPlanRunning,
  error,
}) => {
  const [prompt, setPrompt] = useState(
    'I’m leaving home for three days. Prepare a departure checklist, remind my roommate to water the plants, add milk and eggs to my shopping list for when I return, and show me anything that still needs attention.'
  );

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isLoading || isPlanRunning) return;
    onSubmit(prompt.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) or plain Enter without Shift
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <section className="w-full space-y-4">
      {/* Hero Headline */}
      <div className="space-y-1.5 text-left">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Delegate your household, not just ask for advice.
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 font-normal">
          HomePilot turns everyday requests into verified, real-world actions with human approval.
        </p>
      </div>

      {/* Elevated Command Card */}
      <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3 sm:p-4 shadow-xl backdrop-blur-md transition-all focus-within:border-cyan-500/60 focus-within:ring-1 focus-within:ring-cyan-500/30">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || isPlanRunning}
              rows={3}
              placeholder="Tell HomePilot what to handle…"
              className="w-full bg-transparent text-sm sm:text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none leading-relaxed transition-all disabled:opacity-50 disabled:cursor-not-allowed pr-4"
            />
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
            {/* Shortcut hint / Thinking state */}
            <div className="flex items-center gap-2">
              {isLoading ? (
                <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Thinking &amp; composing action plan...</span>
                </div>
              ) : isPlanRunning ? (
                <div className="flex items-center gap-2 text-xs text-blue-400 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing active plan...</span>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                  <span>Press</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[10px] text-zinc-400">
                    Ctrl + Enter
                  </kbd>
                  <span>or</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[10px] text-zinc-400">
                    ⌘ + Enter
                  </kbd>
                </div>
              )}
            </div>

            {/* Run Button */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!prompt.trim() || isLoading || isPlanRunning}
              isLoading={isLoading}
              icon={<Sparkles className="w-3.5 h-3.5 fill-current" />}
            >
              {isLoading ? 'Planning...' : isPlanRunning ? 'Plan Running' : 'Run HomePilot'}
            </Button>
          </div>
        </form>
      </div>

      {/* Validation / Error banner if present */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
          <span>{error}</span>
        </div>
      )}

      {/* Example Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[11px] font-medium text-zinc-500 mr-1 uppercase tracking-wider">
          Try demo:
        </span>
        {DEMO_PRESETS.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading || isPlanRunning}
            onClick={() => setPrompt(preset.prompt)}
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 hover:text-white transition-all disabled:opacity-40 select-none shadow-sm"
          >
            <Sparkle className="w-3 h-3 text-cyan-400/80 group-hover:text-cyan-400 transition-colors" />
            <span>{preset.chip}</span>
            <ArrowUpRight className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        ))}
      </div>
    </section>
  );
};
