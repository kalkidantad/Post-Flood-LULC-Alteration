// ---------> TERRATRACE HACKATHON <---------
// Landsat-9 flood + LULC + Random Forest ML + Dashboard exports
// Paste this ENTIRE file into Earth Engine Code Editor and Run.
// Then run all tasks in the Tasks tab.

// ═══════════════════════════════════════════════════════════════════════════
// 1. AREA OF INTEREST
// ═══════════════════════════════════════════════════════════════════════════

var River = ee.FeatureCollection('projects/spatiocoretech-01-506820/assets/Bhoti_koshi_Trishulii_River');
var aoi = River.geometry().buffer(5000);
Map.centerObject(aoi, 11);

Map.addLayer(River, {color: 'cyan'}, 'River', false);
Map.addLayer(aoi, {color: 'yellow'}, 'AOI', false);

// ═══════════════════════════════════════════════════════════════════════════
// 2–17. YOUR ORIGINAL PIPELINE (unchanged logic)
// ═══════════════════════════════════════════════════════════════════════════

var landsat9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2').filterBounds(aoi);

function scaleLandsat9(image) {
  var optical = image.select('SR_B.*').multiply(0.0000275).add(-0.2);
  return image.addBands(optical, null, true);
}

function maskLandsat9(image) {
  var qa = image.select('QA_PIXEL');
  var dilatedCloud = 1 << 1;
  var cirrus = 1 << 2;
  var cloud = 1 << 3;
  var cloudShadow = 1 << 4;
  var snow = 1 << 5;
  var mask = qa.bitwiseAnd(dilatedCloud).eq(0)
    .and(qa.bitwiseAnd(cirrus).eq(0))
    .and(qa.bitwiseAnd(cloud).eq(0))
    .and(qa.bitwiseAnd(cloudShadow).eq(0))
    .and(qa.bitwiseAnd(snow).eq(0));
  var saturation = image.select('QA_RADSAT').eq(0);
  return image.updateMask(mask).updateMask(saturation);
}

var l9 = landsat9.map(scaleLandsat9).map(maskLandsat9);

// Date windows ( widen flood window if exact day has no scenes )
var PRE_START = '2026-07-06';
var PRE_END = '2026-08-06';
var FLOOD_START = '2026-08-20';
var FLOOD_END = '2026-09-05';
var FLOOD_FALLBACK_START = '2026-08-01';
var FLOOD_FALLBACK_END = '2026-09-15';

var preCollection = l9.filterDate(PRE_START, PRE_END).sort('CLOUD_COVER');
var floodCollection = l9.filterDate(FLOOD_START, FLOOD_END).sort('CLOUD_COVER');
var floodFallback = l9.filterDate(FLOOD_FALLBACK_START, FLOOD_FALLBACK_END).sort('CLOUD_COVER');

print('Flood images:', floodCollection.size());
print('Pre images:', preCollection.size());
print('Flood fallback images:', floodFallback.size());

var preRef = preCollection.first();
var hasFlood = floodCollection.size().gt(0);
var floodSource = ee.ImageCollection(ee.Algorithms.If(
  hasFlood, floodCollection, floodFallback
));

var pre = preRef.clip(aoi);
var flood = floodSource.mosaic().clip(aoi);

// Safe dates — never pass null to ee.Date (mosaic/empty collections drop metadata)
function safeDateFromCollection(collection, fallback) {
  return ee.Date(ee.Algorithms.If(
    collection.size().gt(0),
    collection.sort('system:time_start', false).first().get('system:time_start'),
    ee.Date(fallback).millis()
  )).format('YYYY-MM-dd');
}

print('PRE date:', safeDateFromCollection(preCollection, PRE_START));
print('FLOOD date:', safeDateFromCollection(floodSource, '2026-08-26'));
print('FLOOD window:', FLOOD_START, 'to', FLOOD_END);

var naturalColor = {bands: ['SR_B4', 'SR_B3', 'SR_B2'], min: 0, max: 0.35};
Map.addLayer(pre, naturalColor, 'Landsat-9 PRE', false);
Map.addLayer(flood, naturalColor, 'Landsat-9 FLOOD — 26 Aug 2026', false);

var mndwiPre = pre.normalizedDifference(['SR_B3', 'SR_B6']).rename('MNDWI_PRE');
var mndwiFlood = flood.normalizedDifference(['SR_B3', 'SR_B6']).rename('MNDWI_FLOOD');
var deltaMNDWI = mndwiFlood.subtract(mndwiPre).rename('Delta_MNDWI');

