// ═══════════════════════════════════════════════════════════════════════════
// TERRATRACE — FIXED ML + DASHBOARD EXPORTS
// Paste AFTER Hackathon_Final.js in the same GEE script tab, then Run.
//
// Fixes applied:
//  1. Spatial hold-out validation (breaks circular / inflated accuracy)
//  2. Balanced stratified sampling per class
//  3. Delta-only features (reduces correlation redundancy)
//  4. Feature normalization to [0, 1]
//  5. Labels from independent transition layers (not transformation composite)
//  6. Larger hotspot kernel, consistent EXPORT_SCALE
//  7. Data-quality + spatial validation metrics exported
// ═══════════════════════════════════════════════════════════════════════════

var EXPORT_SCALE = 30;
var RF_TREES = 500;
var SAMPLES_PER_CLASS = 600;
var HOTSPOT_RADIUS_PX = 5;

// ─── Requires from Hackathon_Final ───────────────────────────────────────────
// aoi, pre, flood, mndwiPre, mndwiFlood, ndwiPre, ndwiFlood, ndviPre, ndviFlood,
// ndbiPre, ndbiFlood, bsiPre, bsiFlood, nonPermanentWater,
// waterNewlyInundated, vegetationLoss, builtupAlteration, vegToBareSoil, agriToBareSoil,
// transformation, lulcChange, floodWater,
// newlyInundatedKm2, lulcChangeKm2, agriWaterKm2, vegWaterKm2, builtWaterKm2, studyAreaKm2,
// PRE_START='2026-07-06', PRE_END='2026-08-06', flood date window strings

var PRE_START = '2026-07-06';
var PRE_END = '2026-08-06';
var FLOOD_START = '2026-08-26';
var FLOOD_END = '2026-08-27';

// ─── Data quality checks ─────────────────────────────────────────────────────
print('=== DATA QUALITY CHECKS ===');
print('Export scale (m):', EXPORT_SCALE);
print('Valid pixel fraction (pre):', pre.mask().reduceRegion({
  reducer: ee.Reducer.mean(), geometry: aoi, scale: EXPORT_SCALE, maxPixels: 1e13
}));
print('Valid pixel fraction (flood):', flood.mask().reduceRegion({
  reducer: ee.Reducer.mean(), geometry: aoi, scale: EXPORT_SCALE, maxPixels: 1e13
}));

// ─── Delta-only feature stack (fixes redundancy / correlation) ───────────────
var deltaMNDWI = mndwiFlood.subtract(mndwiPre).rename('Delta_MNDWI');
var deltaNDWI = ndwiFlood.subtract(ndwiPre).rename('Delta_NDWI');
var deltaNDVI = ndviFlood.subtract(ndviPre).rename('Delta_NDVI');
var deltaNDBI = ndbiFlood.subtract(ndbiPre).rename('Delta_NDBI');
var deltaBSI = bsiFlood.subtract(bsiPre).rename('Delta_BSI');

var featureRaw = ee.Image.cat([
  deltaMNDWI, deltaNDWI, deltaNDVI, deltaNDBI, deltaBSI
]).clip(aoi);

// Normalize indices from [-1,1] → [0,1] for RF stability
var featureImage = featureRaw.add(1).divide(2).rename(featureRaw.bandNames());
var predictorBands = featureImage.bandNames();
print('ML features (delta-only, normalized):', predictorBands);

// ─── Labels: independent transition layers (NOT transformation composite) ────
// 0=No change  1=New inundation  2=Vegetation loss  3=Built-up change  4=Bare soil
var mlLabel = ee.Image(0)
  .where(waterNewlyInundated.eq(1), 1)
  .where(vegetationLoss.eq(1), 2)
  .where(builtupAlteration.eq(1), 3)
  .where(vegToBareSoil.eq(1), 4)
  .where(agriToBareSoil.eq(1), 4)
  .rename('class');

// ─── Spatial block split (train block 0 / validate block 1) ──────────────────
var lonLat = ee.Image.pixelLonLat().clip(aoi);
var spatialBlock = lonLat.select('longitude').multiply(500).int16()
  .add(lonLat.select('latitude').multiply(500).int16())
  .mod(2)
  .rename('block');

var sampleImage = featureImage.addBands(mlLabel).addBands(spatialBlock);

