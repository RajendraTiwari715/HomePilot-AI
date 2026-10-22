import React from 'react';
import {
  Check,
  Loader2,
  Clock,
  AlertTriangle,
  X,
  ShieldAlert,
  Slash
} from 'lucide-react';

export type SemanticStatus =
  | 'draft'
  | 'pending'
  | 'awaiting_approval'
  | 'running'
  | 'succeeded'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'skipped';

export interface StatusPillProps {
  status: SemanticStatus;
  label?: string;
  size?: 'xs' | 'sm';
  showIcon?: boolean;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  label,
  size = 'xs',
  showIcon = true,
  className = '',
}) => {
  const config = {
    draft: {
      text: label || 'Draft',
      bg: 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400',
      icon: Clock,
      dot: 'border-zinc-500',
      iconClass: 'text-zinc-500',
    },
    pending: {
      text: label || 'Pending',
      bg: 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400',
      icon: Clock,
      dot: 'border-zinc-500',
      iconClass: 'text-zinc-500',
    },
    awaiting_approval: {
      text: label || 'Awaiting Approval',
      bg: 'bg-amber-500/10 border-amber-500/35 text-amber-300 font-semibold shadow-sm',
      icon: ShieldAlert,
      dot: 'bg-amber-400 animate-pulse',
      iconClass: 'text-amber-400',
    },
    running: {
      text: label || 'Running',
      bg: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
      icon: Loader2,
      dot: 'bg-blue-400 animate-ping',
      iconClass: 'text-blue-400 animate-spin',
    },
    succeeded: {
      text: label || 'Succeeded',
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
      icon: Check,
      dot: 'bg-emerald-400',
      iconClass: 'text-emerald-400',
    },
    completed: {
      text: label || 'Completed',
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
      icon: Check,
      dot: 'bg-emerald-400',
      iconClass: 'text-emerald-400',
    },
    failed: {
      text: label || 'Failed',
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
      icon: AlertTriangle,
      dot: 'bg-rose-400',
      iconClass: 'text-rose-400',
    },
    cancelled: {
      text: label || 'Cancelled',
      bg: 'bg-zinc-800/50 border-zinc-700 text-zinc-400',
      icon: X,
      dot: 'bg-zinc-500',
      iconClass: 'text-zinc-500',
    },
    skipped: {
      text: label || 'Skipped',
      bg: 'bg-zinc-800/50 border-zinc-700 text-zinc-400',
      icon: Slash,
      dot: 'bg-zinc-500',
      iconClass: 'text-zinc-500',
    },
  }[status] || {
    text: label || status,
    bg: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    icon: Clock,
    dot: 'bg-zinc-500',
    iconClass: 'text-zinc-500',
  };

  const Icon = config.icon;
  const sizeStyles = size === 'xs' ? 'px-2 py-0.5 text-[11px] gap-1.5' : 'px-2.5 py-1 text-xs gap-2';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border tracking-tight ${sizeStyles} ${config.bg} ${className}`}
    >
      {showIcon && <Icon className={`w-3 h-3 ${config.iconClass}`} />}
      <span>{config.text}</span>
    </span>
  );
};