var ndwiPre = pre.normalizedDifference(['SR_B3', 'SR_B5']).rename('NDWI_PRE');
var ndwiFlood = flood.normalizedDifference(['SR_B3', 'SR_B5']).rename('NDWI_FLOOD');
var deltaNDWI = ndwiFlood.subtract(ndwiPre).rename('Delta_NDWI');

var ndviPre = pre.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI_PRE');
var ndviFlood = flood.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI_FLOOD');
var deltaNDVI = ndviFlood.subtract(ndviPre).rename('Delta_NDVI');

var ndbiPre = pre.normalizedDifference(['SR_B6', 'SR_B5']).rename('NDBI_PRE');
var ndbiFlood = flood.normalizedDifference(['SR_B6', 'SR_B5']).rename('NDBI_FLOOD');
var deltaNDBI = ndbiFlood.subtract(ndbiPre).rename('Delta_NDBI');

var indexVis = {min: -0.5, max: 0.5, palette: ['8B4513', 'FFFFFF', '0000FF']};
var deltaVis = {min: -0.5, max: 0.5, palette: ['D73027', 'FFFFFF', '4575B4']};

Map.addLayer(mndwiPre, indexVis, 'MNDWI PRE', false);
Map.addLayer(mndwiFlood, indexVis, 'MNDWI FLOOD', false);
Map.addLayer(deltaMNDWI, deltaVis, 'DELTA MNDWI', false);
Map.addLayer(ndwiPre, indexVis, 'NDWI PRE', false);
Map.addLayer(ndwiFlood, indexVis, 'NDWI FLOOD', false);
Map.addLayer(deltaNDWI, deltaVis, 'DELTA NDWI', false);

var jrc = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').clip(aoi);
var permanentWater = jrc.gte(50).rename('Permanent_Water');
var nonPermanentWater = permanentWater.not();

Map.addLayer(permanentWater.selfMask(), {palette: ['0000FF']}, 'Permanent Water Mask', false);

var floodWater = mndwiFlood.gt(0.05).or(ndwiFlood.gt(0.10))
  .and(nonPermanentWater).rename('Flood_Water').unmask(0).toByte().clip(aoi);

Map.addLayer(floodWater, {min: 0, max: 1, palette: ['FFFFFF', '0000FF']},
  'BINARY FLOOD MAP — Inundated Areas', false);

var floodArea = floodWater.eq(1).multiply(ee.Image.pixelArea()).reduceRegion({
  reducer: ee.Reducer.sum(), geometry: aoi, scale: 30, maxPixels: 1e13
});
var floodKm2 = ee.Number(floodArea.get('Flood_Water')).divide(1e6);
print('========== INUNDATED WATER AREA (km²) ==========');
print(floodKm2);

var preWater = mndwiPre.gt(0.15);
var preVegetation = ndviPre.gt(0.30);
var preBuiltup = ndbiPre.gt(-0.05).and(ndviPre.lt(0.30)).and(preWater.not());

var lulcPre = ee.Image(4).where(preBuiltup, 3).where(preVegetation, 2).where(preWater, 1)
  .rename('LULC_PRE').clip(aoi).toByte();

var floodWaterClass = mndwiFlood.gt(0.15);
var floodVegetation = ndviFlood.gt(0.30);
var floodBuiltup = ndbiFlood.gt(-0.05).and(ndviFlood.lt(0.30)).and(floodWaterClass.not());

var lulcFlood = ee.Image(4).where(floodBuiltup, 3).where(floodVegetation, 2).where(floodWaterClass, 1)
  .rename('LULC_FLOOD').clip(aoi).toByte();

var lulcPalette = ['0000FF', '008000', 'FF0000', 'A0522D'];
Map.addLayer(lulcPre, {min: 1, max: 4, palette: lulcPalette}, 'LULC PRE', false);
Map.addLayer(lulcFlood, {min: 1, max: 4, palette: lulcPalette}, 'LULC FLOOD', false);

var lulcChange = lulcPre.neq(lulcFlood).rename('LULC_Change').toByte().clip(aoi);
Map.addLayer(lulcChange, {min: 0, max: 1, palette: ['FFFFFF', 'FF0000']}, 'LULC CHANGE — 0/1', false);

var lulcNewWater = lulcPre.neq(1).and(lulcFlood.eq(1)).and(nonPermanentWater)
  .rename('LULC_New_Water').unmask(0).toByte().clip(aoi);

Map.addLayer(lulcNewWater, {min: 0, max: 1, palette: ['FFFFFF', '0000FF']},
  'LULC NEWLY INUNDATED', false);

