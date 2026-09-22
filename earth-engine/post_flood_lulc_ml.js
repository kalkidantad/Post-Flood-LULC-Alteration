/**
 * Post-Flood LULC Alteration — ML + Explainable AI
 * SPARK 4.0 Nepal EO Hackathon
 *
 * Data: Landsat 9 + Sentinel-2
 * Assets:
 *   - projects/spatiocoretech-01-506820/assets/Bhoti_koshi_Trishulii_River
 *   - projects/spatiocoretech-01-506820/assets/Flood_Districts
 *
 * Workflow: baseline → change detection → temporal persistence → RF classification → XAI
 */

// ─── Configuration ───────────────────────────────────────────────────────────
var ASSET_RIVER = 'projects/spatiocoretech-01-506820/assets/Bhoti_koshi_Trishulii_River';
var ASSET_DISTRICTS = 'projects/spatiocoretech-01-506820/assets/Flood_Districts';

var PRE_START = '2026-06-01';
var PRE_END = '2026-07-15';
var POST_IMMEDIATE_START = '2026-08-01';
var POST_IMMEDIATE_END = '2026-08-20';
var POST_PERSIST_START = '2026-09-01';
var POST_PERSIST_END = '2026-09-20';

var CLOUD_THRESHOLD = 20; // Sentinel-2 cloud probability %
var RF_TREES = 300;
var SAMPLE_POINTS = 4000;
var EXPORT_SCALE = 30;

// Change classes
var CLASS_NAMES = {
  0: 'No Change',
  1: 'Erosion',
  2: 'Deposition',
  3: 'Vegetation Loss',
  4: 'Water Expansion',
  5: 'Built-up Alteration'
};

var CLASS_PALETTE = [
  '#2d3436', // no change
  '#e17055', // erosion
  '#fdcb6e', // deposition
  '#00b894', // vegetation loss (green loss → brownish, using teal)
  '#0984e3', // water
  '#6c5ce7'  // built-up
];

// ─── Study area ──────────────────────────────────────────────────────────────
var river = ee.FeatureCollection(ASSET_RIVER);
var districts = ee.FeatureCollection(ASSET_DISTRICTS);
var studyArea = districts.geometry().buffer(5000).intersection(
  river.geometry().buffer(8000), 500
);

Map.centerObject(studyArea, 10);
Map.addLayer(districts, {color: 'yellow', fillColor: '00000000'}, 'Flood Districts', false);
Map.addLayer(river, {color: 'cyan'}, 'Bhoti Koshi / Trishuli River');

// ─── Sentinel-2 preprocessing ────────────────────────────────────────────────
function maskS2Clouds(image) {
  var qa = image.select('QA60');
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
    .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).divide(10000)
    .copyProperties(image, ['system:time_start']);
}

function addS2Indices(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('S2_NDVI');
  var ndwi = image.normalizedDifference(['B3', 'B11']).rename('S2_NDWI');
  var ndbi = image.normalizedDifference(['B11', 'B8']).rename('S2_NDBI');
  var bsi = image.expression(
    '((SWIR + RED) - (NIR + BLUE)) / ((SWIR + RED) + (NIR + BLUE))',
    {
      SWIR: image.select('B11'),
      RED: image.select('B4'),
      NIR: image.select('B8'),
      BLUE: image.select('B2')
    }
  ).rename('S2_BSI');
  return image.addBands([ndvi, ndwi, ndbi, bsi]);
}

function s2Composite(start, end) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(studyArea)
    .filterDate(start, end)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', CLOUD_THRESHOLD))
    .map(maskS2Clouds)
    .map(addS2Indices)
    .median()
    .clip(studyArea);
}

// ─── Landsat 9 preprocessing ─────────────────────────────────────────────────
function maskL9Clouds(image) {
  var qa = image.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3).eq(0)
    .and(qa.bitwiseAnd(1 << 4).eq(0)))
    .and(qa.bitwiseAnd(1 << 5).eq(0)));
  return image.updateMask(mask)
    .multiply(0.0000275).add(-0.2)
    .copyProperties(image, ['system:time_start']);
}

