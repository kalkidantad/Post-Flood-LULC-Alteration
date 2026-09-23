"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Header from "./Header";
import LimeChart from "./LimeChart";
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
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-lg border border-surface-border bg-surface-card text-sm text-gray-400">
      Loading map…
    </div>
  ),
});

interface DashboardClientProps {
  config: DashboardConfig;
  stats: ChangeStats;
  lime: LimeExplanations | null;
}

export default function DashboardClient({
  config,
  stats,
  lime,
}: DashboardClientProps) {
  const [period, setPeriod] = useState<TimePeriod>("post_persistence");

  return (
    <div className="flex min-h-screen flex-col">
      <Header config={config} />

      <main className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <TimeComparison stats={stats} selected={period} onChange={setPeriod} />

        <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-12">
          <section className="xl:col-span-8">
            <MapView config={config} stats={stats} limeSamples={lime?.local ?? []} />
          </section>

          <aside className="xl:col-span-4">
            <div className="rounded-lg border border-surface-border bg-surface-card p-4">
              <StatsPanel stats={stats} limeAccuracy={lime?.sklearn_validation_accuracy} />
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
        {" · "}SPARK 4.0 Nepal EO Hackathon · Landsat 9 · RF + LIME XAI
      </footer>
    </div>
  );
}
