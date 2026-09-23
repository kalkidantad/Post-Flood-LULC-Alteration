"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Header from "./Header";
import InundationInsightPanel from "./InundationInsightPanel";
import KPICards from "./KPICards";
import LimeChart from "./LimeChart";
import LULCTransformationPanel from "./LULCTransformationPanel";
import StatsPanel from "./StatsPanel";
import TimeComparison from "./TimeComparison";
import type {
  ChangeStats,
  DashboardConfig,
  LimeExplanations,
  TimePeriod,
} from "@/lib/types";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[480px] items-center justify-center rounded-lg border border-surface-border bg-surface-card text-sm text-gray-400">
      Loading map…
    </div>
  ),
});

interface DashboardClientProps {
  config: DashboardConfig;
  stats: ChangeStats;
  lime: LimeExplanations | null;
}

const DEFAULT_KPI = {
  newly_inundated_km2: 0,
  total_lulc_change_km2: 0,
  agriculture_to_water_km2: 0,
  vegetation_to_water_km2: 0,
  builtup_to_water_km2: 0,
  study_area_km2: 0,
};

const DEFAULT_TRANSITIONS = [
  { pre: "Agriculture", post: "Water", emoji: "🌊", area_km2: 0 },
  { pre: "Vegetation", post: "Water", emoji: "🌊", area_km2: 0 },
  { pre: "Built-up", post: "Water", emoji: "🌊", area_km2: 0 },
  { pre: "Vegetation", post: "Bare Soil", emoji: "🟤", area_km2: 0 },
  { pre: "Agriculture", post: "Bare Soil", emoji: "🟤", area_km2: 0 },
];

export default function DashboardClient({
  config,
  stats,
  lime,
}: DashboardClientProps) {
  const [period, setPeriod] = useState<TimePeriod>("post_immediate");

  const kpi = stats.kpi ?? {
    ...DEFAULT_KPI,
    study_area_km2: stats.summary.study_area_km2,
    newly_inundated_km2: stats.classes.find((c) => c.id === 1)?.area_km2 ?? 0,
    total_lulc_change_km2: stats.summary.changed_area_km2,
  };

  const transitions =
    stats.transitions && stats.transitions.length > 0
      ? stats.transitions
      : DEFAULT_TRANSITIONS;

  return (
    <div className="flex min-h-screen flex-col">
      <Header config={config} />

      <main className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <TimeComparison stats={stats} selected={period} onChange={setPeriod} />

        <KPICards kpi={kpi} />

        <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-12">
          <section className="xl:col-span-7">
            <MapView
              config={config}
              stats={stats}
              limeSamples={lime?.local ?? []}
            />
          </section>

          <aside className="flex flex-col gap-4 xl:col-span-5">
            <LULCTransformationPanel transitions={transitions} />
            <InundationInsightPanel lime={lime} />
            <div className="rounded-lg border border-surface-border bg-surface-card p-4">
              <StatsPanel
                stats={stats}
                limeAccuracy={lime?.sklearn_validation_accuracy}
              />
            </div>
          </aside>
        </div>

        <section className="rounded-lg border border-surface-border bg-surface-card p-4">
          {lime ? (
            <LimeChart
              globalData={lime.global}
              localSamples={lime.local}
              method={lime.method}
            />
          ) : (
            <div className="py-8 text-center text-sm text-gray-400">
              <p className="font-medium text-gray-300">LIME explanations not loaded</p>
              <p className="mt-2">
                Export CSV from GEE → run{" "}
                <code className="text-accent">python scripts/run_lime_xai.py</code>
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-surface-border px-6 py-3 text-center text-xs text-gray-500">
        <span className="font-semibold tracking-wide text-gray-400">TerraTrace</span>
        {" · "}SPARK 4.0 Nepal EO Hackathon · Landsat 9 · RF spatial hold-out + LIME XAI
      </footer>
    </div>
  );
}
