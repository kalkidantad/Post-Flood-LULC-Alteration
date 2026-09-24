"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import {
  activeLegendType,
  defaultLayerVisibility,
  MAP_LAYER_DEFS,
  resolveTileUrl,
  visibleClassIds,
} from "@/lib/mapLayers";
import { transformationColor } from "@/lib/layerPalette";
import type {
  ChangeStats,
  DashboardConfig,
  Hotspot,
  LimeLocalExplanation,
  MapLayerId,
} from "@/lib/types";
import LayerControl from "./LayerControl";
import MapLegend from "./MapLegend";

interface MapViewProps {
  config: DashboardConfig;
  stats: ChangeStats;
  limeSamples?: LimeLocalExplanation[];
}

function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // unmounted
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [map]);
  return null;
}

function severityColor(severity: Hotspot["severity"]) {
  switch (severity) {
    case "high":
      return "#FF0000";
    case "medium":
      return "#FFA500";
    default:
      return "#FFFF00";
  }
}

function safeCoord(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

export default function MapView({ config, stats, limeSamples = [] }: MapViewProps) {
  const isReal = config.dataSource === "real";

  const [classVisible, setClassVisible] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(stats.classes.map((c) => [c.id, true]))
  );
  const [layerVisible, setLayerVisible] =
    useState<Record<MapLayerId, boolean>>(defaultLayerVisibility);
  const [showLimeSamples, setShowLimeSamples] = useState(true);

  const center = useMemo(
    (): [number, number] => [
      safeCoord(config.mapCenter?.[0], 27.88),
      safeCoord(config.mapCenter?.[1], 85.82),
    ],
    [config.mapCenter]
  );

  const zoom = safeCoord(config.mapZoom, 11);
  const mapKey = `${center[0].toFixed(3)}-${center[1].toFixed(3)}-${zoom}`;

  const activeTileLayers = useMemo(
    () =>
      MAP_LAYER_DEFS.filter((layer) => layerVisible[layer.id]).flatMap((layer) => {
        const url = resolveTileUrl(layer, config.mapTileLayers);
        return url ? [{ ...layer, url }] : [];
      }),
    [layerVisible, config.mapTileLayers]
  );

  const shownClassIds = visibleClassIds(layerVisible, classVisible);
  const legendType = activeLegendType(layerVisible);
  const showHotspots = layerVisible.hotspots;
  const showDemoOverlay =
    !isReal && shownClassIds.size > 0 && activeTileLayers.length === 0;

  const toggleClass = (classId: number) => {
    setClassVisible((prev) => ({ ...prev, [classId]: !prev[classId] }));
  };

  const toggleLayer = (layerId: MapLayerId) => {
    setLayerVisible((prev) => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  const filteredHotspots = stats.hotspots.filter(
    (h) =>
      showHotspots &&
      (h.class_id === undefined || classVisible[h.class_id] !== false)
  );

  return (
    <div className="relative h-full min-h-[480px] w-full overflow-hidden rounded-lg border border-surface-border">
      <MapContainer
        key={mapKey}
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        <MapResizeFix />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &middot; Esri'
          url={
            layerVisible.base_flood && !layerVisible.base_pre
              ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        />

        {activeTileLayers.map((layer) => (
          <TileLayer
            key={layer.id}
            url={layer.url}
            opacity={layer.opacity}
            attribution="Google Earth Engine"
          />
        ))}

        {isReal &&
          showHotspots &&
          filteredHotspots.map((spot, i) => (
            <CircleMarker
              key={`${spot.name}-${i}`}
              center={[spot.lat, spot.lng]}
              radius={8 + Math.min(spot.hotspot_score ?? 0, 12)}
              pathOptions={{
                color: severityColor(spot.severity),
                fillColor: transformationColor(spot.class_id ?? 1),
                fillOpacity: 0.5,
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
              </Popup>
            </CircleMarker>
          ))}

        {showDemoOverlay &&
          stats.classes
            .filter((c) => c.id !== 0 && shownClassIds.has(c.id))
            .flatMap((cls, classIdx) =>
              Array.from({ length: Math.max(2, Math.round(cls.area_km2 / 2.5)) }).map(
                (_, i) => {
                  const lat =
                    config.mapCenter[0] + (classIdx - 2) * 0.055 + (i % 3) * 0.018;
                  const lng =
                    config.mapCenter[1] + (i % 4) * 0.035 - 0.05 + classIdx * 0.012;
                  const color = cls.color || transformationColor(cls.id);
                  return (
                    <CircleMarker
                      key={`${cls.id}-${i}`}
                      center={[lat, lng]}
                      radius={7 + (cls.id % 3)}
                      pathOptions={{
                        color,
                        fillColor: color,
                        fillOpacity: 0.6,
                        weight: 1,
                      }}
                    >
                      <Popup>
                        <strong>{cls.name}</strong>
                        <br />
                        ~{cls.area_km2} km²
                      </Popup>
                    </CircleMarker>
                  );
                }
              )
            )}

        {!isReal && showHotspots && filteredHotspots.map((spot) => (
          <CircleMarker
            key={spot.name}
            center={[spot.lat, spot.lng]}
            radius={12}
            pathOptions={{
              color: severityColor(spot.severity),
              fillColor: transformationColor(spot.class_id ?? 1),
              fillOpacity: 0.35,
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
        visibleLayers={classVisible}
        onToggleClass={toggleClass}
        layerVisible={layerVisible}
        onToggleLayer={toggleLayer}
        showLimeSamples={limeSamples.length > 0 ? showLimeSamples : undefined}
        onToggleLimeSamples={
          limeSamples.length > 0 ? () => setShowLimeSamples((v) => !v) : undefined
        }
      />

      <MapLegend legendType={legendType} />

      {!isReal && activeTileLayers.length === 0 && (
        <div className="absolute right-3 top-3 z-[1000] rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-300">
          Demo overlay — set NEXT_PUBLIC_EE_TILE_* for live GEE layers
        </div>
      )}
    </div>
  );
}
