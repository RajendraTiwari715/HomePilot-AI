import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-zinc-800/80 bg-zinc-900/20 ${className}`}
    >
      <div className="w-10 h-10 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center text-zinc-400 mb-3 shadow-inner">
        <Icon className="w-5 h-5 text-zinc-400" />
      </div>
      <h4 className="text-xs font-semibold text-zinc-200 tracking-tight">{title}</h4>
      <p className="text-xs text-zinc-500 max-w-xs mt-1 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-3.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/20 transition-all"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
