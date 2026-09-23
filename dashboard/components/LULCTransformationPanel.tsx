import type { LULCTransition } from "@/lib/types";

interface LULCTransformationPanelProps {
  transitions: LULCTransition[];
}

export default function LULCTransformationPanel({
  transitions,
}: LULCTransformationPanelProps) {
  return (
    <section className="rounded-lg border border-surface-border bg-surface-card p-4">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
        LULC Transformation Panel
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left text-xs text-gray-500">
              <th className="pb-2 pr-4">Pre-Event State</th>
              <th className="pb-2 pr-4">Flood-Event State</th>
              <th className="pb-2 text-right">Area (km²)</th>
            </tr>
          </thead>
          <tbody>
            {transitions.map((t) => (
              <tr
                key={`${t.pre}-${t.post}`}
                className="border-b border-surface-border/50 last:border-0"
              >
                <td className="py-2.5 pr-4 text-gray-200">{t.pre}</td>
                <td className="py-2.5 pr-4 text-gray-200">
                  {t.post} {t.emoji}
                </td>
                <td className="py-2.5 text-right font-medium text-white">
                  {t.area_km2.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
