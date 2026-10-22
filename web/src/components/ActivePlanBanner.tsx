import React from 'react';
import { ActionPlan, ActionPlanStatus } from '@homepilot/shared';
import { CheckCircle2, AlertCircle, Clock, PlayCircle, XCircle, ShieldAlert, Ban, RotateCcw } from 'lucide-react';

interface ActivePlanBannerProps {
  plan: ActionPlan;
  onCancel: () => void;
  isCancelling: boolean;
}

export const getStatusBadgeConfig = (status: ActionPlanStatus) => {
  switch (status) {
    case 'running':
      return {
        label: 'Running',
        bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
        dot: 'bg-blue-400 animate-ping',
        icon: PlayCircle
      };
    case 'awaiting_approval':
      return {
        label: 'Awaiting User Approval',
        bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
        dot: 'bg-amber-400 animate-pulse',
        icon: ShieldAlert
      };
    case 'completed':
      return {
        label: 'Completed & Persisted',
        bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
        dot: 'bg-emerald-400',
        icon: CheckCircle2
      };
    case 'failed':
      return {
        label: 'Execution Failed',
        bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
        dot: 'bg-rose-400',
        icon: AlertCircle
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        bg: 'bg-slate-700/50 border-slate-600 text-slate-400',
        dot: 'bg-slate-400',
        icon: XCircle
      };
    case 'draft':
    default:
      return {
        label: 'Planned',
        bg: 'bg-slate-800 border-slate-700 text-slate-300',
        dot: 'bg-slate-400',
        icon: Clock
      };
  }
};

export const ActivePlanBanner: React.FC<ActivePlanBannerProps> = ({
  plan,
  onCancel,
  isCancelling
}) => {
  const badge = getStatusBadgeConfig(plan.status);
  const StatusIcon = badge.icon;

  const totalSteps = plan.steps.length;
  const completedSteps = plan.steps.filter(s => s.status === 'succeeded').length;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-400">
              {plan.planId}
            </span>
            <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{badge.label}</span>
            </span>
            <span className="text-xs text-slate-500">
              Created {new Date(plan.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span>&ldquo;{plan.originalRequest}&rdquo;</span>
          </h2>
        </div>

        {/* Plan Controls */}
        <div className="flex items-center gap-2">
          {['running', 'awaiting_approval', 'draft'].includes(plan.status) && (
            <button
              onClick={onCancel}
              disabled={isCancelling}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all disabled:opacity-50"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{isCancelling ? 'Cancelling...' : 'Cancel Plan'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span>Execution Progress</span>
          <span className="font-semibold text-slate-200">
            {completedSteps} of {totalSteps} steps completed ({progressPercent}%)
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              plan.status === 'failed'
                ? 'bg-rose-500'
                : plan.status === 'completed'
                ? 'bg-emerald-400'
                : 'bg-cyan-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
