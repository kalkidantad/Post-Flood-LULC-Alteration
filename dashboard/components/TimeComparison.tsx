"use client";

import type { ChangeStats, MapViewMode, TimePeriod } from "@/lib/types";

interface TimeComparisonProps {
  stats: ChangeStats;
  selected: TimePeriod;
  onChange: (period: TimePeriod) => void;
  mapMode: MapViewMode;
  onMapModeChange: (mode: MapViewMode) => void;
}

const PERIOD_KEYS: TimePeriod[] = ["pre", "post_immediate", "post_persistence"];

export default function TimeComparison({
  stats,
  selected,
  onChange,
  mapMode,
  onMapModeChange,
}: TimeComparisonProps) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wider text-white">
          Temporal comparison
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onMapModeChange("main")}
            className={`rounded-lg px-3 py-1.5 text-xs ${
              mapMode === "main" ? "bg-accent/15 text-white" : "bg-black text-white ring-1 ring-white/10"
            }`}
          >
            🗺️ Main map
          </button>
          <button
            type="button"
            onClick={() => onMapModeChange("swipe")}
            className={`rounded-lg px-3 py-1.5 text-xs ${
              mapMode === "swipe" ? "bg-accent/15 text-white" : "bg-black text-white ring-1 ring-white/10"
            }`}
          >
            ↔️ Before / After
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {PERIOD_KEYS.map((key) => {
          const period = stats.periods[key];
          const isActive = selected === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`flex-1 rounded-lg px-3 py-3 text-left transition ${
                isActive ? "bg-accent/15 text-white" : "bg-black text-white ring-1 ring-white/10"
              }`}
            >
              <p className="text-xs font-medium">{period.label}</p>
              <p className="mt-1 text-xs text-white">
                {period.start} → {period.end}
              </p>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-white">
        Selecting a period updates default map layers (pre imagery vs flood transformation vs
        persistence / ML agreement).
      </p>
    </div>
  );
}
