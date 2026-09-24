"use client";

import { useMemo } from "react";
import AppShell from "./AppShell";
import AreaChartsPanel from "./AreaChartsPanel";
import HeroBanner from "./HeroBanner";
import KPICards from "./KPICards";
import LULCTransformationPanel from "./LULCTransformationPanel";
import StatsPanel from "./StatsPanel";
import { defaultCharts } from "@/lib/chartDefaults";
import type { ChangeStats, DashboardConfig, LimeExplanations } from "@/lib/types";

interface AreaStatisticsPageClientProps {
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

export default function AreaStatisticsPageClient({
  config,
  stats,
  lime,
}: AreaStatisticsPageClientProps) {
  const kpi = stats.kpi ?? {
    ...DEFAULT_KPI,
    study_area_km2: stats.summary.study_area_km2,
    newly_inundated_km2: stats.classes.find((c) => c.id === 1)?.area_km2 ?? 0,
    total_lulc_change_km2: stats.summary.changed_area_km2,
  };

  const transitions =
    stats.transitions?.length > 0 ? stats.transitions : DEFAULT_TRANSITIONS;

  const charts = useMemo(() => stats.charts ?? defaultCharts(stats), [stats]);

  return (
    <AppShell config={config}>
      <HeroBanner
        config={config}
        title="Area Statistics"
        subtitle="KPI summary, LULC transition tables, and chart views for flood-driven land cover change."
        compact
      />

      <KPICards kpi={kpi} />

      <LULCTransformationPanel
        transitions={transitions}
        studyAreaKm2={kpi.study_area_km2}
      />

      <AreaChartsPanel charts={charts} />

      <div className="card p-4">
        <StatsPanel stats={stats} limeAccuracy={lime?.sklearn_validation_accuracy} />
      </div>
    </AppShell>
  );
}
