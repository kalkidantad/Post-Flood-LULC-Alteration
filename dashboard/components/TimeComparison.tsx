"use client";

import type { ChangeStats, TimePeriod } from "@/lib/types";

interface TimeComparisonProps {
  stats: ChangeStats;
  selected: TimePeriod;
  onChange: (period: TimePeriod) => void;
}

const PERIOD_KEYS: TimePeriod[] = ["pre", "post_immediate", "post_persistence"];

export default function TimeComparison({
  stats,
  selected,
  onChange,
}: TimeComparisonProps) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-4">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
        Temporal comparison
      </h2>
      <div className="flex flex-col gap-2 sm:flex-row">
        {PERIOD_KEYS.map((key) => {
          const period = stats.periods[key];
          const isActive = selected === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`flex-1 rounded-lg border px-3 py-3 text-left transition ${
                isActive
                  ? "border-accent bg-accent/15 text-white"
                  : "border-surface-border bg-surface text-gray-300 hover:border-gray-500"
              }`}
            >
              <p className="text-xs font-medium">{period.label}</p>
              <p className="mt-1 text-xs text-gray-400">
                {period.start} → {period.end}
              </p>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Core logic: detect change → track through time → separate temporary vs
        persistent → classify transformation.
      </p>
    </div>
  );
}
