import React from 'react';
import { AlertCircle, RotateCcw, X, Radio } from 'lucide-react';
import { Button } from './Button';

export interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  isRetryLoading?: boolean;
  isMcpDisconnected?: boolean;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title,
  message,
  onRetry,
  onDismiss,
  isRetryLoading = false,
  isMcpDisconnected = false,
  className = '',
}) => {
  return (
    <div
      className={`rounded-xl p-4 border flex items-start justify-between gap-3 ${
        isMcpDisconnected
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        {isMcpDisconnected ? (
          <Radio className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
        ) : (
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        )}
        <div className="space-y-0.5">
          {title && (
            <h4 className="text-xs font-semibold tracking-tight text-white">{title}</h4>
          )}
          <p className="text-xs opacity-90 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <Button
            size="xs"
            variant={isMcpDisconnected ? 'secondary' : 'danger'}
            onClick={onRetry}
            isLoading={isRetryLoading}
            icon={<RotateCcw className="w-3 h-3" />}
          >
            Retry Connection
          </Button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