function addL9Indices(image) {
  var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('L9_NDVI');
  var ndwi = image.normalizedDifference(['SR_B3', 'SR_B6']).rename('L9_NDWI');
  var nbr = image.normalizedDifference(['SR_B5', 'SR_B7']).rename('L9_NBR');
  return image.addBands([ndvi, ndwi, nbr]);
}

function l9Composite(start, end) {
  return ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
    .filterBounds(studyArea)
    .filterDate(start, end)
    .map(maskL9Clouds)
    .map(addL9Indices)
    .median()
    .clip(studyArea);
}

// ─── Build multi-temporal feature stack ──────────────────────────────────────
var preS2 = s2Composite(PRE_START, PRE_END);
var postImmS2 = s2Composite(POST_IMMEDIATE_START, POST_IMMEDIATE_END);
var postPersS2 = s2Composite(POST_PERSIST_START, POST_PERSIST_END);

var preL9 = l9Composite(PRE_START, PRE_END);
var postImmL9 = l9Composite(POST_IMMEDIATE_START, POST_IMMEDIATE_END);
var postPersL9 = l9Composite(POST_PERSIST_START, POST_PERSIST_END);

var s2Bands = ['S2_NDVI', 'S2_NDWI', 'S2_NDBI', 'S2_BSI'];
var l9Bands = ['L9_NDVI', 'L9_NDWI', 'L9_NBR'];

var preStack = preS2.select(s2Bands).addBands(preL9.select(l9Bands));
var postImmStack = postImmS2.select(s2Bands).addBands(postImmL9.select(l9Bands));
var postPersStack = postPersS2.select(s2Bands).addBands(postPersL9.select(l9Bands));

// Delta features (immediate & persistence)
var deltaImm = postImmStack.subtract(preStack).rename([
  'dImm_S2_NDVI', 'dImm_S2_NDWI', 'dImm_S2_NDBI', 'dImm_S2_BSI',
  'dImm_L9_NDVI', 'dImm_L9_NDWI', 'dImm_L9_NBR'
]);

var deltaPersist = postPersStack.subtract(preStack).rename([
  'dPers_S2_NDVI', 'dPers_S2_NDWI', 'dPers_S2_NDBI', 'dPers_S2_BSI',
  'dPers_L9_NDVI', 'dPers_L9_NDWI', 'dPers_L9_NBR'
]);

// Temporal persistence flag: |delta_persist| > |delta_immediate| * 0.5 → persistent
var persistMag = deltaPersist.select(['dPers_S2_NDWI', 'dPers_S2_NDVI']).abs().reduce(ee.Reducer.sum());
var immMag = deltaImm.select(['dImm_S2_NDWI', 'dImm_S2_NDVI']).abs().reduce(ee.Reducer.sum());
var isPersistent = persistMag.gt(immMag.multiply(0.5)).rename('persistent');

var featureImage = preStack
  .addBands(postPersStack)
  .addBands(deltaImm)
  .addBands(deltaPersist)
  .addBands(isPersistent);

var predictorBands = featureImage.bandNames();
print('Predictor bands:', predictorBands);

Map.addLayer(preStack.select('S2_NDVI'), {min: 0, max: 0.8, palette: ['brown', 'yellow', 'green']}, 'Pre NDVI', false);
Map.addLayer(deltaImm.select('dImm_S2_NDWI'), {min: -0.5, max: 0.5, palette: ['red', 'white', 'blue']}, 'Immediate NDWI Δ', false);

