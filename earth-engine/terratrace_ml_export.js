// TERRATRACE — Hackathon_Final baseline + fixed ML + dashboard exports
// Paste entire file into Earth Engine Code Editor → Run → complete Tasks 01–09

// ═══════════════════════════════════════════════════════════════════════════
// 1. AREA OF INTEREST
// ═══════════════════════════════════════════════════════════════════════════

var River = ee.FeatureCollection('projects/spatiocoretech-01-506820/assets/Bhoti_koshi_Trishulii_River');
var aoi = River.geometry().buffer(1000);
var EXPORT_SCALE = 30;

Map.centerObject(aoi, 11);
Map.addLayer(River, {color: 'cyan'}, 'River', false);
Map.addLayer(aoi, {color: 'yellow'}, 'AOI', false);

var studyAreaKm2 = aoi.area().divide(1e6);
print('Study Area (km²):', studyAreaKm2);

// ═══════════════════════════════════════════════════════════════════════════
// 2. LANDSAT-9
// ═══════════════════════════════════════════════════════════════════════════

var landsat9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2').filterBounds(aoi);

function scaleLandsat9(image) {
  var optical = image.select('SR_B.*').multiply(0.0000275).add(-0.2);
  return image.addBands(optical, null, true);
}

function maskLandsat9(image) {
  var qa = image.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 1).eq(0)
    .and(qa.bitwiseAnd(1 << 2).eq(0))
    .and(qa.bitwiseAnd(1 << 3).eq(0))
    .and(qa.bitwiseAnd(1 << 4).eq(0))
    .and(qa.bitwiseAnd(1 << 5).eq(0));
  return image.updateMask(mask).updateMask(image.select('QA_RADSAT').eq(0));
}

var l9 = landsat9.map(scaleLandsat9).map(maskLandsat9);

var PRE_START = '2026-07-06';
var PRE_END = '2026-08-06';
var FLOOD_START = '2026-08-20';
var FLOOD_END = '2026-09-05';
var FLOOD_FALLBACK_START = '2026-08-01';
var FLOOD_FALLBACK_END = '2026-09-15';

var preCollection = l9.filterDate(PRE_START, PRE_END).sort('CLOUD_COVER');
var floodCollection = l9.filterDate(FLOOD_START, FLOOD_END).sort('CLOUD_COVER');
var floodFallback = l9.filterDate(FLOOD_FALLBACK_START, FLOOD_FALLBACK_END).sort('CLOUD_COVER');

print('=== DATA QUALITY ===');
print('Pre cloud-free images:', preCollection.size());
print('Flood images (primary window):', floodCollection.size());
print('Flood fallback images:', floodFallback.size());

var hasFlood = floodCollection.size().gt(0);
var floodSource = ee.ImageCollection(ee.Algorithms.If(hasFlood, floodCollection, floodFallback));
var pre = preCollection.first().clip(aoi);
var flood = floodSource.mosaic().clip(aoi);

function safeDateFromCollection(collection, fallback) {
  return ee.Date(ee.Algorithms.If(
    collection.size().gt(0),
    collection.sort('system:time_start', false).first().get('system:time_start'),
    ee.Date(fallback).millis()
  )).format('YYYY-MM-dd');
}

print('PRE date:', safeDateFromCollection(preCollection, PRE_START));
print('FLOOD date:', safeDateFromCollection(floodSource, '2026-08-26'));
print('Valid pixel fraction (pre):', pre.mask().reduceRegion({
  reducer: ee.Reducer.mean(), geometry: aoi, scale: EXPORT_SCALE, maxPixels: 1e13
}));
print('Valid pixel fraction (flood):', flood.mask().reduceRegion({
  reducer: ee.Reducer.mean(), geometry: aoi, scale: EXPORT_SCALE, maxPixels: 1e13
}));

var naturalColor = {bands: ['SR_B4', 'SR_B3', 'SR_B2'], min: 0, max: 0.35};
Map.addLayer(pre, naturalColor, 'Landsat-9 PRE', false);
Map.addLayer(flood, naturalColor, 'Landsat-9 FLOOD', false);

// ═══════════════════════════════════════════════════════════════════════════
// 3. SPECTRAL INDICES
// ═══════════════════════════════════════════════════════════════════════════

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

var bsiPre = pre.expression(
  '((SWIR1 + RED) - (NIR + BLUE)) / ((SWIR1 + RED) + (NIR + BLUE))',
  {SWIR1: pre.select('SR_B6'), RED: pre.select('SR_B4'), NIR: pre.select('SR_B5'), BLUE: pre.select('SR_B2')}
).rename('BSI_PRE');

