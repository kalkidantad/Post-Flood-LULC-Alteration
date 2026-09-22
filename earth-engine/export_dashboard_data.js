/**
 * Export ALL dashboard data from post_flood_lulc_ml.js
 * Paste this at the END of the same EE script, then run each Export task.
 *
 * Downloads → place in:  data/raw/
 * Then run:              node scripts/merge_gee_exports.mjs
 *                         python scripts/run_lime_xai.py
 */

// ─── Shared metadata for dashboard ───────────────────────────────────────────
var CLASS_COLORS = ee.Dictionary({
  '0': '#2d3436',
  '1': '#e17055',
  '2': '#fdcb6e',
  '3': '#00b894',
  '4': '#0984e3',
  '5': '#6c5ce7'
});

var studyCentroid = studyArea.centroid(1);
var mapCenter = ee.Feature(null, {
  lat: studyCentroid.coordinates().get(1),
  lng: studyCentroid.coordinates().get(0),
  zoom: 10
});

// ─── 1. Validation samples (CSV) — used by LIME in Python ───────────────────
var validationExport = validation
  .classify(classifier)
  .map(function(f) {
    var coords = f.geometry().coordinates();
    return f.set({
      longitude: coords.get(0),
      latitude: coords.get(1),
      predicted_class: f.get('classification')
    });
  });

Export.table.toDrive({
  collection: validationExport,
  description: '01_dashboard_validation_samples',
  fileFormat: 'CSV'
});

// ─── 2. Training samples (CSV) — background distribution for LIME ────────────
Export.table.toDrive({
  collection: training,
  description: '02_dashboard_training_samples',
  fileFormat: 'CSV'
});

// ─── 3. Feature importance (Gini) — optional reference ───────────────────────
var importanceList = importancePct.keys().map(function(key) {
  return ee.Feature(null, {
    feature: key,
    importance_pct: importancePct.get(key)
  });
});

Export.table.toDrive({
  collection: ee.FeatureCollection(importanceList),
  description: '03_dashboard_feature_importance',
  fileFormat: 'JSON'
});

// ─── 4. Area statistics by class ──────────────────────────────────────────────
var groups = ee.List(areaFeature.get('groups'));
var areaList = groups.map(function(g) {
  g = ee.Dictionary(g);
  var classId = ee.Number(g.get('class')).toInt();
  var areaM2 = ee.Number(g.get('sum'));
  return ee.Feature(null, {
    class_id: classId,
    class_name: ee.Dictionary(CLASS_NAMES).get(classId.format('%d')),
    color: CLASS_COLORS.get(classId.format('%d')),
    area_m2: areaM2,
    area_km2: areaM2.divide(1e6)
  });
});

Export.table.toDrive({
  collection: ee.FeatureCollection(areaList),
  description: '04_dashboard_change_area_stats',
  fileFormat: 'JSON'
});

// ─── 5. Model metrics ─────────────────────────────────────────────────────────
var studyAreaM2 = studyArea.area(1);
var metricsFeature = ee.Feature(null, {
  study_area_m2: studyAreaM2,
  study_area_km2: studyAreaM2.divide(1e6),
  oob_error: explainDict.get('outOfBagErrorEstimate'),
  validation_accuracy: confusion.accuracy(),
  kappa: confusion.kappa(),
  rf_trees: RF_TREES,
  sample_points: SAMPLE_POINTS,
  pre_start: PRE_START,
  pre_end: PRE_END,
  post_immediate_start: POST_IMMEDIATE_START,
  post_immediate_end: POST_IMMEDIATE_END,
  post_persist_start: POST_PERSIST_START,
  post_persist_end: POST_PERSIST_END
});

Export.table.toDrive({
  collection: ee.FeatureCollection([metricsFeature]),
  description: '05_dashboard_model_metrics',
  fileFormat: 'JSON'
});

// ─── 6. Hotspot sample points (for map markers) ───────────────────────────────
var hotspotSamples = classifiedPersistent
  .updateMask(classifiedPersistent.neq(0))
  .addBands(hotspot)
  .stratifiedSample({
    numPoints: 30,
    classBand: 'change_class',
    region: studyArea,
    scale: EXPORT_SCALE,
    seed: 7,
    geometries: true
  })
  .map(function(f) {
    var coords = f.geometry().coordinates();
    var hs = ee.Number(f.get('hotspot'));
    var cls = ee.Number(f.get('change_class')).toInt();
    var severity = ee.Algorithms.If(hs.gte(6), 'high',
      ee.Algorithms.If(hs.gte(3), 'medium', 'low'));
    return ee.Feature(f.geometry(), {
      name: ee.Dictionary(CLASS_NAMES).get(cls.format('%d')),
      class_id: cls,
      lat: coords.get(1),
      lng: coords.get(0),
      hotspot_score: hs,
      severity: severity
    });
  });

Export.table.toDrive({
  collection: hotspotSamples,
  description: '06_dashboard_hotspots',
  fileFormat: 'JSON'
});

// ─── 7. Map center ────────────────────────────────────────────────────────────
Export.table.toDrive({
  collection: ee.FeatureCollection([mapCenter]),
  description: '07_dashboard_map_center',
  fileFormat: 'JSON'
});

// ─── 8. Classification raster asset (optional live tiles) ────────────────────
Export.image.toAsset({
  image: classifiedPersistent.addBands(hotspot).rename(['change_class', 'hotspot']),
  description: '08_flood_lulc_change_ml_asset',
  assetId: 'projects/spatiocoretech-01-506820/assets/Flood_LULC_Change_ML',
  region: studyArea,
  scale: EXPORT_SCALE,
  maxPixels: 1e13
});

print('✓ 8 export tasks queued.');
print('→ Download from Google Drive into: data/raw/');
print('→ Then run: node scripts/merge_gee_exports.mjs');
print('→ Then run: python scripts/run_lime_xai.py');
