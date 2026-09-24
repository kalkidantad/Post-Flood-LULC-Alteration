#!/usr/bin/env node
/**
 * Merge raw GEE Drive exports → dashboard/public/data/*.json
 *
 * Usage:
 *   1. Download GEE exports into data/raw/
 *   2. node scripts/merge_gee_exports.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const RAW = path.join(ROOT, "data", "raw");
const OUT = path.join(ROOT, "dashboard", "public", "data");

function findFile(prefix, optional = false) {
  if (!fs.existsSync(RAW)) {
    throw new Error(`Missing folder: data/raw/ — download GEE exports there first.`);
  }
  const files = fs.readdirSync(RAW);
  const match = files.find((f) => f.includes(prefix));
  if (!match) {
    if (optional) return null;
    throw new Error(`Could not find export matching "${prefix}" in data/raw/`);
  }
  return path.join(RAW, match);
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function fcToRows(data) {
  if (Array.isArray(data)) return data;
  if (data.type === "FeatureCollection") {
    return data.features.map((f) => ({ ...f.properties }));
  }
  if (data.features) {
    return data.features.map((f) => f.properties);
  }
  return [data];
}

function ensureOutDir() {
  fs.mkdirSync(OUT, { recursive: true });
}

function buildTransitions(metrics) {
  return [
    {
      pre: "Agriculture",
      post: "Water",
      emoji: "🌊",
      area_km2: round(Number(metrics.agri_to_water_km2 || 0), 2),
    },
    {
      pre: "Vegetation",
      post: "Water",
      emoji: "🌊",
      area_km2: round(Number(metrics.veg_to_water_km2 || 0), 2),
    },
    {
      pre: "Built-up",
      post: "Water",
      emoji: "🌊",
      area_km2: round(Number(metrics.built_to_water_km2 || metrics.builtup_to_water_km2 || 0), 2),
    },
    {
      pre: "Vegetation",
      post: "Bare Soil",
      emoji: "🟤",
      area_km2: round(Number(metrics.veg_to_bare_soil_km2 || 0), 2),
    },
    {
      pre: "Agriculture",
      post: "Bare Soil",
      emoji: "🟤",
      area_km2: round(Number(metrics.agri_to_bare_soil_km2 || 0), 2),
    },
  ].filter((t) => t.area_km2 > 0);
}

function merge() {
  ensureOutDir();

  const areaRows = fcToRows(readJson(findFile("04_dashboard_change_area_stats")));
  const metricsRows = fcToRows(readJson(findFile("05_dashboard_model_metrics")));
  const hotspotRows = fcToRows(readJson(findFile("06_dashboard_hotspots")));
  const mapRows = fcToRows(readJson(findFile("07_dashboard_map_center")));

  const kpiPath = findFile("09_dashboard_kpis", true);
  const kpiRows = kpiPath ? fcToRows(readJson(kpiPath)) : [];
  const kpiRaw = kpiRows[0] || {};

  const metrics = metricsRows[0];
  const studyAreaKm2 = Number(kpiRaw.study_area_km2 || metrics.study_area_km2);

  const kpi = {
    newly_inundated_km2: round(Number(kpiRaw.newly_inundated_km2 || metrics.lulc_new_water_km2 || 0), 2),
    total_lulc_change_km2: round(Number(kpiRaw.total_lulc_change_km2 || metrics.lulc_change_km2 || 0), 2),
    agriculture_to_water_km2: round(Number(kpiRaw.agriculture_to_water_km2 || metrics.agri_to_water_km2 || 0), 2),
    vegetation_to_water_km2: round(Number(kpiRaw.vegetation_to_water_km2 || metrics.veg_to_water_km2 || 0), 2),
    builtup_to_water_km2: round(
      Number(kpiRaw.builtup_to_water_km2 || metrics.built_to_water_km2 || 0),
      2
    ),
    study_area_km2: round(studyAreaKm2, 1),
    inundated_water_km2: round(Number(kpiRaw.inundated_water_km2 || metrics.flood_km2 || 0), 2),
    vegetation_loss_km2: round(Number(kpiRaw.vegetation_loss_km2 || 0), 2),
    veg_to_bare_soil_km2: round(Number(kpiRaw.veg_to_bare_soil_km2 || metrics.veg_to_bare_soil_km2 || 0), 2),
    agri_to_bare_soil_km2: round(Number(kpiRaw.agri_to_bare_soil_km2 || metrics.agri_to_bare_soil_km2 || 0), 2),
  };

  const classes = areaRows
    .map((row) => ({
      id: Number(row.class_id),
      name: row.class_name,
      color: row.color,
      area_km2: round(Number(row.area_km2), 2),
      pct: 0,
    }))
    .sort((a, b) => a.id - b.id);

  classes.forEach((c) => {
    c.pct = studyAreaKm2 > 0 ? round((c.area_km2 / studyAreaKm2) * 100, 1) : 0;
  });

  const changedClasses = classes.filter((c) => c.id !== 0);
  const changedAreaKm2 = round(
    changedClasses.reduce((s, c) => s + c.area_km2, 0),
    2
  );

  const transitions = buildTransitions({ ...metrics, ...kpiRaw });

  const changeStats = {
    summary: {
      study_area_km2: round(studyAreaKm2, 1),
      changed_area_km2: kpi.total_lulc_change_km2 || changedAreaKm2,
      changed_pct:
        studyAreaKm2 > 0
          ? round(((kpi.total_lulc_change_km2 || changedAreaKm2) / studyAreaKm2) * 100, 1)
          : 0,
      persistent_change_km2: kpi.total_lulc_change_km2 || changedAreaKm2,
      model_accuracy: round(Number(metrics.validation_accuracy || metrics.ml_agreement || 0), 3),
      kappa: round(Number(metrics.kappa || 0), 3),
      oob_error: round(Number(metrics.oob_error || 0), 3),
      ml_agreement_pct: metrics.ml_agreement_pct
        ? round(Number(metrics.ml_agreement_pct), 1)
        : metrics.overlap_km2 && metrics.baseline_km2
          ? round(
              (Number(metrics.overlap_km2) /
                Math.max(Number(metrics.baseline_km2), Number(metrics.ml_km2), 1)) *
                100,
              1
            )
          : undefined,
    },
    kpi,
    transitions: transitions.length > 0 ? transitions : buildTransitions(kpi),
    classes,
    periods: {
      pre: {
        start: metrics.pre_start,
        end: metrics.pre_end,
        label: "Pre-event baseline",
      },
      post_immediate: {
        start: metrics.post_immediate_start,
        end: metrics.post_immediate_end,
        label: "Flood event (26 Aug 2026)",
      },
      post_persistence: {
        start: metrics.post_persist_start,
        end: metrics.post_persist_end,
        label: "Post-flood window",
      },
    },
    hotspots: hotspotRows.slice(0, 15).map((h, i) => ({
      name: h.name || `Hotspot ${i + 1}`,
      lat: Number(h.lat),
      lng: Number(h.lng),
      severity: h.severity || "medium",
      class_id: Number(h.class_id),
      hotspot_score: Number(h.hotspot_score),
    })),
  };

  const mapCenter = mapRows[0];
  const config = {
    brand: "TerraTrace",
    title: "TerraTrace — AI-Powered LULC Change & Flood Transformation",
    subtitle: "Bhote Koshi Trishuli Narayani corridor, Nepal · Event: 26 August 2026",
    mapCenter: [Number(mapCenter.lat), Number(mapCenter.lng)],
    mapZoom: Number(mapCenter.zoom || 11),
    dataSources: ["Landsat 9", "JRC Global Surface Water"],
    mlModel: metrics.ml_method || `Unsupervised K-means (k=${metrics.k_clusters || 5})`,
    xaiMethod: "Rule-based pixel inspector + LIME (optional)",
    eeAssets: {
      river: "projects/spatiocoretech-01-506820/assets/Bhoti_koshi_Trishulii_River",
      districts: "projects/spatiocoretech-01-506820/assets/NepalFlood",
    },
    dataSource: "real",
    eventDate: "2026-08-26",
    mapTileLayers: {},
  };

  try {
    const layerRows = fcToRows(readJson(findFile("10_dashboard_map_layers", true)));
    if (layerRows[0]) {
      config.mapTileLayers = Object.fromEntries(
        Object.entries(layerRows[0]).filter(
          ([, url]) => typeof url === "string" && url.startsWith("http")
        )
      );
    }
  } catch {
    // optional tile manifest
  }

  try {
    const giniRows = fcToRows(readJson(findFile("03_dashboard_feature_importance")));
    const labels = JSON.parse(
      fs.readFileSync(path.join(__dirname, "feature_labels.json"), "utf-8")
    );
    const featureImportance = giniRows.map((r) => ({
      feature: r.feature,
      importance_pct: round(Number(r.importance_pct), 1),
      label: labels[r.feature] || r.feature,
    }));
    fs.writeFileSync(
      path.join(OUT, "feature_importance.json"),
      JSON.stringify(featureImportance, null, 2)
    );
    console.log("✓ feature_importance.json (Gini reference)");
  } catch {
    console.log("⚠ Skipped Gini importance (03 export not found)");
  }

  fs.writeFileSync(path.join(OUT, "change_stats.json"), JSON.stringify(changeStats, null, 2));
  fs.writeFileSync(path.join(OUT, "config.json"), JSON.stringify(config, null, 2));

  console.log("✓ change_stats.json");
  console.log("✓ config.json");
  console.log(`  Study area: ${changeStats.summary.study_area_km2} km²`);
  console.log(`  Newly inundated: ${kpi.newly_inundated_km2} km²`);
  console.log(`  LULC changed: ${kpi.total_lulc_change_km2} km²`);
  if (changeStats.summary.ml_agreement_pct) {
    console.log(`  ML agreement: ${changeStats.summary.ml_agreement_pct}%`);
  } else {
    console.log(`  Model metric: ${(changeStats.summary.model_accuracy * 100).toFixed(1)}%`);
  }
  console.log("\nNext: python scripts/run_lime_xai.py");
}

function round(n, d) {
  return Math.round(n * 10 ** d) / 10 ** d;
}

merge();
