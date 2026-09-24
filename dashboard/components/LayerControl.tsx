"use client";

import { MAP_LAYER_DEFS } from "@/lib/mapLayers";
import { transformationColor } from "@/lib/layerPalette";
import type { ChangeClass, MapLayerId } from "@/lib/types";

interface LayerControlProps {
  classes: ChangeClass[];
  visibleLayers: Record<number, boolean>;
  onToggleClass: (classId: number) => void;
  layerVisible: Record<MapLayerId, boolean>;
  onToggleLayer: (layerId: MapLayerId) => void;
  showLimeSamples?: boolean;
  onToggleLimeSamples?: () => void;
}

export default function LayerControl({
  classes,
  visibleLayers,
  onToggleClass,
  layerVisible,
  onToggleLayer,
  showLimeSamples,
  onToggleLimeSamples,
}: LayerControlProps) {
  const categories = [...new Set(MAP_LAYER_DEFS.map((l) => l.category))];

  return (
    <div className="absolute bottom-4 left-4 z-[1000] max-h-[70vh] max-w-xs overflow-y-auto rounded-lg bg-black/95 p-3 shadow-lg backdrop-blur ring-1 ring-white/10">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white">
        Map layers
      </p>

      {categories.map((cat) => (
        <div key={cat} className="mb-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white">
            {cat}
          </p>
          <ul className="space-y-1">
            {MAP_LAYER_DEFS.filter((l) => l.category === cat).map((layer) => (
              <li key={layer.id}>
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={layerVisible[layer.id] ?? false}
                    onChange={() => onToggleLayer(layer.id)}
                    className="rounded border-surface-border"
                  />
                  <span className="text-white">{layer.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wider text-white">
        Change classes (demo overlay)
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
                  onChange={() => onToggleClass(cls.id)}
                  className="rounded border-surface-border"
                />
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{
                    backgroundColor:
                      cls.color || transformationColor(cls.id),
                  }}
                />
                <span className="text-white">{cls.name}</span>
              </label>
            </li>
          ))}
        {onToggleLimeSamples && showLimeSamples !== undefined && (
          <li className="pt-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showLimeSamples}
                onChange={onToggleLimeSamples}
                className="rounded"
              />
              <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
              <span className="text-white">LIME sample points</span>
            </label>
          </li>
        )}
      </ul>
    </div>
  );
}