var vegetationLoss = lulcPre.eq(2).and(lulcFlood.neq(2)).and(lulcFlood.neq(1));
var builtupAlteration = lulcPre.eq(3).and(lulcFlood.neq(3));

var transformation = ee.Image(0)
  .where(lulcNewWater.eq(1), 1)
  .where(vegetationLoss, 2)
  .where(builtupAlteration, 3)
  .rename('TerraTrace_Transformation')
  .toByte()
  .clip(aoi);

Map.addLayer(transformation, {
  min: 0, max: 3, palette: ['FFFFFF', '0000FF', '00AA00', 'FF0000']
}, 'TERRATRACE LULC TRANSFORMATION', true);

// ═══════════════════════════════════════════════════════════════════════════
// 18. MACHINE LEARNING — Random Forest on TerraTrace features
// ═══════════════════════════════════════════════════════════════════════════

var EXPORT_SCALE = 30;
var RF_TREES = 300;
var SAMPLE_POINTS = 3000;

var CLASS_NAMES = {
  0: 'No Change',
  1: 'Newly Inundated',
  2: 'Vegetation Loss',
  3: 'Built-up Alteration'
};

var CLASS_COLORS = {
  '0': '#2d3436',
  '1': '#0984e3',
  '2': '#00b894',
  '3': '#e17055'
};

// Feature stack for ML (matches your indices)
var featureImage = ee.Image.cat([
  mndwiPre, mndwiFlood, deltaMNDWI,
  ndwiPre, ndwiFlood, deltaNDWI,
  ndviPre, ndviFlood, deltaNDVI,
  ndbiPre, ndbiFlood, deltaNDBI
]).clip(aoi);

var predictorBands = featureImage.bandNames();
print('ML predictor bands:', predictorBands);

// Use TerraTrace transformation as training labels
var trainingSamples = featureImage.addBands(transformation.rename('class'))
  .stratifiedSample({
    numPoints: SAMPLE_POINTS,
    classBand: 'class',
    region: aoi,
    scale: EXPORT_SCALE,
    seed: 42,
    geometries: true
  });

var split = trainingSamples.randomColumn('random', 42);
var training = split.filter(ee.Filter.lt('random', 0.7));
var validation = split.filter(ee.Filter.gte('random', 0.7));

var classifier = ee.Classifier.smileRandomForest({
  numberOfTrees: RF_TREES,
  variablesPerSplit: 4,
  minLeafPopulation: 5,
  bagFraction: 0.7,
  seed: 42
}).train({
  features: training,
  classProperty: 'class',
  inputProperties: predictorBands
});

// Explainable AI — Gini variable importance
var explainDict = ee.Dictionary(classifier.explain());
var rawImportance = ee.Dictionary(explainDict.get('importance'));
var totalImportance = rawImportance.values().reduce(ee.Reducer.sum());
var importancePct = rawImportance.map(function(key, val) {
  return ee.Number(val).divide(totalImportance).multiply(100);
});

print('Feature importance (%)', importancePct);
print('OOB error:', explainDict.get('outOfBagErrorEstimate'));

var validated = validation.classify(classifier);
var confusion = validated.errorMatrix('class', 'classification');
print('Validation accuracy:', confusion.accuracy());
print('Kappa:', confusion.kappa());

var mlClassified = featureImage.classify(classifier).rename('change_class');
var classifiedPersistent = mlClassified.updateMask(transformation.gt(0));

Map.addLayer(classifiedPersistent, {
  min: 0, max: 3,
  palette: ['2d3436', '0984e3', '00b894', 'e17055']
}, 'ML Classification (change areas)', false);

// Hotspots
var changeMask = transformation.gt(0);
var hotspot = changeMask.convolve(ee.Kernel.circle({radius: 3, units: 'pixels'})).rename('hotspot');

// Area stats
function areaStats(image, region, scale) {
  var areaImage = ee.Image.pixelArea().addBands(image);
  return ee.Feature(null, {
    groups: areaImage.reduceRegion({
      reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'class'}),
      geometry: region, scale: scale, maxPixels: 1e13
    }).get('groups')
  });
}

var areaFeature = areaStats(transformation, aoi, EXPORT_SCALE);
print('Area by class:', areaFeature);

