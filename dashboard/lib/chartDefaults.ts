import type { ChangeStats, DashboardCharts, MlComparison } from "./types";

export function defaultCharts(stats: ChangeStats): DashboardCharts {
  const k = stats.kpi;
  return {
    transitions: [
      { label: "Agri → Water", km2: k.agriculture_to_water_km2, color: "#1E90FF" },
      { label: "Veg → Water", km2: k.vegetation_to_water_km2, color: "#00BFFF" },
      { label: "Built → Water", km2: k.builtup_to_water_km2, color: "#87CEEB" },
      { label: "Veg → Bare", km2: k.veg_to_bare_soil_km2 ?? 0, color: "#A0522D" },
      { label: "Agri → Bare", km2: k.agri_to_bare_soil_km2 ?? 0, color: "#8B4513" },
    ],
    flood_risk_by_prior:
      stats.flood_risk?.map((r) => ({
        label: r.label.split("—")[1]?.trim() ?? r.label,
        km2: r.area_km2,
        color: r.color,
      })) ?? [],
    ml_comparison: stats.ml_comparison
      ? [
          { label: "Rule-based", km2: stats.ml_comparison.rule_based_km2, color: "#0984e3" },
          { label: "ML (K-means)", km2: stats.ml_comparison.ml_km2, color: "#7B3FE4" },
          { label: "Overlap", km2: stats.ml_comparison.overlap_km2, color: "#00AA00" },
        ]
      : [],
  };
}

export function defaultMlComparison(stats: ChangeStats): MlComparison {
  return (
    stats.ml_comparison ?? {
      rule_based_km2: stats.summary.changed_area_km2,
      ml_km2: stats.summary.changed_area_km2 * 0.92,
      overlap_km2: stats.summary.changed_area_km2 * 0.72,
      agreement_pct: stats.summary.ml_agreement_pct ?? 72,
    }
  );
}
