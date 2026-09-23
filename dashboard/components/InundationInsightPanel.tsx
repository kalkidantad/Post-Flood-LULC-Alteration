import type { LimeExplanations } from "@/lib/types";

const RULES = [
  { text: "MNDWI value increased", icon: "📈" },
  { text: "NDWI value increased", icon: "💧" },
  { text: "Pre-event = non-water", icon: "⬜" },
  { text: "Post-event = water", icon: "🔵" },
  { text: "Permanent water excluded (JRC ≥50%)", icon: "🗺️" },
  { text: "Snow / cloud excluded (QA mask)", icon: "❄️" },
];

interface InundationInsightPanelProps {
  lime: LimeExplanations | null;
}

export default function InundationInsightPanel({ lime }: InundationInsightPanelProps) {
  const topDelta =
    lime?.global
      .filter((f) => f.feature.startsWith("Delta_"))
      .sort((a, b) => (b.importance_pct ?? 0) - (a.importance_pct ?? 0))
      .slice(0, 2) ?? [];

  return (
    <section className="rounded-lg border border-surface-border bg-surface-card p-4">
      <h2 className="mb-1 text-sm font-medium uppercase tracking-wider text-gray-400">
        Insight & Explainable AI
      </h2>
      <p className="mb-4 text-xs text-gray-500">
        Why inundated areas were flagged
      </p>

      <ul className="space-y-2">
        {RULES.map((rule) => (
          <li
            key={rule.text}
            className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-gray-200"
          >
            <span>{rule.icon}</span>
            {rule.text}
          </li>
        ))}
      </ul>

      {topDelta.length > 0 && (
        <div className="mt-4 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-3">
          <p className="text-xs font-medium text-purple-300">LIME confirms (ML)</p>
          <ul className="mt-2 space-y-1 text-xs text-gray-300">
            {topDelta.map((f) => (
              <li key={f.feature}>
                {f.label}: {(f.importance_pct ?? 0).toFixed(1)}% influence
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent">
        → Final Classification: NEW INUNDATION
      </p>
    </section>
  );
}