var bsiFlood = flood.expression(
  '((SWIR1 + RED) - (NIR + BLUE)) / ((SWIR1 + RED) + (NIR + BLUE))',
  {SWIR1: flood.select('SR_B6'), RED: flood.select('SR_B4'), NIR: flood.select('SR_B5'), BLUE: flood.select('SR_B2')}
).rename('BSI_FLOOD');

var indexVis = {min: -0.5, max: 0.5, palette: ['8B4513', 'FFFFFF', '0000FF']};
var deltaVis = {min: -0.5, max: 0.5, palette: ['D73027', 'FFFFFF', '4575B4']};

Map.addLayer(mndwiPre, indexVis, 'MNDWI PRE', false);
Map.addLayer(mndwiFlood, indexVis, 'MNDWI FLOOD', false);
Map.addLayer(deltaMNDWI, deltaVis, 'DELTA MNDWI', false);
Map.addLayer(ndwiPre, indexVis, 'NDWI PRE', false);
Map.addLayer(ndwiFlood, indexVis, 'NDWI FLOOD', false);
Map.addLayer(deltaNDWI, deltaVis, 'DELTA NDWI', false);

// ═══════════════════════════════════════════════════════════════════════════
// 4. PERMANENT WATER (JRC)
// ═══════════════════════════════════════════════════════════════════════════

var jrc = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').clip(aoi);
var permanentWater = jrc.gte(50).rename('Permanent_Water');
var nonPermanentWater = permanentWater.not();

Map.addLayer(permanentWater.selfMask(), {palette: ['0000FF']}, 'Permanent Water Mask', false);

// ═══════════════════════════════════════════════════════════════════════════
// 5. ADAPTIVE LULC THRESHOLDS (AOI percentiles — not fixed globals)
// ═══════════════════════════════════════════════════════════════════════════

function percentileThreshold(image, band, pct, fallback) {
  var stats = image.select(band).reduceRegion({
    reducer: ee.Reducer.percentile([pct]),
    geometry: aoi, scale: EXPORT_SCALE * 2, maxPixels: 1e13, bestEffort: true
  });
  return ee.Number(ee.Algorithms.If(
    stats.contains(band + '_p' + pct),
    stats.get(band + '_p' + pct),
    fallback
  ));
}

var waterThPre = percentileThreshold(mndwiPre, 'MNDWI_PRE', 65, 0.15);
var waterThFlood = percentileThreshold(mndwiFlood, 'MNDWI_FLOOD', 65, 0.15);
var vegThPre = percentileThreshold(ndviPre, 'NDVI_PRE', 55, 0.30);
var vegThFlood = percentileThreshold(ndviFlood, 'NDVI_FLOOD', 55, 0.30);
var builtThPre = percentileThreshold(ndbiPre, 'NDBI_PRE', 45, -0.05);
var builtThFlood = percentileThreshold(ndbiFlood, 'NDBI_FLOOD', 45, -0.05);
var bsiThFlood = percentileThreshold(bsiFlood, 'BSI_FLOOD', 60, 0.15);

print('Adaptive thresholds — water pre/flood:', waterThPre, waterThFlood);
print('Adaptive thresholds — veg pre/flood:', vegThPre, vegThFlood);

// ═══════════════════════════════════════════════════════════════════════════
// 6. FLOOD WATER (absolute + delta, exclude permanent water)
// ═══════════════════════════════════════════════════════════════════════════

var floodWater = mndwiFlood.gt(waterThFlood.multiply(0.5))
  .or(ndwiFlood.gt(0.10))
  .or(deltaMNDWI.gt(0.08))
  .and(nonPermanentWater)
  .rename('Flood_Water').unmask(0).toByte().clip(aoi);

Map.addLayer(floodWater, {min: 0, max: 1, palette: ['FFFFFF', '0000FF']},
  'BINARY FLOOD MAP', false);

function calculateAreaKm2(layer, name) {
  var area = layer.eq(1).multiply(ee.Image.pixelArea()).reduceRegion({
    reducer: ee.Reducer.sum(), geometry: aoi, scale: EXPORT_SCALE, maxPixels: 1e13
  });
  var km2 = ee.Number(area.values().get(0)).divide(1e6);
  print(name + ' (km²):', km2);
  return km2;
}

var floodKm2 = calculateAreaKm2(floodWater, 'Inundated Water');

// ═══════════════════════════════════════════════════════════════════════════
// 7. LULC (permanent water = class 1; dynamic thresholds)
// ═══════════════════════════════════════════════════════════════════════════

var preWater = mndwiPre.gt(waterThPre).or(permanentWater);
var preVegetation = ndviPre.gt(vegThPre).and(preWater.not());
var preBuiltup = ndbiPre.gt(builtThPre).and(ndviPre.lt(vegThPre)).and(preWater.not());
var preAgriculture = preWater.not().and(preVegetation.not()).and(preBuiltup.not());

