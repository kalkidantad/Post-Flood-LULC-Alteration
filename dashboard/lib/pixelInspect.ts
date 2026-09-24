import type { PixelInspection } from "./types";

const LULC_NAMES: Record<string, string> = {
  Water: "Water",
  Vegetation: "Vegetation",
  "Built-up": "Built-up",
  Agriculture: "Agriculture",
};

function dist(a: [number, number], b: [number, number]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Nearest precomputed sample or synthetic inspection from click location */
export function inspectPixel(
  lat: number,
  lng: number,
  samples: PixelInspection[]
): PixelInspection {
  if (samples.length === 0) {
    return syntheticInspection(lat, lng);
  }

  let best = samples[0];
  let bestD = dist([lat, lng], [best.lat, best.lng]);

  for (const s of samples.slice(1)) {
    const d = dist([lat, lng], [s.lat, s.lng]);
    if (d < bestD) {
      best = s;
      bestD = d;
    }
  }

  if (bestD > 0.08) {
    return syntheticInspection(lat, lng);
  }

  return { ...best, lat, lng };
}

function syntheticInspection(lat: number, lng: number): PixelInspection {
  const nearWater = lng > 85.84 && lat > 27.9;
  const nearVegLoss = lat < 27.87 && lng < 85.8;

  if (nearWater) {
    return {
      lat,
      lng,
      mndwi_pre: 0.02,
      mndwi_flood: 0.28,
      ndwi_pre: 0.05,
      ndwi_flood: 0.22,
      lulc_pre: LULC_NAMES.Agriculture,
      lulc_flood: LULC_NAMES.Water,
      permanent_water: false,
      valid_pixel: true,
      classification: "NEW INUNDATION",
      classification_color: "#1E6FD9",
      ml_class: "Flooded",
      rules: [
        { ok: true, text: "MNDWI 0.02 → 0.28 (increased)", icon: "📈" },
        { ok: true, text: "NDWI 0.05 → 0.22 (increased)", icon: "💧" },
        { ok: true, text: "Pre-event: Agriculture", icon: "🌾" },
        { ok: true, text: "Flood-event: Water", icon: "🔵" },
        { ok: true, text: "Not permanent water (JRC < 50%)", icon: "🗺️" },
        { ok: true, text: "Valid pixel (QA mask passed)", icon: "❄️" },
      ],
    };
  }

  if (nearVegLoss) {
    return {
      lat,
      lng,
      mndwi_pre: 0.01,
      mndwi_flood: 0.04,
      ndwi_pre: 0.12,
      ndwi_flood: 0.08,
      lulc_pre: LULC_NAMES.Vegetation,
      lulc_flood: "Bare Soil",
      permanent_water: false,
      valid_pixel: true,
      classification: "VEGETATION LOSS",
      classification_color: "#00AA00",
      ml_class: "Vegetation loss",
      rules: [
        { ok: false, text: "MNDWI not strongly increased", icon: "📈" },
        { ok: false, text: "NDWI decreased slightly", icon: "💧" },
        { ok: true, text: "Pre-event: Vegetation", icon: "🌿" },
        { ok: false, text: "Flood-event: not water", icon: "🔵" },
        { ok: true, text: "Not permanent water", icon: "🗺️" },
        { ok: true, text: "Valid pixel", icon: "❄️" },
      ],
    };
  }

  return {
    lat,
    lng,
    mndwi_pre: 0.04,
    mndwi_flood: 0.05,
    ndwi_pre: 0.1,
    ndwi_flood: 0.11,
    lulc_pre: LULC_NAMES.Agriculture,
    lulc_flood: LULC_NAMES.Agriculture,
    permanent_water: false,
    valid_pixel: true,
    classification: "NO SIGNIFICANT CHANGE",
    classification_color: "#8899AA",
    ml_class: "No change",
    rules: [
      { ok: false, text: "MNDWI unchanged", icon: "📈" },
      { ok: false, text: "NDWI unchanged", icon: "💧" },
      { ok: true, text: "Pre-event: Agriculture", icon: "🌾" },
      { ok: false, text: "Flood-event: not water", icon: "🔵" },
      { ok: true, text: "Not permanent water", icon: "🗺️" },
      { ok: true, text: "Valid pixel", icon: "❄️" },
    ],
  };
}
