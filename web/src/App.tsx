import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api/client';
import { Header } from './components/Header';
import { CommandBar } from './components/CommandBar';
import { ActivePlanCard } from './components/ActivePlanCard';
import { ExecutionTimeline } from './components/ExecutionTimeline';
import { HouseholdStatusCards } from './components/HouseholdStatusCards';
import { ErrorBanner } from './components/ui/ErrorBanner';
import { ActionPlan } from '@homepilot/shared';
import { CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, Terminal } from 'lucide-react';

export function App() {
  const queryClient = useQueryClient();

  // 1. URL State Management for Plan Persistence across Refresh
  const [activePlanId, setActivePlanId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('planId');
  });

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Sync activePlanId to URL
  const updateActivePlanId = (id: string | null) => {
    setActivePlanId(id);
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set('planId', id);
    } else {
      url.searchParams.delete('planId');
    }
    window.history.pushState({}, '', url.toString());
  };

  // 2. Health & Connection Query
  const {
    data: healthData,
    isError: isHealthError,
    refetch: refetchHealth,
    isFetching: isHealthFetching
  } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.getHealth(),
    refetchInterval: 8000,
    retry: 1,
  });

  const isConnected = !isHealthError && !!healthData;

  // 3. Active Plan Query with Smart Polling (1.5s while active)
  const {
    data: plan,
    isLoading: isPlanLoading,
    error: planError,
    refetch: refetchPlan,
  } = useQuery<ActionPlan, Error>({
    queryKey: ['plan', activePlanId],
    queryFn: () => api.getPlan(activePlanId!),
    enabled: !!activePlanId,
    refetchInterval: (query) => {
      const currentPlan = query.state.data;
      if (!currentPlan) return 1500;
      if (['running', 'awaiting_approval'].includes(currentPlan.status)) {
        return 1500;
      }
      return false; // Stop polling on completed, failed, cancelled
    },
  });

  // 4. Household Status & Telemetry Query
  const {
    data: householdResult,
    isLoading: isHouseholdLoading,
    refetch: refetchHousehold,
  } = useQuery({
    queryKey: ['household_status'],
    queryFn: () => api.getHouseholdStatus(),
    refetchInterval: 12000,
  });

  // 5. Pending Actions Query
  const {
    data: pendingResult,
    isLoading: isPendingLoading,
    refetch: refetchPending,
  } = useQuery({
    queryKey: ['pending_actions'],
    queryFn: () => api.getPendingActions(),
    refetchInterval: 12000,
  });

  // Auto-refresh household data when a plan completes
  useEffect(() => {
    if (plan?.status === 'completed') {
      refetchHousehold();
      refetchPending();
    }
  }, [plan?.status, refetchHousehold, refetchPending]);

  // 6. Plan Mutations
  const createPlanMutation = useMutation({
    mutationFn: (requestText: string) => api.createPlan(requestText, true),
    onSuccess: (newPlan) => {
      updateActivePlanId(newPlan.planId);
      queryClient.setQueryData(['plan', newPlan.planId], newPlan);
      refetchHousehold();
      refetchPending();
      setNotification({
        type: 'success',
        message: `Action plan composed with ${newPlan.steps.length} sequential steps.`,
      });
    },
    onError: (err) => {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to compose plan',
      });
    },
  });

  const approveStepMutation = useMutation({
    mutationFn: ({ planId, stepId }: { planId: string; stepId: string }) =>
      api.approveStep(planId, stepId, 'Alexa User (Confirmed)'),
    onSuccess: (updatedPlan) => {
      queryClient.setQueryData(['plan', updatedPlan.planId], updatedPlan);
      refetchHousehold();
      refetchPending();
      setNotification({
        type: 'success',
        message: 'Action approved. Plan execution resumed.',
      });
    },
    onError: (err) => {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Approval failed',
      });
    },
  });

  const rejectStepMutation = useMutation({
    mutationFn: ({ planId, stepId }: { planId: string; stepId: string }) =>
      api.rejectStep(planId, stepId, 'Rejected in Dashboard'),
    onSuccess: (updatedPlan) => {
      queryClient.setQueryData(['plan', updatedPlan.planId], updatedPlan);
      setNotification({
        type: 'success',
        message: 'Sensitive action rejected. Dependent steps skipped.',
      });
    },
  });

  const cancelPlanMutation = useMutation({
    mutationFn: (planId: string) =>
      api.cancelPlan(planId, 'Cancelled by user in dashboard'),
    onSuccess: (updatedPlan) => {
      queryClient.setQueryData(['plan', updatedPlan.planId], updatedPlan);
      setNotification({
        type: 'success',
        message: 'Active plan cancelled.',
      });
    },
  });

  const retryStepMutation = useMutation({
    mutationFn: ({ planId, stepId }: { planId: string; stepId: string }) =>
      api.retryStep(planId, stepId),
    onSuccess: (updatedPlan) => {
      queryClient.setQueryData(['plan', updatedPlan.planId], updatedPlan);
      setNotification({
        type: 'success',
        message: 'Retrying tool step execution...',
      });
    },
  });

  const isActionInProgress =
    createPlanMutation.isPending ||
    approveStepMutation.isPending ||
    rejectStepMutation.isPending ||
    cancelPlanMutation.isPending ||
    retryStepMutation.isPending;

  const isPlanRunning = plan?.status === 'running';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased selection:bg-cyan-500/25 selection:text-cyan-100">
      {/* Top Navigation Bar */}
      <Header
        isConnected={isConnected}
        activeSessions={healthData?.activeSessions || 0}
        onRefreshHealth={() => refetchHealth()}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Offline MCP Warning Banner (if connection fails) */}
        {!isConnected && (
          <ErrorBanner
            isMcpDisconnected
            title="MCP Server Disconnected"
            message="Cannot reach the HomePilot MCP backend on port 3001. Ensure the server is running."
            onRetry={() => refetchHealth()}
            isRetryLoading={isHealthFetching}
          />
        )}

        {/* Global Notification Toast */}
        {notification && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium transition-all duration-200 ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-zinc-400 hover:text-white text-xs px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Hero & Command Input Section */}
        <CommandBar
          onSubmit={(promptText) => createPlanMutation.mutate(promptText)}
          isLoading={createPlanMutation.isPending}
          isPlanRunning={isPlanRunning}
          error={createPlanMutation.error?.message}
        />

        {/* 12-Column Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Main Column (8 cols): Active Plan & Execution Timeline (Visual centerpiece!) */}
          <section className="lg:col-span-8 space-y-6">
            {plan ? (
              <>
                <ActivePlanCard
                  plan={plan}
                  onCancel={() => cancelPlanMutation.mutate(plan.planId)}
                  isCancelling={cancelPlanMutation.isPending}
                />

                <ExecutionTimeline
                  steps={plan.steps}
                  onApprove={(stepId) =>
                    approveStepMutation.mutate({ planId: plan.planId, stepId })
                  }
                  onReject={(stepId) =>
                    rejectStepMutation.mutate({ planId: plan.planId, stepId })
                  }
                  onRetry={(stepId) =>
                    retryStepMutation.mutate({ planId: plan.planId, stepId })
                  }
                  isActionInProgress={isActionInProgress}
                />
              </>
            ) : (
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-8 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center text-zinc-400 mx-auto">
                  <Terminal className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="font-semibold text-sm text-zinc-200">
                  Ready for instructions
                </h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                  Submit a natural language request above or click one of the quick demo chips. HomePilot will decompose it into sequential MCP actions with approval gates.
                </p>
              </div>
            )}
          </section>

          {/* Right Column (4 cols): Household Status, Departure Checklist, Reminders, Shopping List */}
          <aside className="lg:col-span-4">
            <HouseholdStatusCards
              household={householdResult?.data}
              pendingActions={pendingResult?.data}
              isLoading={isHouseholdLoading || isPendingLoading}
            />
          </aside>
        </div>
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 px-4 sm:px-6 lg:px-8 py-5 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <span>Amazon Developer Hackathon — Alexa+ Track</span>
          <span className="flex items-center gap-1.5 font-medium text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Streamable HTTP MCP Protocol &bull; SQLite Persistence
          </span>
          <span className="text-zinc-600 font-mono text-[11px]">HomePilot AI</span>
        </div>
      </footer>
    </div>
  );
}