// ─── Rule-based pseudo-labels for RF training ─────────────────────────────────
// Thresholds tuned for flash-flood / debris-flow signatures in Himalayan valleys
function assignPseudoLabel(img) {
  var dNDVI = img.select('dPers_S2_NDVI');
  var dNDWI = img.select('dPers_S2_NDWI');
  var dBSI = img.select('dPers_S2_BSI');
  var dNDBI = img.select('dPers_S2_NDBI');
  var persist = img.select('persistent');

  var water = dNDWI.gt(0.15).and(persist);
  var erosion = dNDVI.lt(-0.2).and(dBSI.gt(0.1)).and(persist);
  var deposition = dBSI.gt(0.15).and(dNDVI.lt(-0.05)).and(dNDWI.lt(0.1)).and(persist);
  var vegLoss = dNDVI.lt(-0.25).and(dNDWI.lt(0.05)).and(persist);
  var builtUp = dNDBI.gt(0.1).and(dNDVI.lt(-0.1)).and(persist);

  var label = ee.Image(0)
    .where(water, 4)
    .where(erosion, 1)
    .where(deposition, 2)
    .where(vegLoss, 3)
    .where(builtUp, 5)
    .rename('class');

  return label;
}

var pseudoLabels = assignPseudoLabel(featureImage);

// ─── Random Forest training ───────────────────────────────────────────────────
var trainingSamples = featureImage.addBands(pseudoLabels)
  .stratifiedSample({
    numPoints: SAMPLE_POINTS,
    classBand: 'class',
    region: studyArea,
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

// ─── Explainable AI: Variable Importance ─────────────────────────────────────
var explainDict = ee.Dictionary(classifier.explain());
print('RF explain output:', explainDict);
print('Out-of-bag error:', explainDict.get('outOfBagErrorEstimate'));

var rawImportance = ee.Dictionary(explainDict.get('importance'));
var totalImportance = rawImportance.values().reduce(ee.Reducer.sum());

var importancePct = rawImportance.map(function(key, val) {
  return ee.Number(val).divide(totalImportance).multiply(100);
});
print('Feature importance (%)', importancePct);

// Confusion matrix on validation set
var validated = validation.classify(classifier);
var confusion = validated.errorMatrix('class', 'classification');
print('Validation confusion matrix:', confusion);
print('Validation accuracy:', confusion.accuracy());
print('Kappa:', confusion.kappa());

// ─── Classify & map ───────────────────────────────────────────────────────────
var classified = featureImage.classify(classifier).rename('change_class');
var classifiedPersistent = classified.updateMask(isPersistent);

Map.addLayer(classifiedPersistent.clip(studyArea), {
  min: 0, max: 5,
  palette: CLASS_PALETTE
}, 'ML Change Classification (Persistent)');

// ─── Area statistics ───────────────────────────────────────────────────────────
function areaStats(image, region, scale) {
  var areaImage = ee.Image.pixelArea().addBands(image);
  var stats = areaImage.reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'class'
    }),
    geometry: region,
    scale: scale,
    maxPixels: 1e13
  });
  return ee.Feature(null, {groups: stats.get('groups')});
}

var areaFeature = areaStats(classifiedPersistent, studyArea, EXPORT_SCALE);
print('Area by change class (m²):', areaFeature);

// Hotspot: kernel density of change pixels (excluding no-change)
var changeMask = classifiedPersistent.neq(0);
var hotspot = changeMask.convolve(ee.Kernel.circle({radius: 3, units: 'pixels'}))
  .rename('hotspot');
Map.addLayer(hotspot.updateMask(changeMask), {min: 1, max: 8, palette: ['yellow', 'orange', 'red']}, 'Change Hotspots', false);

// ─── Export for Next.js dashboard ──────────────────────────────────────────────
// Run export_dashboard_data.js separately, or uncomment below:

/*
Export.table.toDrive({
  collection: ee.FeatureCollection([areaFeature]),
  description: 'flood_change_area_stats',
  fileFormat: 'JSON'
});

Export.table.toDrive({
  collection: ee.FeatureCollection([ee.Feature(null, importancePct)]),
  description: 'flood_feature_importance',
  fileFormat: 'JSON'
});

Export.image.toAsset({
  image: classifiedPersistent.byte(),
  description: 'flood_lulc_change_classification',
  assetId: 'projects/spatiocoretech-01-506820/assets/Flood_LULC_Change_ML',
  region: studyArea,
  scale: EXPORT_SCALE,
  maxPixels: 1e13
});
*/
