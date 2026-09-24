"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { transformationColor } from "@/lib/layerPalette";
import type { ChangeStats, DashboardConfig } from "@/lib/types";

interface SwipeMapViewProps {
  config: DashboardConfig;
  stats: ChangeStats;
  onPixelInspect: (lat: number, lng: number) => void;
  inspectMarker: [number, number] | null;
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

function SyncMaps({ peer }: { peer: LeafletMap | null }) {
  const map = useMap();
  useEffect(() => {
    if (!peer) return;
    const sync = () => {
      peer.setView(map.getCenter(), map.getZoom(), { animate: false });
    };
    map.on("moveend zoomend", sync);
    return () => {
      map.off("moveend zoomend", sync);
    };
  }, [map, peer]);
  return null;
}

function RegisterMap({ onReady }: { onReady: (m: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

export default function SwipeMapView({
  config,
  stats,
  onPixelInspect,
  inspectMarker,
}: SwipeMapViewProps) {
  const [wipe, setWipe] = useState(50);
  const [leftMap, setLeftMap] = useState<LeafletMap | null>(null);
  const [rightMap, setRightMap] = useState<LeafletMap | null>(null);

  const center = useMemo(
    (): [number, number] => [config.mapCenter[0], config.mapCenter[1]],
    [config.mapCenter]
  );
  const zoom = config.mapZoom ?? 11;
  const markers = stats.hotspots.slice(0, 5);

  const handleClick = useCallback(
    (lat: number, lng: number) => onPixelInspect(lat, lng),
    [onPixelInspect]
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded bg-black/95 px-2 py-1 text-xs font-medium text-white ring-1 ring-white/10">
        ◀ PRE-EVENT (Landsat 9)
      </div>
      <div className="pointer-events-none absolute right-3 top-3 z-[1000] rounded bg-black/95 px-2 py-1 text-xs font-medium text-white ring-1 ring-white/10">
        FLOOD — 26 Aug 2026 ▶
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div className="relative h-full overflow-hidden" style={{ width: `${wipe}%` }}>
          <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full">
            <MapResizeFix />
            <RegisterMap onReady={setLeftMap} />
            <SyncMaps peer={rightMap} />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapClickHandler onClick={handleClick} />
            {inspectMarker && (
              <CircleMarker
                center={inspectMarker}
                radius={12}
                pathOptions={{ color: "#FFFF00", fillColor: "#00000000", weight: 3 }}
              />
            )}
          </MapContainer>
        </div>
        <div
          className="absolute bottom-0 top-0 z-[500] w-0.5 bg-white shadow-md"
          style={{ left: `${wipe}%` }}
        />
        <div className="relative h-full flex-1 overflow-hidden">
          <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full">
            <MapResizeFix />
            <RegisterMap onReady={setRightMap} />
            <SyncMaps peer={leftMap} />
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            {markers.map((h) => (
              <CircleMarker
                key={h.name}
                center={[h.lat, h.lng]}
                radius={9}
                pathOptions={{
                  color: transformationColor(h.class_id ?? 1),
                  fillColor: transformationColor(h.class_id ?? 1),
                  fillOpacity: 0.5,
                  weight: 2,
                }}
              />
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="border-t border-surface-border bg-black px-4 py-3">
        <label className="mb-1 block text-xs text-white">Drag to compare pre vs flood imagery</label>
        <input
          type="range"
          min={20}
          max={80}
          value={wipe}
          onChange={(e) => setWipe(Number(e.target.value))}
          className="w-full accent-accent"
        />
      </div>
    </div>
  );
}