var lulcPre = ee.Image(4)
  .where(preAgriculture, 4).where(preBuiltup, 3).where(preVegetation, 2).where(preWater, 1)
  .rename('LULC_PRE').clip(aoi).toByte();

var floodWaterClass = mndwiFlood.gt(waterThFlood).or(permanentWater);
var floodVegetation = ndviFlood.gt(vegThFlood).and(floodWaterClass.not());
var floodBuiltup = ndbiFlood.gt(builtThFlood).and(ndviFlood.lt(vegThFlood)).and(floodWaterClass.not());
var floodAgriculture = floodWaterClass.not().and(floodVegetation.not()).and(floodBuiltup.not());

var lulcFlood = ee.Image(4)
  .where(floodAgriculture, 4).where(floodBuiltup, 3).where(floodVegetation, 2).where(floodWaterClass, 1)
  .rename('LULC_FLOOD').clip(aoi).toByte();

var lulcPalette = ['0000FF', '008000', 'FF0000', 'FFD700'];
Map.addLayer(lulcPre, {min: 1, max: 4, palette: lulcPalette}, 'LULC PRE', false);
Map.addLayer(lulcFlood, {min: 1, max: 4, palette: lulcPalette}, 'LULC FLOOD', false);

var lulcChange = lulcPre.neq(lulcFlood).rename('LULC_Change').toByte().clip(aoi);
Map.addLayer(lulcChange, {min: 0, max: 1, palette: ['FFFFFF', 'FF0000']}, 'LULC CHANGE', false);

// ═══════════════════════════════════════════════════════════════════════════
// 8. TRANSITIONS (independent layers for ML labels)
// ═══════════════════════════════════════════════════════════════════════════

var waterNewlyInundated = lulcPre.neq(1).and(lulcFlood.eq(1)).and(nonPermanentWater)
  .rename('Newly_Inundated').unmask(0).toByte().clip(aoi);

var agriToWater = lulcPre.eq(4).and(lulcFlood.eq(1)).and(nonPermanentWater)
  .rename('Agri_to_Water').unmask(0).toByte().clip(aoi);
var vegToWater = lulcPre.eq(2).and(lulcFlood.eq(1)).and(nonPermanentWater)
  .rename('Veg_to_Water').unmask(0).toByte().clip(aoi);
var builtToWater = lulcPre.eq(3).and(lulcFlood.eq(1)).and(nonPermanentWater)
  .rename('Built_to_Water').unmask(0).toByte().clip(aoi);

var vegetationLoss = lulcPre.eq(2).and(lulcFlood.neq(2)).and(lulcFlood.neq(1))
  .rename('Vegetation_Loss').unmask(0).toByte().clip(aoi);
var builtupAlteration = lulcPre.eq(3).and(lulcFlood.neq(3))
  .rename('Builtup_Alteration').unmask(0).toByte().clip(aoi);

var bareSoilFlood = bsiFlood.gt(bsiThFlood).and(ndviFlood.lt(vegThFlood))
  .and(floodWaterClass.not()).and(floodBuiltup.not())
  .rename('Bare_Soil_Flood').unmask(0).toByte().clip(aoi);

var vegToBareSoil = lulcPre.eq(2).and(bareSoilFlood.eq(1))
  .rename('Veg_to_Bare_Soil').unmask(0).toByte().clip(aoi);
var agriToBareSoil = lulcPre.eq(4).and(bareSoilFlood.eq(1))
  .rename('Agri_to_Bare_Soil').unmask(0).toByte().clip(aoi);

var transformation = ee.Image(0)
  .where(waterNewlyInundated.eq(1), 1)
  .where(vegToWater.eq(1), 1).where(agriToWater.eq(1), 1).where(builtToWater.eq(1), 1)
  .where(vegetationLoss.eq(1), 2)
  .where(builtupAlteration.eq(1), 3)
  .rename('TerraTrace_Transformation').toByte().clip(aoi);

Map.addLayer(transformation, {
  min: 0, max: 3, palette: ['FFFFFF', '0000FF', '00AA00', 'FF0000']
}, 'TERRATRACE TRANSFORMATION', true);

// KPI areas
var newlyInundatedKm2 = calculateAreaKm2(waterNewlyInundated, 'Newly Inundated');
var lulcChangeKm2 = calculateAreaKm2(lulcChange, 'Total LULC Change');
var agriWaterKm2 = calculateAreaKm2(agriToWater, 'Agriculture → Water');
var vegWaterKm2 = calculateAreaKm2(vegToWater, 'Vegetation → Water');
var builtWaterKm2 = calculateAreaKm2(builtToWater, 'Built-up → Water');
var vegLossKm2 = calculateAreaKm2(vegetationLoss, 'Vegetation Loss');
var vegBareSoilKm2 = calculateAreaKm2(vegToBareSoil, 'Vegetation → Bare Soil');
var agriBareSoilKm2 = calculateAreaKm2(agriToBareSoil, 'Agriculture → Bare Soil');

