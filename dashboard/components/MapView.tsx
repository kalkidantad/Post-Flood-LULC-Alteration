"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  Rectangle,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  activeLegendType,
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
  layerVisible: Record<MapLayerId, boolean>;
  onLayerVisibleChange: (layers: Record<MapLayerId, boolean>) => void;
  onPixelInspect: (lat: number, lng: number) => void;
  inspectMarker: [number, number] | null;
  showLimeSamples: boolean;
  onToggleLimeSamples: () => void;
}

function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 0);
    return () => window.clearTimeout(t);
  }, [map]);
  return null;
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
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

/** Demo raster patches simulating GEE layers when tile URLs absent */
function DemoLayerPatches({
  config,
  layerVisible,
  stats,
}: {
  config: DashboardConfig;
  layerVisible: Record<MapLayerId, boolean>;
  stats: ChangeStats;
}) {
  const [lat0, lng0] = config.mapCenter;
  const patches: { id: string; bounds: [[number, number], [number, number]]; color: string; show: boolean }[] = [
    {
      id: "transformation",
      bounds: [[lat0 - 0.04, lng0 - 0.06], [lat0 + 0.02, lng0 + 0.04]],
      color: "#0000FF",
      show: layerVisible.transformation,
    },
    {
      id: "binary_flood",
      bounds: [[lat0 - 0.02, lng0 + 0.02], [lat0 + 0.04, lng0 + 0.08]],
      color: "#1E90FF",
      show: layerVisible.binary_flood,
    },
    {
      id: "lulc_change",
      bounds: [[lat0 - 0.05, lng0 - 0.02], [lat0 + 0.01, lng0 + 0.06]],
      color: "#FF0000",
      show: layerVisible.lulc_change,
    },
    {
      id: "flood_risk",
      bounds: [[lat0 + 0.01, lng0 - 0.05], [lat0 + 0.05, lng0]],
      color: "#FFA500",
      show: layerVisible.flood_risk,
    },
    {
      id: "ml_agreement",
      bounds: [[lat0 - 0.03, lng0 + 0.01], [lat0 + 0.03, lng0 + 0.07]],
      color: "#00FF00",
      show: layerVisible.ml_agreement,
    },
  ];

  return (
    <>
      {patches
        .filter((p) => p.show)
        .map((p) => (
          <Rectangle
            key={p.id}
            bounds={p.bounds}
            pathOptions={{
              color: p.color,
              fillColor: p.color,
              fillOpacity: 0.35,
              weight: 1,
            }}
          />
        ))}
      {layerVisible.flood_risk &&
        stats.flood_risk?.map((r, i) => (
          <CircleMarker
            key={r.label}
            center={[lat0 + 0.02 * i - 0.02, lng0 - 0.03 + i * 0.015]}
            radius={8}
            pathOptions={{
              color: r.color,
              fillColor: r.color,
              fillOpacity: 0.65,
              weight: 1,
            }}
          >
            <Popup>
              {r.label}: {r.area_km2} km²
            </Popup>
          </CircleMarker>
        ))}
    </>
  );
}

