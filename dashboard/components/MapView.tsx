"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type {
  ChangeStats,
  DashboardConfig,
  Hotspot,
  LimeLocalExplanation,
} from "@/lib/types";
import LayerControl from "./LayerControl";

interface MapViewProps {
  config: DashboardConfig;
  stats: ChangeStats;
  limeSamples?: LimeLocalExplanation[];
}

/** Fix map size after dynamic mount — avoids Leaflet pane errors */
function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // map unmounted
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [map]);
  return null;
}

function severityColor(severity: Hotspot["severity"]) {
  switch (severity) {
    case "high":
      return "#e17055";
    case "medium":
      return "#fdcb6e";
    default:
      return "#74b9ff";
  }
}

function classColor(classes: ChangeStats["classes"], classId?: number) {
  return classes.find((c) => c.id === classId)?.color ?? "#636e72";
}

function safeCoord(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

export default function MapView({ config, stats, limeSamples = [] }: MapViewProps) {
  const isReal = config.dataSource === "real";

  const [visibleLayers, setVisibleLayers] = useState<Record<number, boolean>>(
    () => Object.fromEntries(stats.classes.map((c) => [c.id, true]))
  );
  const [showHotspots, setShowHotspots] = useState(true);
  const [showLimeSamples, setShowLimeSamples] = useState(true);

  const center = useMemo(
    (): [number, number] => [
      safeCoord(config.mapCenter?.[0], 27.85),
      safeCoord(config.mapCenter?.[1], 85.75),
    ],
    [config.mapCenter]
  );

  const zoom = safeCoord(config.mapZoom, 10);
  const mapKey = `${center[0].toFixed(3)}-${center[1].toFixed(3)}-${zoom}`;

  const eeTileUrl = process.env.NEXT_PUBLIC_EE_TILE_URL;

  const toggleLayer = (classId: number) => {
    setVisibleLayers((prev) => ({ ...prev, [classId]: !prev[classId] }));
  };

  const filteredHotspots = stats.hotspots.filter(
    (h) => h.class_id === undefined || visibleLayers[h.class_id] !== false
  );

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-lg border border-surface-border">
      <MapContainer
        key={mapKey}
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        <MapResizeFix />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {eeTileUrl && (
          <TileLayer
            attribution="Google Earth Engine"
            url={eeTileUrl}
            opacity={0.65}
          />
        )}

        {isReal &&
          showHotspots &&
          filteredHotspots.map((spot, i) => (
            <CircleMarker
              key={`${spot.name}-${i}`}
              center={[spot.lat, spot.lng]}
              radius={10 + (spot.hotspot_score ?? 0)}
              pathOptions={{
                color: severityColor(spot.severity),
                fillColor: classColor(stats.classes, spot.class_id),
                fillOpacity: 0.45,
                weight: 2,
              }}
            >
              <Popup>
                <strong>{spot.name}</strong>
                <br />
                Severity: {spot.severity}
                {spot.hotspot_score !== undefined && (
                  <>
                    <br />
                    Hotspot score: {spot.hotspot_score.toFixed(1)}
                  </>
                )}
              </Popup>
            </CircleMarker>
          ))}

        {showLimeSamples &&
          limeSamples.map((s) => (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lng]}
              radius={7}
              pathOptions={{
                color: "#6c5ce7",
                fillColor: "#6c5ce7",
                fillOpacity: 0.7,
                weight: 2,
              }}
            >
              <Popup>
                <strong>LIME sample</strong>
                <br />
                {s.class_name}
                <br />
                {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
              </Popup>
            </CircleMarker>
          ))}

        {!isReal &&
          stats.classes
            .filter((c) => c.id !== 0 && visibleLayers[c.id])
            .flatMap((cls, classIdx) =>
              Array.from({ length: Math.max(2, Math.round(cls.area_km2 / 3)) }).map(
                (_, i) => {
                  const lat =
                    config.mapCenter[0] + (classIdx - 2) * 0.06 + (i % 3) * 0.02;
                  const lng =
                    config.mapCenter[1] + (i % 4) * 0.04 - 0.06 + classIdx * 0.01;
                  return (
                    <CircleMarker
                      key={`${cls.id}-${i}`}
                      center={[lat, lng]}
                      radius={6 + (cls.id % 3) * 2}
                      pathOptions={{
                        color: cls.color,
                        fillColor: cls.color,
                        fillOpacity: 0.55,
                        weight: 1,
                      }}
                    >
                      <Popup>
                        <strong>{cls.name}</strong>
                        <br />
                        ~{cls.area_km2} km² (sample data)
                      </Popup>
                    </CircleMarker>
                  );
                }
              )
            )}

        {!isReal &&
          showHotspots &&
          stats.hotspots.map((spot) => (
            <CircleMarker
              key={spot.name}
              center={[spot.lat, spot.lng]}
              radius={14}
              pathOptions={{
                color: severityColor(spot.severity),
                fillColor: severityColor(spot.severity),
                fillOpacity: 0.25,
                weight: 2,
              }}
            >
              <Popup>
                <strong>{spot.name}</strong>
                <br />
                Severity: {spot.severity}
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>

      <LayerControl
        classes={stats.classes}
        visibleLayers={visibleLayers}
        onToggle={toggleLayer}
        showHotspots={showHotspots}
        onToggleHotspots={() => setShowHotspots((v) => !v)}
        showLimeSamples={limeSamples.length > 0 ? showLimeSamples : undefined}
        onToggleLimeSamples={
          limeSamples.length > 0 ? () => setShowLimeSamples((v) => !v) : undefined
        }
      />

      {!isReal && (
        <div className="absolute right-3 top-3 z-[1000] rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-300">
          Demo map — replace with real GEE exports
        </div>
      )}
    </div>
  );
}
