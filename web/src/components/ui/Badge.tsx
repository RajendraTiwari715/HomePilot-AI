import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'emerald' | 'amber' | 'rose' | 'blue' | 'zinc';
  size?: 'xs' | 'sm';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'xs',
  icon,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    xs: 'px-2 py-0.5 text-[11px] gap-1',
    sm: 'px-2.5 py-1 text-xs gap-1.5',
  }[size];

  const variantStyles = {
    default: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60',
    accent: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
    blue: 'bg-blue-500/10 text-blue-300 border-blue-500/25',
    zinc: 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50',
  }[variant];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border tracking-tight ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
