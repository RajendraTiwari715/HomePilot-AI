import React, { useState } from 'react';
import { PlanStep } from '@homepilot/shared';
import {
  Check,
  Loader2,
  Clock,
  AlertTriangle,
  X,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Slash,
  Terminal,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Button } from './ui/Button';
import { StatusPill } from './ui/StatusPill';

interface TimelineStepProps {
  step: PlanStep;
  index: number;
  isLast: boolean;
  onApprove: (stepId: string) => void;
  onReject: (stepId: string) => void;
  onRetry: (stepId: string) => void;
  isActionInProgress: boolean;
}

const getHumanReadableTitle = (toolName: string, args: Record<string, unknown>): string => {
  switch (toolName) {
    case 'get_household_status':
      return 'Inspect household telemetry, plant sensors & pantry stock';
    case 'create_departure_checklist':
      return `Generate departure safety checklist (${String(args.departureDate || 'today')} → ${String(args.returnDate || 'return')})`;
    case 'create_reminder':
      return `Schedule reminder for ${String(args.assignee || 'Roommate')}: "${String(args.title || 'Task')}"`;
    case 'update_shopping_list': {
      const items = Array.isArray(args.items) ? args.items.join(', ') : 'items';
      return `Update shopping list: ${String(args.operation || 'add').toUpperCase()} ${items}`;
    }
    case 'get_pending_actions':
      return 'Review pending chores, low-stock alerts & incomplete tasks';
    default:
      return `Execute tool: ${toolName}`;
  }
};

