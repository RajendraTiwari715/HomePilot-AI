import React from 'react';
import { HouseholdStatus, PendingActionsOverview } from '@homepilot/shared';
import {
  Droplets,
  ShoppingCart,
  CheckSquare,
  Bell,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Sparkles
} from 'lucide-react';

interface HouseholdStatusCardsProps {
  household?: HouseholdStatus | null;
  pendingActions?: PendingActionsOverview | null;
  isLoading: boolean;
}

export const HouseholdStatusCards: React.FC<HouseholdStatusCardsProps> = ({
  household,
  pendingActions,
  isLoading
}) => {
  if (isLoading && !household) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-48 rounded-2xl bg-slate-900/60 border border-slate-800" />
        ))}
      </div>
    );
  }

  const plants = household?.plants || [];
  const groceries = household?.groceries || [];
  const reminders = pendingActions?.pendingReminders || [];
  const checklist = pendingActions?.incompleteChecklist || [];
  const alerts = household?.alerts || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider">
            Household State &amp; SQLite Records
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          Persisted &amp; Simulated Telemetry
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Plants Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Droplets className="w-4 h-4" />
                <span>Indoor Plants</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">
                {plants.filter(p => p.needsWater).length} Needs Water
              </span>
            </div>

            <div className="space-y-2">
              {plants.map(p => (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-xl border text-xs ${
                    p.needsWater
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>{p.name}</span>
                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-mono ${
                      p.needsWater ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {p.moistureLevel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>{p.location}</span>
                    {p.needsWater && <span className="text-amber-400 font-semibold">Watering needed!</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-500">
            Source: Simulated Soil Sensor Telemetry
          </div>
        </div>

        {/* 2. Groceries & Shopping Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                <ShoppingCart className="w-4 h-4" />
                <span>Shopping &amp; Groceries</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono">
                {groceries.filter(g => g.isLowStock).length} Low Stock
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {groceries.map(g => (
                <div
                  key={g.id}
                  className={`p-2.5 rounded-xl border text-xs ${
                    g.isLowStock
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>{g.name}</span>
                    <span className="font-mono text-[11px]">
                      {g.quantity} {g.unit}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
                    <span className="capitalize">{g.category}</span>
                    {g.isLowStock && (
                      <span className="text-cyan-400 font-bold uppercase tracking-wider text-[9px]">
                        Low Stock Alert
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-500">
            Source: SQLite Shopping List &amp; Pantry
          </div>
        </div>

        {/* 3. Departure Checklist Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                <CheckSquare className="w-4 h-4" />
                <span>Departure Checklist</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono">
                {checklist.length} Tasks
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {checklist.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No active departure checklist. Run command to generate.
                </div>
              ) : (
                checklist.map(item => (
                  <div
                    key={item.id}
                    className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs flex items-start gap-2"
                  >
                    <div className="w-3.5 h-3.5 mt-0.5 rounded border border-slate-600 shrink-0" />
                    <div>
                      <span className="text-slate-200 font-medium leading-tight block">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-500 capitalize">
                        {item.category}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-500">
            Source: SQLite `departure_checklists`
          </div>
        </div>

        {/* 4. Active Reminders Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-violet-400 uppercase tracking-wider">
                <Bell className="w-4 h-4" />
                <span>Reminders &amp; Alerts</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 font-mono">
                {reminders.length} Active
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {reminders.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No pending reminders scheduled.
                </div>
              ) : (
                reminders.map(r => (
                  <div
                    key={r.id}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-semibold text-slate-200">{r.title}</span>
                      {r.isSensitive && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase shrink-0">
                          Roommate
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                      <span>Assignee: <strong className="text-slate-300">{r.assignee}</strong></span>
                      <span className="text-violet-300 font-mono">{r.dueDate}</span>
                    </div>
                  </div>
                ))
              )}

              {/* Away Mode Alert Badge */}
              {alerts.length > 0 && (
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] leading-tight">
                    {alerts[0].title}: {alerts[0].description}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-500">
            Source: SQLite `reminders` table
          </div>
        </div>
      </div>
    </div>
  );
};