// Summary prints
var lulcChangeArea = lulcChange.eq(1).multiply(ee.Image.pixelArea()).reduceRegion({
  reducer: ee.Reducer.sum(), geometry: aoi, scale: 30, maxPixels: 1e13
});
var lulcChangeKm2 = ee.Number(lulcChangeArea.get('LULC_Change')).divide(1e6);
var lulcWaterArea = lulcNewWater.eq(1).multiply(ee.Image.pixelArea()).reduceRegion({
  reducer: ee.Reducer.sum(), geometry: aoi, scale: 30, maxPixels: 1e13
});
var lulcWaterKm2 = ee.Number(lulcWaterArea.get('LULC_New_Water')).divide(1e6);

print('TERRATRACE — FINAL OUTPUTS');
print('Inundated water (km²):', floodKm2);
print('LULC change (km²):', lulcChangeKm2);
print('LULC new water (km²):', lulcWaterKm2);

// ═══════════════════════════════════════════════════════════════════════════
// 19. DASHBOARD EXPORTS — run all tasks in Tasks tab
// ═══════════════════════════════════════════════════════════════════════════

var studyArea = aoi;  // alias for export block
var POST_IMMEDIATE_START = FLOOD_START;
var POST_IMMEDIATE_END = FLOOD_END;
var POST_PERSIST_START = FLOOD_START;
var POST_PERSIST_END = FLOOD_END;

var studyCentroid = aoi.centroid(1);
var mapCenter = ee.Feature(null, {
  lat: studyCentroid.coordinates().get(1),
  lng: studyCentroid.coordinates().get(0),
  zoom: 11
});

// 01 — Validation CSV (for LIME)
Export.table.toDrive({
  collection: validation.classify(classifier).map(function(f) {
    var coords = f.geometry().coordinates();
    return f.set({
      longitude: coords.get(0),
      latitude: coords.get(1),
      predicted_class: f.get('classification')
    });
  }),
  description: '01_dashboard_validation_samples',
  fileFormat: 'CSV'
});

// 02 — Training CSV
Export.table.toDrive({
  collection: training,
  description: '02_dashboard_training_samples',
  fileFormat: 'CSV'
});

// 03 — Gini feature importance
Export.table.toDrive({
  collection: ee.FeatureCollection(importancePct.keys().map(function(key) {
    return ee.Feature(null, {feature: key, importance_pct: importancePct.get(key)});
  })),
  description: '03_dashboard_feature_importance',
  fileFormat: 'JSON'
});

// 04 — Area by class
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

// 05 — Model metrics
Export.table.toDrive({
  collection: ee.FeatureCollection([ee.Feature(null, {
    study_area_m2: aoi.area(1),
    study_area_km2: aoi.area(1).divide(1e6),
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
    post_persist_end: POST_PERSIST_END,
    flood_km2: floodKm2,
    lulc_change_km2: lulcChangeKm2,
    lulc_new_water_km2: lulcWaterKm2
  })]),
  description: '05_dashboard_model_metrics',
  fileFormat: 'JSON'
});

// 06 — Hotspot points for map
Export.table.toDrive({
  collection: transformation.updateMask(transformation.gt(0)).addBands(hotspot)
    .stratifiedSample({
      numPoints: 30, classBand: 'TerraTrace_Transformation',
      region: aoi, scale: EXPORT_SCALE, seed: 7, geometries: true
    })
    .map(function(f) {
      var coords = f.geometry().coordinates();
      var hs = ee.Number(f.get('hotspot'));
      var cls = ee.Number(f.get('TerraTrace_Transformation')).toInt();
      return ee.Feature(f.geometry(), {
        name: ee.Dictionary(CLASS_NAMES).get(cls.format('%d')),
        class_id: cls,
        lat: coords.get(1),
        lng: coords.get(0),
        hotspot_score: hs,
        severity: ee.Algorithms.If(hs.gte(6), 'high',
          ee.Algorithms.If(hs.gte(3), 'medium', 'low'))
      });
    }),
  description: '06_dashboard_hotspots',
  fileFormat: 'JSON'
});

// 07 — Map center
Export.table.toDrive({
  collection: ee.FeatureCollection([mapCenter]),
  description: '07_dashboard_map_center',
  fileFormat: 'JSON'
});

// 08 — Optional raster to Drive (works without project write access)
Export.image.toDrive({
  image: transformation.addBands(hotspot).rename(['transformation', 'hotspot']),
  description: '08_terratrace_transformation_geotiff',
  folder: 'TerraTrace_Dashboard',
  region: aoi,
  scale: EXPORT_SCALE,
  maxPixels: 1e13
});

print('✓ 8 export tasks queued → Tasks tab → RUN each one');
print('→ Download from Drive to data/raw/');
print('→ node scripts/merge_gee_exports.mjs');
print('→ python scripts/run_lime_xai.py');
