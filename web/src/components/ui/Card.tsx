import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  bordered?: boolean;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  elevated = true,
  bordered = true,
  interactive = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`
        rounded-xl
        ${elevated ? 'bg-zinc-900/70 backdrop-blur-sm' : 'bg-zinc-900/40'}
        ${bordered ? 'border border-zinc-800/80' : ''}
        ${interactive ? 'hover:border-zinc-700/80 hover:bg-zinc-900/90 transition-all duration-150 cursor-pointer' : ''}
        shadow-sm
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between gap-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
};
