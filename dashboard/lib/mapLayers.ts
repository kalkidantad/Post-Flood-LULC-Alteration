import type { MapLayerId } from "./types";

export interface MapLayerDef {
  id: MapLayerId;
  label: string;
  category: string;
  defaultOn: boolean;
  opacity: number;
  /** Env var suffix, e.g. TRANSFORMATION → NEXT_PUBLIC_EE_TILE_TRANSFORMATION */
  tileEnvKey?: string;
  /** Which change-class IDs this layer visualizes (demo markers) */
  classIds?: number[];
  legend?: "lulc" | "transformation" | "flood_risk" | "ml_agreement";
}

export const MAP_LAYER_DEFS: MapLayerDef[] = [
  { id: "base_pre", label: "Landsat 9 — Pre-event", category: "Base imagery", defaultOn: false, opacity: 1, tileEnvKey: "PRE" },
  { id: "base_flood", label: "Landsat 9 — Flood event", category: "Base imagery", defaultOn: true, opacity: 1, tileEnvKey: "FLOOD" },
  { id: "mndwi_pre", label: "MNDWI PRE", category: "Flood detection", defaultOn: false, opacity: 0.85, tileEnvKey: "MNDWI_PRE" },
  { id: "mndwi_flood", label: "MNDWI FLOOD", category: "Flood detection", defaultOn: false, opacity: 0.85, tileEnvKey: "MNDWI_FLOOD" },
  { id: "delta_mndwi", label: "Δ MNDWI", category: "Flood detection", defaultOn: false, opacity: 0.85, tileEnvKey: "DELTA_MNDWI" },
  { id: "ndwi_pre", label: "NDWI PRE", category: "Flood detection", defaultOn: false, opacity: 0.85, tileEnvKey: "NDWI_PRE" },
  { id: "ndwi_flood", label: "NDWI FLOOD", category: "Flood detection", defaultOn: false, opacity: 0.85, tileEnvKey: "NDWI_FLOOD" },
  { id: "delta_ndwi", label: "Δ NDWI", category: "Flood detection", defaultOn: false, opacity: 0.85, tileEnvKey: "DELTA_NDWI" },
  { id: "binary_flood", label: "Binary flood (0/1)", category: "Flood detection", defaultOn: false, opacity: 0.85, tileEnvKey: "BINARY_FLOOD", classIds: [1], legend: "transformation" },
  { id: "lulc_pre", label: "PRE LULC", category: "LULC", defaultOn: false, opacity: 0.75, tileEnvKey: "LULC_PRE", legend: "lulc" },
  { id: "lulc_flood", label: "POST-FLOOD LULC", category: "LULC", defaultOn: false, opacity: 0.75, tileEnvKey: "LULC_FLOOD", legend: "lulc" },
  { id: "lulc_change", label: "LULC change", category: "LULC", defaultOn: false, opacity: 0.85, tileEnvKey: "LULC_CHANGE" },
  { id: "transformation", label: "TerraTrace transformation", category: "LULC", defaultOn: true, opacity: 0.9, tileEnvKey: "TRANSFORMATION", classIds: [1, 2, 3], legend: "transformation" },
  { id: "flood_risk", label: "Flood risk", category: "Flood impact", defaultOn: false, opacity: 0.85, tileEnvKey: "FLOOD_RISK", legend: "flood_risk" },
  { id: "flood_damage", label: "Flood damage", category: "Flood impact", defaultOn: false, opacity: 0.85, tileEnvKey: "FLOOD_DAMAGE" },
  { id: "bare_soil", label: "Bare soil transformation", category: "Flood impact", defaultOn: false, opacity: 0.85, tileEnvKey: "BARE_SOIL", classIds: [4], legend: "lulc" },
  { id: "ml_classification", label: "ML classification (K-means)", category: "Rule-based vs ML", defaultOn: false, opacity: 0.85, tileEnvKey: "ML_CLASS", classIds: [1, 2, 3], legend: "transformation" },
  { id: "ml_agreement", label: "Agreement (rule-based vs ML)", category: "Rule-based vs ML", defaultOn: false, opacity: 0.85, tileEnvKey: "ML_AGREEMENT", legend: "ml_agreement" },
  { id: "hotspots", label: "Change hotspots", category: "Analysis", defaultOn: true, opacity: 1 },
];

export function defaultLayerVisibility(): Record<MapLayerId, boolean> {
  return Object.fromEntries(
    MAP_LAYER_DEFS.map((l) => [l.id, l.defaultOn])
  ) as Record<MapLayerId, boolean>;
}

export function resolveTileUrl(
  layer: MapLayerDef,
  configTiles?: Record<string, string>
): string | undefined {
  if (configTiles?.[layer.id]) return configTiles[layer.id];
  if (!layer.tileEnvKey) return undefined;
  const fromEnv = process.env[`NEXT_PUBLIC_EE_TILE_${layer.tileEnvKey}`];
  if (fromEnv) return fromEnv;
  if (layer.id === "transformation") {
    return process.env.NEXT_PUBLIC_EE_TILE_URL;
  }
  return undefined;
}

export function activeLegendType(
  visible: Record<MapLayerId, boolean>
): MapLayerDef["legend"] {
  const priority: MapLayerDef["legend"][] = [
    "transformation",
    "lulc",
    "flood_risk",
    "ml_agreement",
  ];
  for (const kind of priority) {
    if (MAP_LAYER_DEFS.some((l) => l.legend === kind && visible[l.id])) {
      return kind;
    }
  }
  return "transformation";
}

export function visibleClassIds(
  visible: Record<MapLayerId, boolean>,
  classVisible: Record<number, boolean>
): Set<number> {
  const ids = new Set<number>();
  for (const layer of MAP_LAYER_DEFS) {
    if (!visible[layer.id] || !layer.classIds) continue;
    for (const id of layer.classIds) {
      if (classVisible[id] !== false) ids.add(id);
    }
  }
  return ids;
}
