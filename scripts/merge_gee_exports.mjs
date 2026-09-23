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

function findFile(prefix) {
  if (!fs.existsSync(RAW)) {
    throw new Error(`Missing folder: data/raw/ — download GEE exports there first.`);
  }
  const files = fs.readdirSync(RAW);
  const match = files.find((f) => f.includes(prefix));
  if (!match) {
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
    return data.features.map((f) => ({ ...f.properties, ...(f.geometry ? {} : {}) }));
  }
  if (data.features) {
    return data.features.map((f) => f.properties);
  }
  return [data];
}

function ensureOutDir() {
  fs.mkdirSync(OUT, { recursive: true });
}

function merge() {
  ensureOutDir();

  const areaRows = fcToRows(readJson(findFile("04_dashboard_change_area_stats")));
  const metricsRows = fcToRows(readJson(findFile("05_dashboard_model_metrics")));
  const hotspotRows = fcToRows(readJson(findFile("06_dashboard_hotspots")));
  const mapRows = fcToRows(readJson(findFile("07_dashboard_map_center")));

  const metrics = metricsRows[0];
  const studyAreaKm2 = Number(metrics.study_area_km2);

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

  const changeStats = {
    summary: {
      study_area_km2: round(studyAreaKm2, 1),
      changed_area_km2: changedAreaKm2,
      changed_pct: studyAreaKm2 > 0 ? round((changedAreaKm2 / studyAreaKm2) * 100, 1) : 0,
      persistent_change_km2: changedAreaKm2,
      model_accuracy: round(Number(metrics.validation_accuracy), 3),
      kappa: round(Number(metrics.kappa), 3),
      oob_error: round(Number(metrics.oob_error), 3),
    },
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
        label: "Immediate post-flood",
      },
      post_persistence: {
        start: metrics.post_persist_start,
        end: metrics.post_persist_end,
        label: "Persistence check",
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
    title: "Post-Flood LULC Alteration Dashboard",
    subtitle: "Nepal August 2026 Flash-Flood / Debris-Flow — Bhoti Koshi & Trishuli",
    mapCenter: [Number(mapCenter.lat), Number(mapCenter.lng)],
    mapZoom: Number(mapCenter.zoom || 10),
    dataSources: ["Landsat 9"],
    mlModel: `Random Forest (${metrics.rf_trees} trees)`,
    xaiMethod: "LIME (Local Interpretable Model-agnostic Explanations)",
    eeAssets: {
      river: "projects/spatiocoretech-01-506820/assets/Bhoti_koshi_Trishulii_River",
      districts: "projects/spatiocoretech-01-506820/assets/Flood_Districts",
      classification: "projects/spatiocoretech-01-506820/assets/Flood_LULC_Change_ML",
    },
    dataSource: "real",
  };

  // Optional Gini importance if present
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
  console.log(`  Changed:    ${changeStats.summary.changed_area_km2} km² (${changeStats.summary.changed_pct}%)`);
  console.log(`  Accuracy:   ${(changeStats.summary.model_accuracy * 100).toFixed(1)}%`);
  console.log("\nNext: python scripts/run_lime_xai.py");
}

function round(n, d) {
  return Math.round(n * 10 ** d) / 10 ** d;
}

merge();