// ═══════════════════════════════════════════════════════════════════════════
// 9. FIXED ML — delta features, spatial hold-out, balanced sampling
// ═══════════════════════════════════════════════════════════════════════════

var RF_TREES = 500;
var SAMPLES_PER_CLASS = 600;
var HOTSPOT_RADIUS_PX = 5;

var deltaBSI = bsiFlood.subtract(bsiPre).rename('Delta_BSI');
var featureRaw = ee.Image.cat([
  deltaMNDWI, deltaNDWI, deltaNDVI, deltaNDBI, deltaBSI
]).clip(aoi);

// Scale [-1,1] → [0,1]
var featureImage = featureRaw.add(1).divide(2).rename(featureRaw.bandNames());
var predictorBands = featureImage.bandNames();
print('ML features (delta-only, normalized):', predictorBands);

// Labels from independent transition layers (NOT transformation composite)
var mlLabel = ee.Image(0)
  .where(waterNewlyInundated.eq(1), 1)
  .where(vegetationLoss.eq(1), 2)
  .where(builtupAlteration.eq(1), 3)
  .where(vegToBareSoil.eq(1), 4)
  .where(agriToBareSoil.eq(1), 4)
  .rename('class');

var lonLat = ee.Image.pixelLonLat().clip(aoi);
var spatialBlock = lonLat.select('longitude').multiply(500).int16()
  .add(lonLat.select('latitude').multiply(500).int16())
  .mod(2).rename('block');

var sampleImage = featureImage.addBands(mlLabel).addBands(spatialBlock);

function sampleClass(classValue, seed) {
  return sampleImage.stratifiedSample({
    numPoints: SAMPLES_PER_CLASS, classBand: 'class', classValues: [classValue],
    region: aoi, scale: EXPORT_SCALE, seed: seed, geometries: true
  });
}

var allSamples = sampleClass(0, 1).merge(sampleClass(1, 2)).merge(sampleClass(2, 3))
  .merge(sampleClass(3, 4)).merge(sampleClass(4, 5));

var training = allSamples.filter(ee.Filter.eq('block', 0));
var validation = allSamples.filter(ee.Filter.eq('block', 1));

print('Training samples (spatial block 0):', training.size());
print('Validation samples (spatial block 1 — holdout):', validation.size());

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

print('OOB error (training only):', explainDict.get('outOfBagErrorEstimate'));
print('Feature importance (%):', importancePct);

var validated = validation.classify(classifier);
var confusion = validated.errorMatrix('class', 'classification');
print('Spatial hold-out accuracy:', confusion.accuracy());
print('Spatial hold-out kappa:', confusion.kappa());

Map.addLayer(featureImage.classify(classifier).updateMask(mlLabel.gt(0)), {
  min: 0, max: 4, palette: ['#2d3436', '#0984e3', '#00b894', '#e17055', '#fdcb6e']
}, 'ML hold-out classification', false);

var hotspot = mlLabel.gt(0).convolve(
  ee.Kernel.square({radius: HOTSPOT_RADIUS_PX, units: 'pixels'})
).rename('hotspot');

var CLASS_NAMES = {
  0: 'No Change', 1: 'Newly Inundated', 2: 'Vegetation Loss',
  3: 'Built-up Alteration', 4: 'Bare Soil Exposure'
};
var CLASS_COLORS = {
  '0': '#2d3436', '1': '#0984e3', '2': '#00b894', '3': '#e17055', '4': '#fdcb6e'
};

function areaStatsGrouped(image, region, scale) {
  var areaImage = ee.Image.pixelArea().addBands(image);
  return ee.Feature(null, {
    groups: areaImage.reduceRegion({
      reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'class'}),
      geometry: region, scale: scale, maxPixels: 1e13
    }).get('groups')
  });
}

var areaFeature = areaStatsGrouped(mlLabel, aoi, EXPORT_SCALE);
var studyCentroid = aoi.centroid(1);
var mapCenter = ee.Feature(null, {
  lat: studyCentroid.coordinates().get(1),
  lng: studyCentroid.coordinates().get(0),
  zoom: 11
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. DASHBOARD EXPORTS (Tasks 01–09)
// ═══════════════════════════════════════════════════════════════════════════

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
    study_area_km2: studyAreaKm2,
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
    .stratifiedSample({numPoints: 30, classBand: 'class', region: aoi, scale: EXPORT_SCALE, seed: 7, geometries: true})
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
