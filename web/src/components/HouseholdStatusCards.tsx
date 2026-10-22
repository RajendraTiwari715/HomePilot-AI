import React, { useState } from 'react';
import { HouseholdStatus, PendingActionsOverview } from '@homepilot/shared';
import {
  Droplets,
  ShoppingCart,
  CheckSquare,
  Bell,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Check,
  PackageCheck
} from 'lucide-react';
import { CardSkeleton } from './ui/Skeleton';
import { EmptyState } from './ui/EmptyState';
import { Badge } from './ui/Badge';

interface HouseholdStatusCardsProps {
  household?: HouseholdStatus | null;
  pendingActions?: PendingActionsOverview | null;
  isLoading: boolean;
  className?: string;
}

export const HouseholdStatusCards: React.FC<HouseholdStatusCardsProps> = ({
  household,
  pendingActions,
  isLoading,
  className = '',
}) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  if (isLoading && !household) {
    return (
      <div className={`space-y-4 ${className}`}>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const plants = household?.plants || [];
  const groceries = household?.groceries || [];
  const reminders = pendingActions?.pendingReminders || [];
  const checklist = pendingActions?.incompleteChecklist || [];
  const alerts = household?.alerts || [];

  const plantsNeedingWater = plants.filter((p) => p.needsWater).length;
  const lowStockCount = groceries.filter((g) => g.isLowStock).length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between pb-1">
        <h3 className="font-semibold text-xs uppercase tracking-wider text-zinc-400">
          Household State &amp; SQLite Data
        </h3>
        <span className="text-[10px] font-mono text-zinc-500">Auto-synced</span>
      </div>

      {/* 1. Departure Checklist Card */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <CheckSquare className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-zinc-200">Departure Checklist</span>
          </div>
          <Badge variant={checklist.length > 0 ? 'blue' : 'zinc'} size="xs">
            {checklist.length} {checklist.length === 1 ? 'task' : 'tasks'}
          </Badge>
        </div>

        {checklist.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No departure checklist"
            description="Run the departure command to generate safety tasks."
          />
        ) : (
          <div className="space-y-1.5">
            {checklist.slice(0, expandedCard === 'checklist' ? undefined : 4).map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2.5 p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/70 text-xs"
              >
                <div className="w-3.5 h-3.5 mt-0.5 rounded border border-zinc-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-zinc-200 font-medium block truncate leading-tight">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-zinc-500 capitalize">{item.category}</span>
                </div>
              </div>
            ))}

            {checklist.length > 4 && (
              <button
                onClick={() =>
                  setExpandedCard(expandedCard === 'checklist' ? null : 'checklist')
                }
                className="w-full text-center py-1 text-[11px] text-zinc-400 hover:text-cyan-400 font-medium transition-colors"
              >
                {expandedCard === 'checklist'
                  ? 'Show fewer'
                  : `+${checklist.length - 4} more tasks`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Scheduled Reminders Card */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-zinc-200">Reminders</span>
          </div>
          <Badge variant={reminders.length > 0 ? 'accent' : 'zinc'} size="xs">
            {reminders.length} active
          </Badge>
        </div>

        {reminders.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No pending reminders"
            description="Reminders for roommates or tasks will appear here."
          />
        ) : (
          <div className="space-y-1.5">
            {reminders.slice(0, expandedCard === 'reminders' ? undefined : 3).map((r) => (
              <div
                key={r.id}
                className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/70 text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-medium text-zinc-200 truncate">{r.title}</span>
                  {r.isSensitive && (
                    <Badge variant="amber" size="xs">
                      Roommate
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>To: <strong className="text-zinc-300">{r.assignee}</strong></span>
                  <span className="font-mono text-[10px] text-cyan-400/90">{r.dueDate}</span>
                </div>
              </div>
            ))}

            {reminders.length > 3 && (
              <button
                onClick={() =>
                  setExpandedCard(expandedCard === 'reminders' ? null : 'reminders')
                }
                className="w-full text-center py-1 text-[11px] text-zinc-400 hover:text-cyan-400 font-medium transition-colors"
              >
                {expandedCard === 'reminders'
                  ? 'Show fewer'
                  : `+${reminders.length - 3} more reminders`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Shopping & Groceries Card */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-zinc-200">Shopping List</span>
          </div>
          <Badge variant={lowStockCount > 0 ? 'accent' : 'zinc'} size="xs">
            {groceries.length} items
          </Badge>
        </div>

        {groceries.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Shopping list empty"
            description="Items added by HomePilot will persist in SQLite here."
          />
        ) : (
          <div className="space-y-1.5">
            {groceries.slice(0, expandedCard === 'groceries' ? undefined : 4).map((g) => (
              <div
                key={g.id}
                className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                  g.isLowStock
                    ? 'bg-cyan-500/[0.06] border-cyan-500/30 text-cyan-200'
                    : 'bg-zinc-950/60 border-zinc-800/70 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-medium truncate">{g.name}</span>
                  {g.isLowStock && (
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-semibold tracking-wide">
                      Low
                    </span>
                  )}
                </div>
                <span className="font-mono text-[11px] text-zinc-400 shrink-0">
                  {g.quantity} {g.unit}
                </span>
              </div>
            ))}

            {groceries.length > 4 && (
              <button
                onClick={() =>
                  setExpandedCard(expandedCard === 'groceries' ? null : 'groceries')
                }
                className="w-full text-center py-1 text-[11px] text-zinc-400 hover:text-cyan-400 font-medium transition-colors"
              >
                {expandedCard === 'groceries'
                  ? 'Show fewer'
                  : `+${groceries.length - 4} more items`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Indoor Plants & Sensors Card */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Droplets className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-zinc-200">Indoor Plants</span>
          </div>
          <Badge
            variant={plantsNeedingWater > 0 ? 'amber' : 'emerald'}
            size="xs"
          >
            {plantsNeedingWater > 0 ? `${plantsNeedingWater} needs water` : 'Hydrated'}
          </Badge>
        </div>

        {plants.length === 0 ? (
          <EmptyState
            icon={Droplets}
            title="No plant sensors"
            description="Simulated soil moisture telemetry will appear here."
          />
        ) : (
          <div className="space-y-1.5">
            {plants.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                  p.needsWater
                    ? 'bg-amber-500/[0.07] border-amber-500/35 text-amber-200'
                    : 'bg-zinc-950/60 border-zinc-800/70 text-zinc-300'
                }`}
              >
                <div>
                  <div className="font-medium text-zinc-200">{p.name}</div>
                  <div className="text-[10px] text-zinc-500">{p.location}</div>
                </div>
                <div className="text-right">
                  <span
                    className={`font-mono text-[11px] font-semibold ${
                      p.needsWater ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {p.moistureLevel}
                  </span>
                  <div className="text-[9px] text-zinc-500">
                    {p.needsWater ? 'Needs water' : 'Optimal'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Safety Alert (if any) */}
      {alerts.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div className="space-y-0.5">
            <span className="font-semibold block text-amber-200">{alerts[0].title}</span>
            <p className="text-[11px] text-zinc-300 leading-tight">{alerts[0].description}</p>
          </div>
        </div>
      )}
    </div>
  );
};
