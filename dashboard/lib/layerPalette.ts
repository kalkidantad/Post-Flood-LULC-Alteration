/** Colors aligned with team GEE ML.js / TerraTrace EE App */

export const LULC_PALETTE = {
  water: "#0000FF",
  vegetation: "#008000",
  builtup: "#FF0000",
  agriculture: "#FFD700",
  bareSoil: "#8B4513",
} as const;

/** TerraTrace transformation & K-means ML (classes 1–3) */
export const TRANSFORMATION_PALETTE: Record<number, string> = {
  1: "#0000FF", // newly inundated / flooded
  2: "#00AA00", // vegetation loss
  3: "#FF0000", // built-up change
};

export const FLOOD_RISK_PALETTE = [
  { id: 1, label: "Low (water)", color: "#FFFF00" },
  { id: 2, label: "Moderate (vegetation)", color: "#7CFC00" },
  { id: 3, label: "High (agriculture)", color: "#FFA500" },
  { id: 4, label: "Very high (built-up)", color: "#FF0000" },
];

export const ML_AGREEMENT_PALETTE = [
  { id: 1, label: "Both agree", color: "#00FF00" },
  { id: 2, label: "ML only", color: "#FFFF00" },
  { id: 3, label: "Rule-based only", color: "#FF00FF" },
];

export const LULC_LEGEND = [
  { label: "Water", color: LULC_PALETTE.water, emoji: "🔵" },
  { label: "Vegetation", color: LULC_PALETTE.vegetation, emoji: "🟢" },
  { label: "Built-up", color: LULC_PALETTE.builtup, emoji: "🏢" },
  { label: "Agriculture", color: LULC_PALETTE.agriculture, emoji: "🌾" },
  { label: "Bare soil", color: LULC_PALETTE.bareSoil, emoji: "🟤" },
];

export const TRANSFORMATION_LEGEND = [
  { label: "Newly inundated", color: TRANSFORMATION_PALETTE[1], emoji: "🌊" },
  { label: "Vegetation loss", color: TRANSFORMATION_PALETTE[2], emoji: "🌿" },
  { label: "Built-up change", color: TRANSFORMATION_PALETTE[3], emoji: "🏢" },
];

export function transformationColor(classId: number): string {
  return TRANSFORMATION_PALETTE[classId] ?? "#8899AA";
}
