import type { LULCTransition, TerraTraceKPI } from "@/lib/types";

interface LULCTransformationPanelProps {
  transitions: LULCTransition[];
  studyAreaKm2: number;
}

export default function LULCTransformationPanel({
  transitions,
  studyAreaKm2,
}: LULCTransformationPanelProps) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-white">
        LULC Transformation Panel
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-white">
          <thead>
            <tr className="text-left text-xs text-white">
              <th className="pb-2 pr-3">Pre-Event State</th>
              <th className="pb-2 pr-3">Flood-Event State</th>
              <th className="pb-2 pr-3 text-right">km²</th>
              <th className="pb-2 text-right">% of AOI</th>
            </tr>
          </thead>
          <tbody>
            {transitions.map((t) => {
              const pct =
                t.pct_aoi ??
                (studyAreaKm2 > 0 ? (t.area_km2 / studyAreaKm2) * 100 : 0);
              return (
                <tr key={`${t.pre}-${t.post}`}>
                  <td className="py-2.5 pr-3">{t.pre}</td>
                  <td className="py-2.5 pr-3">
                    {t.post} {t.emoji}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-medium">
                    {t.area_km2.toFixed(2)}
                  </td>
                  <td className="py-2.5 text-right">
                    {pct.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
