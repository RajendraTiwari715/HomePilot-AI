import React, { useState } from 'react';
import { PlanStep, PlanStepStatus } from '@homepilot/shared';
import {
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
  X,
  Layers,
  Terminal
} from 'lucide-react';

interface ExecutionTimelineProps {
  steps: PlanStep[];
  onApprove: (stepId: string) => void;
  onReject: (stepId: string) => void;
  onRetry: (stepId: string) => void;
  isActionInProgress: boolean;
}

export const getStepBadge = (status: PlanStepStatus) => {
  switch (status) {
    case 'running':
      return {
        label: 'Running',
        pill: 'bg-blue-500/15 border-blue-500/40 text-blue-300',
        icon: Loader2,
        animate: 'animate-spin'
      };
    case 'awaiting_approval':
      return {
        label: 'Awaiting Approval',
        pill: 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold shadow-sm glow-amber',
        icon: ShieldAlert,
        animate: 'animate-pulse'
      };
    case 'succeeded':
      return {
        label: 'Succeeded',
        pill: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 font-medium',
        icon: CheckCircle2,
        animate: ''
      };
    case 'failed':
      return {
        label: 'Failed',
        pill: 'bg-rose-500/15 border-rose-500/30 text-rose-300 font-medium',
        icon: AlertTriangle,
        animate: ''
      };
    case 'skipped':
      return {
        label: 'Skipped',
        pill: 'bg-slate-800 border-slate-700 text-slate-400',
        icon: XCircle,
        animate: ''
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        pill: 'bg-slate-800 border-slate-700 text-slate-400',
        icon: XCircle,
        animate: ''
      };
    case 'pending':
    default:
      return {
        label: 'Pending',
        pill: 'bg-slate-800/80 border-slate-700 text-slate-400',
        icon: Clock,
        animate: ''
      };
  }
};

const getToolDescription = (toolName: string, args: Record<string, unknown>) => {
  switch (toolName) {
    case 'get_household_status':
      return 'Query plant telemetry, grocery stock, and safety alert telemetry.';
    case 'create_departure_checklist':
      return `Generate departure safety checklist for trip (${String(args.departureDate || 'Today')} to ${String(args.returnDate || 'Return')}).`;
    case 'create_reminder':
      return `Schedule reminder for ${String(args.assignee || 'Roommate')}: "${String(args.title || 'Task')}" (Due: ${String(args.dueDate || 'Soon')}).`;
    case 'update_shopping_list':
      return `Update shopping list: ${String(args.operation || 'add').toUpperCase()} ${(Array.isArray(args.items) ? args.items : []).join(', ')}.`;
    case 'get_pending_actions':
      return 'Aggregate incomplete checklist items, pending reminders, and low-stock staples.';
    default:
      return `Execute tool: ${toolName}`;
  }
};

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  steps,
  onApprove,
  onReject,
  onRetry,
  isActionInProgress
}) => {
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});

  const toggleExpand = (stepId: string) => {
    setExpandedResults(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-base text-slate-100">Live Execution Timeline</h3>
        </div>
        <span className="text-xs text-slate-400">Deterministic Sequential Order</span>
      </div>

      <div className="mt-6 space-y-5">
        {steps.map((step, idx) => {
          const badge = getStepBadge(step.status);
          const BadgeIcon = badge.icon;
          const isExpanded = !!expandedResults[step.stepId];
          const description = getToolDescription(step.toolName, step.arguments);

          return (
            <div
              key={step.stepId}
              className={`relative border rounded-xl p-4 transition-all ${
                step.status === 'awaiting_approval'
                  ? 'border-amber-500/50 bg-amber-500/5 shadow-md shadow-amber-500/10 glow-amber'
                  : step.status === 'running'
                  ? 'border-blue-500/40 bg-blue-500/5 shadow-md glow-blue'
                  : step.status === 'failed'
                  ? 'border-rose-500/30 bg-rose-500/5'
                  : 'border-slate-800 bg-slate-950/60'
              }`}
            >
              {/* Step Header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                    step.status === 'succeeded'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : step.status === 'failed'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : step.status === 'awaiting_approval'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                      : step.status === 'running'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {idx + 1}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-100">
                        {step.toolName}
                      </span>
                      {step.sensitive && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-amber-400" />
                          Sensitive Action
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{description}</p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${badge.pill}`}>
                    <BadgeIcon className={`w-3.5 h-3.5 ${badge.animate}`} />
                    <span>{badge.label}</span>
                  </div>
                </div>
              </div>

              {/* Arguments Pills */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Args:</span>
                {Object.entries(step.arguments).map(([key, value]) => (
                  <span
                    key={key}
                    className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
                  >
                    <span className="text-slate-500">{key}:</span> {Array.isArray(value) ? value.join(', ') : String(value)}
                  </span>
                ))}
              </div>

              {/* Timestamps */}
              {(step.startedAt || step.completedAt) && (
                <div className="mt-2 text-[10px] text-slate-500 flex flex-wrap gap-3">
                  {step.startedAt && <span>Started: {new Date(step.startedAt).toLocaleTimeString()}</span>}
                  {step.completedAt && <span>Completed: {new Date(step.completedAt).toLocaleTimeString()}</span>}
                  {step.approvedBy && (
                    <span className="text-emerald-400 font-medium">
                      Approved by {step.approvedBy} ({new Date(step.approvedAt || '').toLocaleTimeString()})
                    </span>
                  )}
                  {step.rejectedBy && (
                    <span className="text-rose-400 font-medium">
                      Rejected by {step.rejectedBy} ({new Date(step.rejectedAt || '').toLocaleTimeString()})
                    </span>
                  )}
                </div>
              )}

              {/* Approval Box for Sensitive Steps */}
              {step.status === 'awaiting_approval' && (
                <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 space-y-3">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                        Human Confirmation Required
                      </h4>
                      <p className="text-xs text-amber-200/90 mt-1">
                        HomePilot is about to dispatch a real external reminder message to{' '}
                        <strong className="text-white">{String(step.arguments.assignee || 'Roommate')}</strong>.
                        To prevent unintentional communication, explicit user approval is required before execution.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => onReject(step.stepId)}
                      disabled={isActionInProgress}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-rose-300 transition-all disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5 text-rose-400" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => onApprove(step.stepId)}
                      disabled={isActionInProgress}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-wide shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve &amp; Send</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Error Box & Retry */}
              {step.status === 'failed' && (
                <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{step.error || 'Unknown tool failure occurred.'}</span>
                  </div>
                  <button
                    onClick={() => onRetry(step.stepId)}
                    disabled={isActionInProgress}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shrink-0 transition-all"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry Step</span>
                  </button>
                </div>
              )}

              {/* Verified Result Accordion */}
              {step.result && (
                <div className="mt-3">
                  <button
                    onClick={() => toggleExpand(step.stepId)}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Verified Result (Action ID: {step.result.actionId})</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-64">
                      <div className="text-emerald-400 font-semibold mb-1">
                        ✓ {step.result.message}
                      </div>
                      <pre className="text-slate-400">{JSON.stringify(step.result.data, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