export const TimelineStep: React.FC<TimelineStepProps> = ({
  step,
  index,
  isLast,
  onApprove,
  onReject,
  onRetry,
  isActionInProgress,
}) => {
  const [isResultOpen, setIsResultOpen] = useState(false);
  const title = getHumanReadableTitle(step.toolName, step.arguments);

  // Status visual configurations per requirements
  const renderStatusCircle = () => {
    switch (step.status) {
      case 'running':
        return (
          <div className="w-7 h-7 rounded-full bg-blue-500/10 border-2 border-blue-500 text-blue-400 flex items-center justify-center shrink-0">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          </div>
        );
      case 'awaiting_approval':
        return (
          <div className="w-7 h-7 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-300 flex items-center justify-center shrink-0 animate-pulse shadow-sm shadow-amber-500/30">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          </div>
        );
      case 'succeeded':
        return (
          <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        );
      case 'failed':
        return (
          <div className="w-7 h-7 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        );
      case 'cancelled':
      case 'skipped':
        return (
          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500 flex items-center justify-center shrink-0">
            <Slash className="w-3.5 h-3.5" />
          </div>
        );
      case 'pending':
      default:
        return (
          <div className="w-7 h-7 rounded-full bg-zinc-900 border-2 border-zinc-700 text-zinc-500 flex items-center justify-center shrink-0 text-xs font-mono font-medium">
            {index + 1}
          </div>
        );
    }
  };

  return (
    <div className="relative flex items-start gap-4 group">
      {/* Vertical connecting line */}
      {!isLast && (
        <div
          className={`absolute left-[13px] top-8 bottom-0 w-0.5 transition-colors ${
            step.status === 'succeeded' ? 'bg-emerald-500/30' : 'bg-zinc-800'
          }`}
        />
      )}

      {/* Step circular status icon */}
      <div className="pt-0.5 z-10">{renderStatusCircle()}</div>

      {/* Step Content Card */}
      <div
        className={`flex-1 rounded-xl p-4 border transition-all duration-150 mb-4 ${
          step.status === 'awaiting_approval'
            ? 'border-amber-500/40 bg-amber-500/[0.04] shadow-md shadow-amber-500/5'
            : step.status === 'running'
            ? 'border-blue-500/40 bg-blue-500/[0.03] shadow-md'
            : step.status === 'failed'
            ? 'border-rose-500/30 bg-rose-500/[0.03]'
            : 'border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700/80'
        }`}
      >
        {/* Step Header */}
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800/90 text-cyan-300 border border-zinc-700/60">
                {step.toolName}
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                Step {index + 1}
              </span>
              {step.sensitive && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  Sensitive Action
                </span>
              )}
            </div>

            <h4 className="text-sm font-medium text-zinc-100 leading-snug">
              {title}
            </h4>
          </div>

          <StatusPill status={step.status} size="xs" />
        </div>

        {/* Arguments display: compact, readable JSON/code block */}
        <div className="mt-3 pt-2.5 border-t border-zinc-800/70">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1.5">
            <span className="font-mono uppercase text-[10px] tracking-wider">Arguments</span>
          </div>
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-2.5 font-mono text-[11px] text-zinc-300 overflow-x-auto">
            {Object.keys(step.arguments).length === 0 ? (
              <span className="text-zinc-500 italic">None (reads current system state)</span>
            ) : (
              <div className="space-y-1">
                {Object.entries(step.arguments).map(([key, value]) => (
                  <div key={key} className="flex items-baseline gap-2">
                    <span className="text-cyan-400/90 font-medium">{key}:</span>
                    <span className="text-zinc-300">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Timestamps & Audit Information */}
        {(step.startedAt || step.completedAt || step.approvedBy || step.rejectedBy) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500 font-mono">
            {step.startedAt && (
              <span>Started: {new Date(step.startedAt).toLocaleTimeString()}</span>
            )}
            {step.completedAt && (
              <span>Completed: {new Date(step.completedAt).toLocaleTimeString()}</span>
            )}
            {step.approvedBy && (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" />
                Approved by {step.approvedBy} ({new Date(step.approvedAt || '').toLocaleTimeString()})
              </span>
            )}
            {step.rejectedBy && (
              <span className="text-rose-400 font-medium flex items-center gap-1">
                <X className="w-3 h-3" />
                Rejected by {step.rejectedBy} ({new Date(step.rejectedAt || '').toLocaleTimeString()})
              </span>
            )}
          </div>
        )}

        {/* Approval Panel (Requirement 4 & 5: When sensitive action is awaiting approval) */}
        {step.status === 'awaiting_approval' && (
          <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-300">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-amber-200">
                  Explicit Human Approval Required
                </h5>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  HomePilot is preparing to schedule an external reminder for{' '}
                  <strong className="text-white font-semibold">
                    {String(step.arguments.assignee || 'Roommate')}
                  </strong>
                  . This will create a pending task in your household database.
                </p>
                <div className="text-[11px] text-zinc-400 font-mono bg-zinc-950/60 p-2 rounded border border-zinc-800 mt-2">
                  <span>Action: </span>
                  <span className="text-amber-300">{step.toolName}</span>
                  <span>({JSON.stringify(step.arguments)})</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-amber-500/20">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(step.stepId)}
                disabled={isActionInProgress}
                icon={<X className="w-3.5 h-3.5 text-zinc-400" />}
              >
                Reject Action
              </Button>
              <Button
                size="sm"
                variant="success"
                onClick={() => onApprove(step.stepId)}
                disabled={isActionInProgress}
                icon={<Check className="w-3.5 h-3.5" />}
              >
                Approve &amp; Execute
              </Button>
            </div>
          </div>
        )}

        {/* Error Callout with Retry Button */}
        {step.status === 'failed' && (
          <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-rose-200">Tool Execution Failed:</span>
                <span className="text-zinc-300">{step.error || 'Execution encountered an unhandled error.'}</span>
              </div>
            </div>
            <Button
              size="xs"
              variant="danger"
              onClick={() => onRetry(step.stepId)}
              disabled={isActionInProgress}
              icon={<RotateCcw className="w-3 h-3" />}
            >
              Retry Step
            </Button>
          </div>
        )}

        {/* Collapsible Tool Result Section */}
        {step.result && (
          <div className="mt-3 pt-2">
            <button
              type="button"
              onClick={() => setIsResultOpen(!isResultOpen)}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-cyan-400 transition-colors font-medium group"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400/80 group-hover:text-cyan-400" />
              <span>Tool Result</span>
              <span className="text-[10px] font-mono text-zinc-500">
                (ID: {step.result.actionId})
              </span>
              {isResultOpen ? (
                <ChevronUp className="w-3 h-3 text-zinc-500" />
              ) : (
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              )}
            </button>

            {isResultOpen && (
              <div className="mt-2 rounded-lg bg-zinc-950 border border-zinc-800 p-3 font-mono text-xs space-y-2 overflow-x-auto max-h-72">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{step.result.message}</span>
                </div>
                <pre className="text-zinc-400 text-[11px] leading-relaxed">
                  {JSON.stringify(step.result.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
