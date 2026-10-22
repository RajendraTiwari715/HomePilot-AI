import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-800/60 ${className}`}
      {...props}
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-5 h-5 rounded-md" />
          <Skeleton className="w-28 h-4" />
        </div>
        <Skeleton className="w-14 h-4 rounded-full" />
      </div>
      <div className="space-y-2.5">
        <Skeleton className="w-full h-10 rounded-lg" />
        <Skeleton className="w-full h-10 rounded-lg" />
        <Skeleton className="w-3/4 h-10 rounded-lg" />
      </div>
    </div>
  );
};
