import React from 'react';
import { ActionPlan } from '@homepilot/shared';
import { Ban, Clock, Zap, CheckCircle2, AlertCircle, PlayCircle, Layers } from 'lucide-react';
import { StatusPill } from './ui/StatusPill';
import { Button } from './ui/Button';

interface ActivePlanCardProps {
  plan: ActionPlan;
  onCancel: () => void;
  isCancelling: boolean;
}

export const ActivePlanCard: React.FC<ActivePlanCardProps> = ({
  plan,
  onCancel,
  isCancelling,
}) => {
  const totalSteps = plan.steps.length;
  const completedSteps = plan.steps.filter((s) => s.status === 'succeeded').length;
  const runningSteps = plan.steps.filter((s) => s.status === 'running').length;
  const awaitingSteps = plan.steps.filter((s) => s.status === 'awaiting_approval').length;
  const failedSteps = plan.steps.filter((s) => s.status === 'failed').length;
  const pendingSteps = plan.steps.filter((s) => s.status === 'pending').length;

  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const isCancellable = ['running', 'awaiting_approval', 'draft'].includes(plan.status);

  return (
    <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/80 p-5 shadow-md backdrop-blur-sm space-y-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusPill status={plan.status} size="sm" />
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
            {plan.planId}
          </span>
          <span className="text-xs text-zinc-500 font-medium">
            {new Date(plan.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {isCancellable && (
          <Button
            size="xs"
            variant="danger"
            onClick={onCancel}
            isLoading={isCancelling}
            icon={<Ban className="w-3 h-3" />}
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Plan'}
          </Button>
        )}
      </div>

      {/* Original Request Quote */}
      <div>
        <p className="text-sm font-medium text-zinc-200 leading-snug">
          &ldquo;{plan.originalRequest}&rdquo;
        </p>
      </div>

      {/* Progress & Step Metrics */}
      <div className="space-y-2 pt-2 border-t border-zinc-800/70">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-medium text-zinc-300">
            Progress ({completedSteps}/{totalSteps} steps completed)
          </span>
          <span className="font-mono font-semibold text-cyan-400">{progressPercent}%</span>
        </div>

        {/* Minimal Progress Bar */}
        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              plan.status === 'failed'
                ? 'bg-rose-500'
                : plan.status === 'completed'
                ? 'bg-emerald-400'
                : 'bg-cyan-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step Counts Breakdown */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
          {completedSteps > 0 && (
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {completedSteps} succeeded
            </span>
          )}
          {runningSteps > 0 && (
            <span className="inline-flex items-center gap-1 text-blue-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              {runningSteps} running
            </span>
          )}
          {awaitingSteps > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {awaitingSteps} awaiting approval
            </span>
          )}
          {pendingSteps > 0 && (
            <span className="inline-flex items-center gap-1 text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              {pendingSteps} pending
            </span>
          )}
          {failedSteps > 0 && (
            <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              {failedSteps} failed
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Backwards compatibility re-export
export { ActivePlanCard as ActivePlanBanner };
