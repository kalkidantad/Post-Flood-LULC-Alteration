"use client";

import type { ChangeClass, MapLayerGroup } from "@/lib/types";

interface LayerControlProps {
  classes: ChangeClass[];
  visibleLayers: Record<number, boolean>;
  onToggle: (classId: number) => void;
  showHotspots: boolean;
  onToggleHotspots: () => void;
  showLimeSamples?: boolean;
  onToggleLimeSamples?: () => void;
  mapLayerGroups: Record<MapLayerGroup, boolean>;
  onToggleMapGroup: (group: MapLayerGroup) => void;
}

const MAP_GROUPS: { id: MapLayerGroup; label: string; category: string }[] = [
  { id: "base_pre", label: "Landsat 9 (Pre-Event)", category: "Base Imagery" },
  { id: "base_flood", label: "Landsat 9 (Flood Event)", category: "Base Imagery" },
  { id: "flood_indices", label: "MNDWI / NDWI / Δ indices", category: "Flood Detection" },
  { id: "binary_flood", label: "Binary Flood 0/1", category: "Flood Detection" },
  { id: "lulc", label: "PRE & POST LULC + Change", category: "LULC Layers" },
  { id: "transformation", label: "TerraTrace Transformation", category: "LULC Layers" },
  { id: "hotspots", label: "Change hotspots", category: "Analysis" },
];

export default function LayerControl({
  classes,
  visibleLayers,
  onToggle,
  showHotspots,
  onToggleHotspots,
  showLimeSamples,
  onToggleLimeSamples,
  mapLayerGroups,
  onToggleMapGroup,
}: LayerControlProps) {
  const categories = [...new Set(MAP_GROUPS.map((g) => g.category))];

  return (
    <div className="absolute bottom-4 left-4 z-[1000] max-h-[70vh] max-w-xs overflow-y-auto rounded-lg border border-surface-border bg-surface-card/95 p-3 shadow-lg backdrop-blur">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
        Main Map Panel
      </p>

      {categories.map((cat) => (
        <div key={cat} className="mb-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            {cat}
          </p>
          <ul className="space-y-1">
            {MAP_GROUPS.filter((g) => g.category === cat).map((g) => (
              <li key={g.id}>
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={g.id === "hotspots" ? showHotspots : mapLayerGroups[g.id]}
                    onChange={() =>
                      g.id === "hotspots" ? onToggleHotspots() : onToggleMapGroup(g.id)
                    }
                    className="rounded border-surface-border"
                  />
                  <span className="text-gray-200">{g.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        ML change classes
      </p>
      <ul className="space-y-1">
        {classes
          .filter((c) => c.id !== 0)
          .map((cls) => (
            <li key={cls.id}>
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={visibleLayers[cls.id] ?? true}
                  onChange={() => onToggle(cls.id)}
                  className="rounded border-surface-border"
                />
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: cls.color }}
                />
                <span className="text-gray-200">{cls.name}</span>
              </label>
            </li>
          ))}
        {onToggleLimeSamples && showLimeSamples !== undefined && (
          <li className="border-t border-surface-border pt-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showLimeSamples}
                onChange={onToggleLimeSamples}
                className="rounded border-surface-border"
              />
              <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
              <span className="text-gray-200">LIME sample points</span>
            </label>
          </li>
        )}
      </ul>
    </div>
  );
}
