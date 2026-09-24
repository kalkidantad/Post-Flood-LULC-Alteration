import { defaultLayerVisibility } from "./mapLayers";
import type { MapLayerId, TimePeriod } from "./types";

/** Layer presets when user selects a temporal period */
export function layersForPeriod(period: TimePeriod): Record<MapLayerId, boolean> {
  const base = defaultLayerVisibility();

  if (period === "pre") {
    return {
      ...base,
      base_pre: true,
      base_flood: false,
      transformation: false,
      binary_flood: false,
      lulc_pre: true,
      lulc_flood: false,
      flood_risk: false,
      ml_classification: false,
      hotspots: false,
    };
  }

  if (period === "post_immediate") {
    return {
      ...base,
      base_pre: false,
      base_flood: true,
      transformation: true,
      binary_flood: true,
      lulc_flood: true,
      flood_risk: true,
      ml_classification: true,
      hotspots: true,
    };
  }

  // post_persistence — emphasize persistent change + agreement
  return {
    ...base,
    base_pre: false,
    base_flood: true,
    transformation: true,
    lulc_change: true,
    ml_agreement: true,
    ml_classification: true,
    bare_soil: true,
    hotspots: true,
  };
}
