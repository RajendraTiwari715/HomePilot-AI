import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api/client';
import { Header } from './components/Header';
import { CommandBar } from './components/CommandBar';
import { ActivePlanBanner } from './components/ActivePlanBanner';
import { ExecutionTimeline } from './components/ExecutionTimeline';
import { HouseholdStatusCards } from './components/HouseholdStatusCards';
import { ActionPlan } from '@homepilot/shared';
import { RefreshCw, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export function App() {
  const queryClient = useQueryClient();

  // 1. URL State Management for Plan Persistence across Refresh
  const [activePlanId, setActivePlanId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('planId');
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
  const { data: healthData, isError: isHealthError } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.getHealth(),
    refetchInterval: 8000,
    retry: 1
  });

  const isConnected = !isHealthError && !!healthData;

  // 3. Active Plan Query with Smart Polling (1.5s while active)
  const {
    data: plan,
    isLoading: isPlanLoading,
    error: planError,
    refetch: refetchPlan
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
    }
  });

  // 4. Household Status & Telemetry Query
  const {
    data: householdResult,
    isLoading: isHouseholdLoading,
    refetch: refetchHousehold
  } = useQuery({
    queryKey: ['household_status'],
    queryFn: () => api.getHouseholdStatus(),
    refetchInterval: 12000
  });

  // 5. Pending Actions Query
  const {
    data: pendingResult,
    isLoading: isPendingLoading,
    refetch: refetchPending
  } = useQuery({
    queryKey: ['pending_actions'],
    queryFn: () => api.getPendingActions(),
    refetchInterval: 12000
  });

  // Refetch household data when plan succeeds
  useEffect(() => {
    if (plan?.status === 'completed') {
      refetchHousehold();
      refetchPending();
    }
  }, [plan?.status, refetchHousehold, refetchPending]);

  // 6. Mutations
  const createPlanMutation = useMutation({
    mutationFn: (requestText: string) => api.createPlan(requestText, true),
    onSuccess: (newPlan) => {
      updateActivePlanId(newPlan.planId);
      queryClient.setQueryData(['plan', newPlan.planId], newPlan);
      refetchHousehold();
      refetchPending();
      setNotification({
        type: 'success',
        message: `Plan created successfully (${newPlan.steps.length} steps planned).`
      });
    },
    onError: (err) => {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to create plan'
      });
    }
  });

  const approveStepMutation = useMutation({
    mutationFn: ({ planId, stepId }: { planId: string; stepId: string }) =>
      api.approveStep(planId, stepId, 'Alexa User (Voice Confirmed)'),
    onSuccess: (updatedPlan) => {
      queryClient.setQueryData(['plan', updatedPlan.planId], updatedPlan);
      refetchHousehold();
      refetchPending();
      setNotification({
        type: 'success',
        message: 'Action approved. Plan execution resumed.'
      });
    },
    onError: (err) => {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Approval failed'
      });
    }
  });

  const rejectStepMutation = useMutation({
    mutationFn: ({ planId, stepId }: { planId: string; stepId: string }) =>
      api.rejectStep(planId, stepId, 'Rejected in Dashboard'),
    onSuccess: (updatedPlan) => {
      queryClient.setQueryData(['plan', updatedPlan.planId], updatedPlan);
      setNotification({
        type: 'success',
        message: 'Sensitive action rejected. Dependent steps skipped.'
      });
    }
  });

  const cancelPlanMutation = useMutation({
    mutationFn: (planId: string) => api.cancelPlan(planId, 'Cancelled by user in dashboard'),
    onSuccess: (updatedPlan) => {
      queryClient.setQueryData(['plan', updatedPlan.planId], updatedPlan);
      setNotification({
        type: 'success',
        message: 'Plan has been cancelled.'
      });
    }
  });

  const retryStepMutation = useMutation({
    mutationFn: ({ planId, stepId }: { planId: string; stepId: string }) =>
      api.retryStep(planId, stepId),
    onSuccess: (updatedPlan) => {
      queryClient.setQueryData(['plan', updatedPlan.planId], updatedPlan);
      setNotification({
        type: 'success',
        message: 'Step retry triggered. Resuming execution...'
      });
    }
  });

  const isActionInProgress =
    createPlanMutation.isPending ||
    approveStepMutation.isPending ||
    rejectStepMutation.isPending ||
    cancelPlanMutation.isPending ||
    retryStepMutation.isPending;

  const isPlanRunning = plan?.status === 'running';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/25">
      {/* Top Header */}
      <Header
        isConnected={isConnected}
        activeSessions={healthData?.activeSessions || 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Notification Toast */}
        {notification && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in duration-200 ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-0.5 rounded"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Command Bar */}
        <CommandBar
          onSubmit={(promptText) => createPlanMutation.mutate(promptText)}
          isLoading={createPlanMutation.isPending}
          isPlanRunning={isPlanRunning}
          error={createPlanMutation.error?.message}
        />

        {/* Active Plan & Execution Timeline (if plan is loaded) */}
        {plan && (
          <section className="space-y-4">
            <ActivePlanBanner
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
          </section>
        )}

        {/* Household Status & Persisted Data Section */}
        <section className="pt-2">
          <HouseholdStatusCards
            household={householdResult?.data}
            pendingActions={pendingResult?.data}
            isLoading={isHouseholdLoading || isPendingLoading}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-4 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>Amazon Developer Hackathon — Alexa+ Track</span>
          <span className="flex items-center gap-1.5 font-medium text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            Model Context Protocol (Streamable HTTP) + SQLite Persistence
          </span>
          <span className="text-slate-600">HomePilot AI v1.0.0</span>
        </div>
      </footer>
    </div>
  );
}
