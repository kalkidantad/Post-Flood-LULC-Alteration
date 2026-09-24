"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import AppShell from "./AppShell";
import HeroBanner from "./HeroBanner";
import KPICards from "./KPICards";
import MapInsightsSection from "./MapInsightsSection";
import TimeComparison from "./TimeComparison";
import { defaultMlComparison } from "@/lib/chartDefaults";
import { inspectPixel } from "@/lib/pixelInspect";
import { layersForPeriod } from "@/lib/periodLayers";
import type {
  ChangeStats,
  DashboardConfig,
  LimeExplanations,
  MapLayerId,
  MapViewMode,
  PixelInspection,
  TimePeriod,
} from "@/lib/types";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="map-shell flex items-center justify-center text-sm text-white/60">
      Loading map…
    </div>
  ),
});

const SwipeMapView = dynamic(() => import("./SwipeMapView"), {
  ssr: false,
  loading: () => (
    <div className="map-shell flex items-center justify-center text-sm text-white/60">
      Loading swipe compare…
    </div>
  ),
});

interface DashboardClientProps {
  config: DashboardConfig;
  stats: ChangeStats;
  lime: LimeExplanations | null;
  pixelSamples: PixelInspection[];
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
  pixelSamples,
}: DashboardClientProps) {
  const [period, setPeriod] = useState<TimePeriod>("post_immediate");
  const [mapMode, setMapMode] = useState<MapViewMode>("main");
  const [layerVisible, setLayerVisible] = useState<Record<MapLayerId, boolean>>(
    () => layersForPeriod("post_immediate")
  );
  const [inspection, setInspection] = useState<PixelInspection | null>(null);
  const [inspectMarker, setInspectMarker] = useState<[number, number] | null>(null);
  const [showLimeSamples, setShowLimeSamples] = useState(true);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7656/ingest/fa884f89-22ac-4292-bdf2-1e77989dda3a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c4750a" },
      body: JSON.stringify({
        sessionId: "c4750a",
        runId: "pre-fix",
        hypothesisId: "C",
        location: "DashboardClient.tsx:mount",
        message: "Client hydrated — DashboardClient mounted",
        data: { mapMode, period, dataSource: config.dataSource },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, []);

  useEffect(() => {
    setLayerVisible(layersForPeriod(period));
  }, [period]);

  const handlePixelInspect = useCallback(
    (lat: number, lng: number) => {
      setInspectMarker([lat, lng]);
      setInspection(inspectPixel(lat, lng, pixelSamples));
    },
    [pixelSamples]
  );

  const kpi = stats.kpi ?? {
    ...DEFAULT_KPI,
    study_area_km2: stats.summary.study_area_km2,
    newly_inundated_km2: stats.classes.find((c) => c.id === 1)?.area_km2 ?? 0,
    total_lulc_change_km2: stats.summary.changed_area_km2,
  };

  const transitions =
    stats.transitions?.length > 0 ? stats.transitions : DEFAULT_TRANSITIONS;

  const mlComparison = defaultMlComparison(stats);

  return (
    <AppShell config={config}>
        <HeroBanner config={config} />

        <KPICards kpi={kpi} />

        <TimeComparison
          stats={stats}
          selected={period}
          onChange={setPeriod}
          mapMode={mapMode}
          onMapModeChange={setMapMode}
        />

        <section className="map-shell w-full overflow-hidden rounded-3xl">
          {mapMode === "swipe" ? (
            <SwipeMapView
              config={config}
              stats={stats}
              onPixelInspect={handlePixelInspect}
              inspectMarker={inspectMarker}
            />
          ) : (
            <MapView
              config={config}
              stats={stats}
              limeSamples={lime?.local ?? []}
              layerVisible={layerVisible}
              onLayerVisibleChange={setLayerVisible}
              onPixelInspect={handlePixelInspect}
              inspectMarker={inspectMarker}
              showLimeSamples={showLimeSamples}
              onToggleLimeSamples={() => setShowLimeSamples((v) => !v)}
            />
          )}
        </section>

        <MapInsightsSection
          transitions={transitions}
          studyAreaKm2={kpi.study_area_km2}
          totalChangeKm2={kpi.total_lulc_change_km2}
          lime={lime}
          inspection={inspection}
          mlComparison={mlComparison}
          stats={stats}
          limeAccuracy={lime?.sklearn_validation_accuracy}
        />
    </AppShell>
  );
}