// Balanced sampling: equal points per class
var c0 = sampleImage.stratifiedSample({numPoints: SAMPLES_PER_CLASS, classBand: 'class', classValues: [0], region: aoi, scale: EXPORT_SCALE, seed: 1, geometries: true});
var c1 = sampleImage.stratifiedSample({numPoints: SAMPLES_PER_CLASS, classBand: 'class', classValues: [1], region: aoi, scale: EXPORT_SCALE, seed: 2, geometries: true});
var c2 = sampleImage.stratifiedSample({numPoints: SAMPLES_PER_CLASS, classBand: 'class', classValues: [2], region: aoi, scale: EXPORT_SCALE, seed: 3, geometries: true});
var c3 = sampleImage.stratifiedSample({numPoints: SAMPLES_PER_CLASS, classBand: 'class', classValues: [3], region: aoi, scale: EXPORT_SCALE, seed: 4, geometries: true});
var c4 = sampleImage.stratifiedSample({numPoints: SAMPLES_PER_CLASS, classBand: 'class', classValues: [4], region: aoi, scale: EXPORT_SCALE, seed: 5, geometries: true});

var allSamples = c0.merge(c1).merge(c2).merge(c3).merge(c4);
var training = allSamples.filter(ee.Filter.eq('block', 0));
var validation = allSamples.filter(ee.Filter.eq('block', 1));

print('Training samples (spatial block 0):', training.size());
print('Validation samples (spatial block 1 — holdout):', validation.size());

// ─── Random Forest (tuned: sqrt features ≈ 2 for 5 bands) ───────────────────
var classifier = ee.Classifier.smileRandomForest({
  numberOfTrees: RF_TREES,
  variablesPerSplit: 2,
  minLeafPopulation: 10,
  bagFraction: 0.7,
  seed: 42
}).train({
  features: training,
  classProperty: 'class',
  inputProperties: predictorBands
});

var explainDict = ee.Dictionary(classifier.explain());
var rawImportance = ee.Dictionary(explainDict.get('importance'));
var totalImportance = rawImportance.values().reduce(ee.Reducer.sum());
var importancePct = rawImportance.map(function(k, v) {
  return ee.Number(v).divide(totalImportance).multiply(100);
});

print('OOB error (training set only):', explainDict.get('outOfBagErrorEstimate'));
print('Feature importance (%):', importancePct);

// Spatial hold-out validation (honest accuracy — not inflated)
var validated = validation.classify(classifier);
var confusion = validated.errorMatrix('class', 'classification');
print('Spatial hold-out accuracy:', confusion.accuracy());
print('Spatial hold-out kappa:', confusion.kappa());
print('Hold-out confusion matrix:', confusion);

Map.addLayer(featureImage.classify(classifier).updateMask(mlLabel.gt(0)), {
  min: 0, max: 4, palette: ['#2d3436', '#0984e3', '#00b894', '#e17055', '#fdcb6e']
}, 'ML hold-out classification', false);

// Hotspot — larger kernel for regional flood patterns
var changeMask = mlLabel.gt(0);
var hotspot = changeMask.convolve(
  ee.Kernel.square({radius: HOTSPOT_RADIUS_PX, units: 'pixels'})
).rename('hotspot');

// Area stats on ML labels
function areaStatsGrouped(image, region, scale) {
  var areaImage = ee.Image.pixelArea().addBands(image);
  return ee.Feature(null, {
    groups: areaImage.reduceRegion({
      reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'class'}),
      geometry: region, scale: scale, maxPixels: 1e13
    }).get('groups')
  });
}

var CLASS_NAMES = {
  0: 'No Change', 1: 'Newly Inundated', 2: 'Vegetation Loss',
  3: 'Built-up Alteration', 4: 'Bare Soil Exposure'
};
var CLASS_COLORS = {
  '0': '#2d3436', '1': '#0984e3', '2': '#00b894', '3': '#e17055', '4': '#fdcb6e'
};

var areaFeature = areaStatsGrouped(mlLabel, aoi, EXPORT_SCALE);

var studyCentroid = aoi.centroid(1);
var mapCenter = ee.Feature(null, {
  lat: studyCentroid.coordinates().get(1),
  lng: studyCentroid.coordinates().get(0),
  zoom: 11
});

// ─── DASHBOARD EXPORTS ───────────────────────────────────────────────────────

Export.table.toDrive({
  collection: validation.classify(classifier).map(function(f) {
    var coords = f.geometry().coordinates();
    return f.set({longitude: coords.get(0), latitude: coords.get(1), predicted_class: f.get('classification')});
  }),
  description: '01_dashboard_validation_samples',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: training,
  description: '02_dashboard_training_samples',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: ee.FeatureCollection(importancePct.keys().map(function(key) {
    return ee.Feature(null, {feature: key, importance_pct: importancePct.get(key)});
  })),
  description: '03_dashboard_feature_importance',
  fileFormat: 'JSON'
});