export default function MapView({
  config,
  stats,
  limeSamples = [],
  layerVisible,
  onLayerVisibleChange,
  onPixelInspect,
  inspectMarker,
  showLimeSamples,
  onToggleLimeSamples,
}: MapViewProps) {
  const isReal = config.dataSource === "real";
  const [classVisible, setClassVisible] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(stats.classes.map((c) => [c.id, true]))
  );

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7656/ingest/fa884f89-22ac-4292-bdf2-1e77989dda3a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c4750a" },
      body: JSON.stringify({
        sessionId: "c4750a",
        runId: "pre-fix",
        hypothesisId: "C",
        location: "MapView.tsx:mount",
        message: "MapView mounted successfully",
        data: {
          isReal: config.dataSource === "real",
          center: config.mapCenter,
          runId: "map-height-fix",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [config.dataSource, config.mapCenter]);

  const center = useMemo(
    (): [number, number] => [
      safeCoord(config.mapCenter?.[0], 27.88),
      safeCoord(config.mapCenter?.[1], 85.82),
    ],
    [config.mapCenter]
  );

  const zoom = safeCoord(config.mapZoom, 11);

  const activeTileLayers = MAP_LAYER_DEFS.filter((layer) => layerVisible[layer.id]).flatMap(
    (layer) => {
      const url = resolveTileUrl(layer, config.mapTileLayers);
      return url ? [{ ...layer, url }] : [];
    }
  );

  const shownClassIds = visibleClassIds(layerVisible, classVisible);
  const legendType = activeLegendType(layerVisible);
  const showHotspots = layerVisible.hotspots;
  const useDemoLayers = !isReal && activeTileLayers.length === 0;

  const toggleLayer = (layerId: MapLayerId) => {
    onLayerVisibleChange({ ...layerVisible, [layerId]: !layerVisible[layerId] });
  };

  const toggleClass = (classId: number) => {
    setClassVisible((prev) => ({ ...prev, [classId]: !prev[classId] }));
  };

  const filteredHotspots = stats.hotspots.filter(
    (h) => showHotspots && (h.class_id === undefined || classVisible[h.class_id] !== false)
  );

  const baseIsSatellite =
    layerVisible.base_flood && (!layerVisible.base_pre || layerVisible.base_flood);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <MapResizeFix />
        <MapClickHandler onClick={onPixelInspect} />

        <TileLayer
          attribution='&copy; OSM / Esri (sample basemap stand-in for Landsat 9)'
          url={
            baseIsSatellite
              ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          opacity={layerVisible.base_pre && layerVisible.base_flood ? 0.85 : 1}
        />

        {layerVisible.base_flood && layerVisible.base_pre && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            opacity={0.55}
          />
        )}

        {activeTileLayers.map((layer) => (
          <TileLayer
            key={layer.id}
            url={layer.url}
            opacity={layer.opacity}
            attribution="Google Earth Engine"
          />
        ))}

        {useDemoLayers && (
          <DemoLayerPatches
            config={config}
            layerVisible={layerVisible}
            stats={stats}
          />
        )}

        {inspectMarker && (
          <CircleMarker
            center={inspectMarker}
            radius={12}
            pathOptions={{ color: "#FFFF00", fillColor: "#00000000", weight: 3 }}
          />
        )}

        {showHotspots &&
          filteredHotspots.map((spot, i) => (
            <CircleMarker
              key={`${spot.name}-${i}`}
              center={[spot.lat, spot.lng]}
              radius={8 + Math.min(spot.hotspot_score ?? 0, 10)}
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
                <strong>LIME</strong>: {s.class_name}
              </Popup>
            </CircleMarker>
          ))}

        {useDemoLayers &&
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
                      radius={6 + (cls.id % 3)}
                      pathOptions={{
                        color,
                        fillColor: color,
                        fillOpacity: 0.55,
                        weight: 1,
                      }}
                    >
                      <Popup>
                        <strong>{cls.name}</strong> (~{cls.area_km2} km²)
                      </Popup>
                    </CircleMarker>
                  );
                }
              )
            )}
      </MapContainer>

      <LayerControl
        classes={stats.classes}
        visibleLayers={classVisible}
        onToggleClass={toggleClass}
        layerVisible={layerVisible}
        onToggleLayer={toggleLayer}
        showLimeSamples={limeSamples.length > 0 ? showLimeSamples : undefined}
        onToggleLimeSamples={
          limeSamples.length > 0 ? onToggleLimeSamples : undefined
        }
      />

      <MapLegend legendType={legendType} />

      {useDemoLayers && (
        <div className="absolute right-3 top-3 z-[1000] max-w-[200px] rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-200">
          Sample layer simulation — colored patches + markers stand in for GEE tiles
        </div>
      )}
    </div>
  );
}
