import React from 'react';
import { PlanStep } from '@homepilot/shared';
import { Layers, ShieldCheck, Clock, Terminal } from 'lucide-react';
import { TimelineStep } from './TimelineStep';
import { EmptyState } from './ui/EmptyState';

interface ExecutionTimelineProps {
  steps: PlanStep[];
  onApprove: (stepId: string) => void;
  onReject: (stepId: string) => void;
  onRetry: (stepId: string) => void;
  isActionInProgress: boolean;
}

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  steps,
  onApprove,
  onReject,
  onRetry,
  isActionInProgress,
}) => {
  if (!steps || steps.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6">
        <EmptyState
          icon={Terminal}
          title="No active plan steps"
          description="Submit a household command above to generate a verified, step-by-step action plan."
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 sm:p-6 shadow-md backdrop-blur-sm">
      {/* Timeline Header */}
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-zinc-100">
              Execution Timeline
            </h3>
            <p className="text-[11px] text-zinc-400">
              Deterministic, sequential MCP tool executions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>{steps.length} {steps.length === 1 ? 'Step' : 'Steps'}</span>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-1">
        {steps.map((step, idx) => (
          <TimelineStep
            key={step.stepId}
            step={step}
            index={idx}
            isLast={idx === steps.length - 1}
            onApprove={onApprove}
            onReject={onReject}
            onRetry={onRetry}
            isActionInProgress={isActionInProgress}
          />
        ))}
      </div>
    </div>
  );
};