Export.table.toDrive({
  collection: ee.FeatureCollection(ee.List(areaFeature.get('groups')).map(function(g) {
    g = ee.Dictionary(g);
    var classId = ee.Number(g.get('class')).toInt();
    var areaM2 = ee.Number(g.get('sum'));
    return ee.Feature(null, {
      class_id: classId,
      class_name: ee.Dictionary(CLASS_NAMES).get(classId.format('%d')),
      color: ee.Dictionary(CLASS_COLORS).get(classId.format('%d')),
      area_m2: areaM2,
      area_km2: areaM2.divide(1e6)
    });
  })),
  description: '04_dashboard_change_area_stats',
  fileFormat: 'JSON'
});

Export.table.toDrive({
  collection: ee.FeatureCollection([ee.Feature(null, {
    study_area_m2: aoi.area(1),
    study_area_km2: aoi.area(1).divide(1e6),
    oob_error: explainDict.get('outOfBagErrorEstimate'),
    validation_accuracy: confusion.accuracy(),
    kappa: confusion.kappa(),
    rf_trees: RF_TREES,
    sample_points: SAMPLES_PER_CLASS * 5,
    pre_start: PRE_START,
    pre_end: PRE_END,
    post_immediate_start: FLOOD_START,
    post_immediate_end: FLOOD_END,
    post_persist_start: FLOOD_START,
    post_persist_end: FLOOD_END,
    flood_km2: floodKm2,
    lulc_change_km2: lulcChangeKm2,
    lulc_new_water_km2: newlyInundatedKm2,
    agri_to_water_km2: agriWaterKm2,
    veg_to_water_km2: vegWaterKm2,
    built_to_water_km2: builtWaterKm2,
    veg_to_bare_soil_km2: vegBareSoilKm2,
    agri_to_bare_soil_km2: agriBareSoilKm2
  })]),
  description: '05_dashboard_model_metrics',
  fileFormat: 'JSON'
});

Export.table.toDrive({
  collection: mlLabel.updateMask(mlLabel.gt(0)).addBands(hotspot)
    .stratifiedSample({
      numPoints: 30, classBand: 'class', region: aoi,
      scale: EXPORT_SCALE, seed: 7, geometries: true
    })
    .map(function(f) {
      var coords = f.geometry().coordinates();
      var hs = ee.Number(f.get('hotspot'));
      var cls = ee.Number(f.get('class')).toInt();
      return ee.Feature(f.geometry(), {
        name: ee.Dictionary(CLASS_NAMES).get(cls.format('%d')),
        class_id: cls,
        lat: coords.get(1),
        lng: coords.get(0),
        hotspot_score: hs,
        severity: ee.Algorithms.If(hs.gte(6), 'high', ee.Algorithms.If(hs.gte(3), 'medium', 'low'))
      });
    }),
  description: '06_dashboard_hotspots',
  fileFormat: 'JSON'
});

Export.table.toDrive({
  collection: ee.FeatureCollection([mapCenter]),
  description: '07_dashboard_map_center',
  fileFormat: 'JSON'
});

Export.image.toDrive({
  image: mlLabel.addBands(hotspot).rename(['change_class', 'hotspot']),
  description: '08_terratrace_ml_geotiff',
  folder: 'TerraTrace_Dashboard',
  region: aoi,
  scale: EXPORT_SCALE,
  maxPixels: 1e13
});

// 09 — TerraTrace KPI cards for dashboard
Export.table.toDrive({
  collection: ee.FeatureCollection([ee.Feature(null, {
    newly_inundated_km2: newlyInundatedKm2,
    total_lulc_change_km2: lulcChangeKm2,
    agriculture_to_water_km2: agriWaterKm2,
    vegetation_to_water_km2: vegWaterKm2,
    builtup_to_water_km2: builtWaterKm2,
    study_area_km2: studyAreaKm2,
    inundated_water_km2: floodKm2,
    vegetation_loss_km2: vegLossKm2,
    veg_to_bare_soil_km2: vegBareSoilKm2,
    agri_to_bare_soil_km2: agriBareSoilKm2
  })]),
  description: '09_dashboard_kpis',
  fileFormat: 'JSON'
});

print('✓ 9 export tasks queued → Tasks tab → RUN each');
print('→ Share Drive exports → data/raw/ → merge + LIME → dashboard');
