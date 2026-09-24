"use client";

import type { LimeExplanations, PixelInspection } from "@/lib/types";

const DEFAULT_RULES = [
  { text: "MNDWI value increased", icon: "📈", ok: true },
  { text: "NDWI value increased", icon: "💧", ok: true },
  { text: "Pre-event = non-water", icon: "⬜", ok: true },
  { text: "Post-event = water", icon: "🔵", ok: true },
  { text: "Permanent water excluded (JRC ≥50%)", icon: "🗺️", ok: true },
  { text: "Snow / cloud excluded (QA mask)", icon: "❄️", ok: true },
];

interface InundationInsightPanelProps {
  lime: LimeExplanations | null;
  inspection: PixelInspection | null;
}

export default function InundationInsightPanel({
  lime,
  inspection,
}: InundationInsightPanelProps) {
  const topDelta =
    lime?.global
      .filter((f) => f.feature.startsWith("Delta_"))
      .sort((a, b) => (b.importance_pct ?? 0) - (a.importance_pct ?? 0))
      .slice(0, 2) ?? [];

  const rules = inspection?.rules ?? DEFAULT_RULES.map((r) => ({ ...r, ok: r.ok }));
  const classificationLabel = inspection
    ? inspection.classification
    : "NEW INUNDATION (sample)";

  return (
    <section className="card h-full p-4">
      <h2 className="mb-1 text-sm font-medium uppercase tracking-wider text-white">
        Insight & Explainable AI
      </h2>
      <p className="mb-4 text-xs text-white">
        {inspection
          ? `Pixel at ${inspection.lat.toFixed(4)}, ${inspection.lng.toFixed(4)}`
          : "Click the map to inspect a pixel — or see default inundation rules"}
      </p>

      {!inspection?.valid_pixel && inspection && (
        <p className="mb-3 rounded-lg bg-yellow-500/10 px-3 py-2 text-xs text-white">
          No valid data at this location (cloud / mask / outside AOI).
        </p>
      )}

      <ul className="space-y-2">
        {rules.map((rule) => (
          <li
            key={rule.text}
            className="card-inner flex items-center gap-2 px-3 py-2 text-sm"
          >
            <span>{rule.ok ? "✅" : "❌"}</span>
            <span>{rule.icon}</span>
            {rule.text}
          </li>
        ))}
      </ul>

      {inspection && (
        <p className="mt-3 text-xs text-white">
          ML (K-means): <span>{inspection.ml_class}</span>
        </p>
      )}

      {topDelta.length > 0 && (
        <div className="mt-4 rounded-lg bg-purple-500/10 px-3 py-3">
          <p className="text-xs font-medium text-white">Delta feature influence (LIME)</p>
          <ul className="mt-2 space-y-1 text-xs text-white">
            {topDelta.map((f) => (
              <li key={f.feature}>
                {f.label}: {(f.importance_pct ?? 0).toFixed(1)}%
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 rounded-lg px-3 py-2 text-sm font-medium text-white ring-1 ring-white/10">
        → Final classification: {classificationLabel}
      </p>
    </section>
  );
}
