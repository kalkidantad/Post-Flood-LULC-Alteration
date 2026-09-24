import type { TerraTraceKPI } from "@/lib/types";

interface KPICardsProps {
  kpi: TerraTraceKPI;
}

const ITEMS: {
  key: keyof TerraTraceKPI;
  label: string;
  emoji: string;
  highlight?: boolean;
}[] = [
  { key: "newly_inundated_km2", label: "Newly Inundated Water", emoji: "🌊", highlight: true },
  { key: "total_lulc_change_km2", label: "Total LULC Changed", emoji: "🔄" },
  { key: "agriculture_to_water_km2", label: "Agriculture → Water", emoji: "🌾" },
  { key: "vegetation_to_water_km2", label: "Vegetation → Water", emoji: "🌿" },
  { key: "builtup_to_water_km2", label: "Built-up → Water", emoji: "🏢" },
  { key: "study_area_km2", label: "Study Area", emoji: "🏔️" },
];

export default function KPICards({ kpi }: KPICardsProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-white">
        KPI Cards
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {ITEMS.map(({ key, label, emoji, highlight }) => (
          <div
            key={key}
            className={`rounded-lg px-3 py-3 ${
              highlight ? "bg-accent/10" : "bg-black ring-1 ring-white/10"
            }`}
          >
            <p className="text-xs text-white">
              {emoji} {label}
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {kpi[key]?.toFixed(2) ?? "—"} km²
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
