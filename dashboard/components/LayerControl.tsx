"use client";

import type { ChangeClass } from "@/lib/types";

interface LayerControlProps {
  classes: ChangeClass[];
  visibleLayers: Record<number, boolean>;
  onToggle: (classId: number) => void;
  showHotspots: boolean;
  onToggleHotspots: () => void;
  showLimeSamples?: boolean;
  onToggleLimeSamples?: () => void;
}

export default function LayerControl({
  classes,
  visibleLayers,
  onToggle,
  showHotspots,
  onToggleHotspots,
  showLimeSamples,
  onToggleLimeSamples,
}: LayerControlProps) {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] max-w-xs rounded-lg border border-surface-border bg-surface-card/95 p-3 shadow-lg backdrop-blur">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
        Map layers
      </p>
      <ul className="space-y-1.5">
        {classes.map((cls) => (
          <li key={cls.id}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={visibleLayers[cls.id] ?? true}
                onChange={() => onToggle(cls.id)}
                className="rounded border-surface-border"
              />
              <span
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: cls.color }}
              />
              <span className="text-gray-200">{cls.name}</span>
            </label>
          </li>
        ))}
        <li className="border-t border-surface-border pt-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showHotspots}
              onChange={onToggleHotspots}
              className="rounded border-surface-border"
            />
            <span className="h-3 w-3 rounded-sm bg-gradient-to-r from-yellow-400 to-red-500" />
            <span className="text-gray-200">Change hotspots</span>
          </label>
        </li>
        {onToggleLimeSamples && showLimeSamples !== undefined && (
          <li>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showLimeSamples}
                onChange={onToggleLimeSamples}
                className="rounded border-surface-border"
              />
              <span className="h-3 w-3 rounded-sm bg-purple-500" />
              <span className="text-gray-200">LIME sample points</span>
            </label>
          </li>
        )}
      </ul>
    </div>
  );
}
