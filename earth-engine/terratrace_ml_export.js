// TERRATRACE — Hackathon_Final + K-means ML + dashboard exports (no ui.* — Next.js dashboard)
// Paste entire file into Earth Engine Code Editor → Run → complete Tasks 01–10

// ═══════════════════════════════════════════════════════════════════════════
// 1. AREA OF INTEREST
// ═══════════════════════════════════════════════════════════════════════════

var River = ee.FeatureCollection('projects/spatiocoretech-01-506820/assets/Bhoti_koshi_Trishulii_River');
var aoi = River.geometry().buffer(1000);

var EXPORT_SCALE = 30;
var CLUSTER_TRAIN_SCALE = 60;
var CLUSTER_MAX_PIXELS = 2500;
var CLUSTER_TILE_SCALE = 2;
var PROFILE_SCALE = 60;

Map.centerObject(aoi, 11);

var studyAreaKm2 = aoi.area().divide(1e6);
print('Study Area (km²):', studyAreaKm2);

Map.addLayer(River, {color: 'cyan'}, 'River', false);
Map.addLayer(aoi, {color: 'yellow'}, 'AOI', false);

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

var preDate = safeDateFromCollection(preCollection, PRE_START);
var floodDate = safeDateFromCollection(floodSource, '2026-08-26');

print('PRE date:', preDate);
print('FLOOD date:', floodDate);
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

var deltaBSI = bsiFlood.subtract(bsiPre).rename('Delta_BSI');

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
// 5. BINARY FLOOD MAP
// ═══════════════════════════════════════════════════════════════════════════

var floodWater = mndwiFlood.gt(0.05)
  .or(ndwiFlood.gt(0.10))
  .and(nonPermanentWater)
  .rename('Flood_Water')
  .unmask(0)
  .toByte()
  .clip(aoi);

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
// 6. LULC (1=Water, 2=Vegetation, 3=Built-up, 4=Agriculture)
// ═══════════════════════════════════════════════════════════════════════════

var preWater = mndwiPre.gt(0.15);
var preVegetation = ndviPre.gt(0.30);
var preBuiltup = ndbiPre.gt(-0.05).and(ndviPre.lt(0.30)).and(preWater.not());
var preAgriculture = preWater.not().and(preVegetation.not()).and(preBuiltup.not());

var lulcPre = ee.Image(4)
  .where(preAgriculture, 4).where(preBuiltup, 3).where(preVegetation, 2).where(preWater, 1)
  .rename('LULC_PRE').clip(aoi).toByte();

var floodWaterClass = mndwiFlood.gt(0.15);
var floodVegetation = ndviFlood.gt(0.30);
var floodBuiltup = ndbiFlood.gt(-0.05).and(ndviFlood.lt(0.30)).and(floodWaterClass.not());
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
// 7. TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════

var waterNewlyInundated = lulcPre.neq(1).and(lulcFlood.eq(1)).and(nonPermanentWater)
  .rename('Newly_Inundated').unmask(0).toByte().clip(aoi);

var agriToWater = lulcPre.eq(4).and(lulcFlood.eq(1)).and(nonPermanentWater)
  .rename('Agri_to_Water').unmask(0).toByte().clip(aoi);
var vegToWater = lulcPre.eq(2).and(lulcFlood.eq(1)).and(nonPermanentWater)
  .rename('Veg_to_Water').unmask(0).toByte().clip(aoi);
var builtToWater = lulcPre.eq(3).and(lulcFlood.eq(1)).and(nonPermanentWater)
  .rename('Built_to_Water').unmask(0).toByte().clip(aoi);

var agriToVeg = lulcPre.eq(4).and(lulcFlood.eq(2))
  .rename('Agri_to_Veg').unmask(0).toByte().clip(aoi);
var builtToVeg = lulcPre.eq(3).and(lulcFlood.eq(2))
  .rename('Built_to_Veg').unmask(0).toByte().clip(aoi);
var agriToBuilt = lulcPre.eq(4).and(lulcFlood.eq(3))
  .rename('Agri_to_Built').unmask(0).toByte().clip(aoi);
var vegToBuilt = lulcPre.eq(2).and(lulcFlood.eq(3))
  .rename('Veg_to_Built').unmask(0).toByte().clip(aoi);
var vegToAgri = lulcPre.eq(2).and(lulcFlood.eq(4))
  .rename('Veg_to_Agri').unmask(0).toByte().clip(aoi);
var builtToAgri = lulcPre.eq(3).and(lulcFlood.eq(4))
  .rename('Built_to_Agri').unmask(0).toByte().clip(aoi);

var vegetationLoss = lulcPre.eq(2).and(lulcFlood.neq(2)).and(lulcFlood.neq(1))
  .rename('Vegetation_Loss').unmask(0).toByte().clip(aoi);
var builtupAlteration = lulcPre.eq(3).and(lulcFlood.neq(3))
  .rename('Builtup_Alteration').unmask(0).toByte().clip(aoi);

Map.addLayer(waterNewlyInundated, {min: 0, max: 1, palette: ['FFFFFF', '0000FF']}, 'Newly Inundated Water', false);
Map.addLayer(vegetationLoss, {min: 0, max: 1, palette: ['FFFFFF', '8B4513']}, 'Vegetation Loss', false);
Map.addLayer(builtupAlteration, {min: 0, max: 1, palette: ['FFFFFF', 'FF00FF']}, 'Built-up Alteration', false);

// ═══════════════════════════════════════════════════════════════════════════
// 8. TERRATRACE TRANSFORMATION
// ═══════════════════════════════════════════════════════════════════════════

var transformation = ee.Image(0)
  .where(waterNewlyInundated.eq(1), 1)
  .where(vegToWater.eq(1), 1).where(agriToWater.eq(1), 1).where(builtToWater.eq(1), 1)
  .where(vegetationLoss.eq(1), 2)
  .where(agriToBuilt.eq(1), 3).where(vegToBuilt.eq(1), 3).where(builtupAlteration.eq(1), 3)
  .rename('TerraTrace_Transformation').toByte().clip(aoi);

Map.addLayer(transformation, {
  min: 0, max: 3, palette: ['FFFFFF', '0000FF', '00AA00', 'FF0000']
}, 'TERRATRACE TRANSFORMATION', true);

// ═══════════════════════════════════════════════════════════════════════════
// 9. BARE SOIL
// ═══════════════════════════════════════════════════════════════════════════

var bareSoilFlood = bsiFlood.gt(0.15)
  .and(ndviFlood.lt(0.30))
  .and(floodWaterClass.not())
  .and(floodBuiltup.not())
  .rename('Bare_Soil_Flood').unmask(0).toByte().clip(aoi);

var vegToBareSoil = lulcPre.eq(2).and(bareSoilFlood.eq(1))
  .rename('Veg_to_Bare_Soil').unmask(0).toByte().clip(aoi);
var agriToBareSoil = lulcPre.eq(4).and(bareSoilFlood.eq(1))
  .rename('Agri_to_Bare_Soil').unmask(0).toByte().clip(aoi);

var bareSoilTransformation = ee.Image(0)
  .where(vegToBareSoil.eq(1), 1)
  .where(agriToBareSoil.eq(1), 2)
  .rename('TerraTrace_BareSoil_Transformation').toByte().clip(aoi);

Map.addLayer(bareSoilFlood, {min: 0, max: 1, palette: ['FFFFFF', '8B4513']}, 'Bare Soil — Flood Event', false);
Map.addLayer(bareSoilTransformation.selfMask(), {
  min: 1, max: 2, palette: ['00AA00', '8B4513']
}, 'TERRATRACE — BARE SOIL TRANSFORMATION', false);

// ═══════════════════════════════════════════════════════════════════════════
// 10. AREA STATISTICS (rule-based)
// ═══════════════════════════════════════════════════════════════════════════

var newlyInundatedKm2 = calculateAreaKm2(waterNewlyInundated, 'Newly Inundated');
var agriWaterKm2 = calculateAreaKm2(agriToWater, 'Agriculture → Water');
var vegWaterKm2 = calculateAreaKm2(vegToWater, 'Vegetation → Water');
var builtWaterKm2 = calculateAreaKm2(builtToWater, 'Built-up → Water');
var lulcChangeKm2 = calculateAreaKm2(lulcChange, 'Total LULC Change');
var vegLossKm2 = calculateAreaKm2(vegetationLoss, 'Vegetation Loss');
var agriVegKm2 = calculateAreaKm2(agriToVeg, 'Agriculture → Vegetation');
var vegAgriKm2 = calculateAreaKm2(vegToAgri, 'Vegetation → Agriculture');
var agriBuiltKm2 = calculateAreaKm2(agriToBuilt, 'Agriculture → Built-up');
var vegBuiltKm2 = calculateAreaKm2(vegToBuilt, 'Vegetation → Built-up');
var builtAltKm2 = calculateAreaKm2(builtupAlteration, 'Built-up Alteration');
var vegBareSoilKm2 = calculateAreaKm2(vegToBareSoil, 'Vegetation → Bare Soil');
var agriBareSoilKm2 = calculateAreaKm2(agriToBareSoil, 'Agriculture → Bare Soil');

// ═══════════════════════════════════════════════════════════════════════════
// 11. FLOOD IMPACT — RISK, DAMAGE, IMPACT
// ═══════════════════════════════════════════════════════════════════════════

var transition21 = lulcPre.eq(2).and(lulcFlood.eq(1)).toByte();
var transition31 = lulcPre.eq(3).and(lulcFlood.eq(1)).toByte();
var transition41 = lulcPre.eq(4).and(lulcFlood.eq(1)).toByte();

var floodRisk = ee.Image(0)
  .where(floodWater.eq(1).and(lulcPre.eq(1)), 1)
  .where(floodWater.eq(1).and(lulcPre.eq(2)), 2)
  .where(floodWater.eq(1).and(lulcPre.eq(4)), 3)
  .where(floodWater.eq(1).and(lulcPre.eq(3)), 4)
  .rename('Flood_Risk').toByte().clip(aoi);

var floodDamage = ee.Image(0)
  .where(transition21.eq(1), 2)
  .where(transition41.eq(1), 3)
  .where(transition31.eq(1), 4)
  .rename('Flood_Damage').toByte().clip(aoi);

var floodImpact = ee.Image(0)
  .where(floodRisk.eq(1), 1)
  .where(floodRisk.eq(2), 2)
  .where(floodRisk.eq(3), 3)
  .where(floodRisk.eq(4), 4)
  .rename('Flood_Impact').toByte().clip(aoi);

Map.addLayer(floodRisk.selfMask(), {
  min: 1, max: 4, palette: ['FFFF00', '7CFC00', 'FFA500', 'FF0000']
}, 'FLOOD IMPACT RISK', false);
Map.addLayer(floodDamage.selfMask(), {
  min: 1, max: 4, palette: ['87CEEB', '00AA00', 'FFD700', 'FF0000']
}, 'FLOOD DAMAGE', false);
Map.addLayer(floodImpact.selfMask(), {
  min: 1, max: 4, palette: ['FFFF00', '00FF00', 'FFA500', 'FF0000']
}, 'FINAL FLOOD IMPACT', false);

// ═══════════════════════════════════════════════════════════════════════════
// 12. K-MEANS ML (delta bands only, speed-optimized)
// ═══════════════════════════════════════════════════════════════════════════

var clusterBands = ['Delta_MNDWI', 'Delta_NDWI', 'Delta_NDVI', 'Delta_NDBI', 'Delta_BSI'];
var mlFeatureImage = ee.Image.cat([
  deltaMNDWI, deltaNDWI, deltaNDVI, deltaNDBI, deltaBSI
]).clip(aoi);

// JRC occurrence is masked where water was never seen — unmask(0) first
var jrcOcc = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
  .select('occurrence')
  .unmask(0);
var notPermWater = jrcOcc.lt(50);
var clusterInput = mlFeatureImage.updateMask(notPermWater);

print('Valid delta coverage of AOI (0-1):',
  mlFeatureImage.select('Delta_MNDWI').mask().reduceRegion({
    reducer: ee.Reducer.mean(), geometry: aoi, scale: EXPORT_SCALE,
    maxPixels: 1e13, tileScale: CLUSTER_TILE_SCALE
  }));

var kmTrain = clusterInput.sample({
  region: aoi,
  scale: CLUSTER_TRAIN_SCALE,
  numPixels: CLUSTER_MAX_PIXELS,
  seed: 7,
  tileScale: CLUSTER_TILE_SCALE
});
print('K-means training samples (must be > 0):', kmTrain.size());

var K = 5;
var kmeans = ee.Clusterer.wekaKMeans(K).train(kmTrain);
var clusters = clusterInput.cluster(kmeans).rename('cluster').clip(aoi);

Map.addLayer(clusters.randomVisualizer(), {}, 'K-means clusters (random colors)', false);

var profile = clusterInput.addBands(clusters).reduceRegion({
  reducer: ee.Reducer.mean().repeat(5).group({groupField: 5, groupName: 'cluster'}),
  geometry: aoi,
  scale: PROFILE_SCALE,
  maxPixels: 1e13,
  tileScale: CLUSTER_TILE_SCALE
});
print('Cluster mean profile (order: ' + clusterBands.join(', ') + '):', profile);

var clusterAreaStats = ee.Image.pixelArea().divide(1e6).addBands(clusters).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'cluster'}),
  geometry: aoi,
  scale: PROFILE_SCALE,
  maxPixels: 1e13,
  tileScale: CLUSTER_TILE_SCALE
});
print('Cluster area (km²):', clusterAreaStats);

// Auto-name clusters from profile (client-side thresholds)
var groups = profile.getInfo().groups;
var floodId = -1, vegId = -1, builtId = -1;
var bestM = -Infinity, bestV = Infinity, bestB = -Infinity;

groups.forEach(function(g) {
  if (g.mean[0] > bestM) { bestM = g.mean[0]; floodId = g.cluster; }
});
if (bestM < 0.10) { floodId = -1; }

groups.forEach(function(g) {
  if (g.cluster !== floodId && g.mean[2] < bestV) { bestV = g.mean[2]; vegId = g.cluster; }
});
if (bestV > -0.10) { vegId = -1; }

groups.forEach(function(g) {
  if (g.cluster !== floodId && g.cluster !== vegId && g.mean[3] > bestB) {
    bestB = g.mean[3]; builtId = g.cluster;
  }
});
if (bestB < 0.05) { builtId = -1; }

print('Auto-assigned cluster IDs (-1 = none matched):',
  {flood: floodId, vegetation_loss: vegId, built_up_change: builtId});

var triVis = {min: 1, max: 3, palette: ['0000FF', '00AA00', 'FF0000']};

var mlClassification = ee.Image(0)
  .where(clusters.eq(floodId), 1)
  .where(clusters.eq(vegId), 2)
  .where(clusters.eq(builtId), 3)
  .rename('ML_Classification')
  .toByte()
  .clip(aoi);

Map.addLayer(mlClassification.selfMask(), triVis, 'ML Classification (K-means)', false);

// 0 = both no change, 1 = both change, 2 = ML only, 3 = rule-based only
var mlVsBaseline = ee.Image(0)
  .where(transformation.gt(0).and(mlClassification.gt(0)), 1)
  .where(transformation.eq(0).and(mlClassification.gt(0)), 2)
  .where(transformation.gt(0).and(mlClassification.eq(0)), 3)
  .rename('Baseline_vs_ML')
  .toByte()
  .clip(aoi);

Map.addLayer(mlVsBaseline.selfMask(), {
  min: 1, max: 3, palette: ['00FF00', 'FFFF00', 'FF00FF']
}, 'Baseline vs ML Agreement', false);

function areaKm2Mask(img, label) {
  var a = img.multiply(ee.Image.pixelArea()).reduceRegion({
    reducer: ee.Reducer.sum(), geometry: aoi, scale: EXPORT_SCALE,
    maxPixels: 1e13, tileScale: CLUSTER_TILE_SCALE
  });
  var km2 = ee.Number(a.values().get(0)).divide(1e6);
  print(label + ' (km²):', km2);
  return km2;
}

print('\n📈 DAMAGE / CHANGE EXTENT COMPARISON');
print('────────────────────────────');
var baselineKm2 = areaKm2Mask(transformation.gt(0), 'Rule-based change area');
var mlKm2 = areaKm2Mask(mlClassification.gt(0), 'ML (K-means) change area');
var overlapKm2 = areaKm2Mask(
  transformation.gt(0).and(mlClassification.gt(0)), 'Overlap (both flag change)'
);

var mlAgreementPct = overlapKm2
  .divide(ee.Number(baselineKm2).max(mlKm2).max(1))
  .multiply(100);

// ═══════════════════════════════════════════════════════════════════════════
// 13. HOTSPOTS (from transformation)
// ═══════════════════════════════════════════════════════════════════════════

var HOTSPOT_RADIUS_PX = 5;
var hotspot = transformation.gt(0).convolve(
  ee.Kernel.square({radius: HOTSPOT_RADIUS_PX, units: 'pixels'})
).rename('hotspot');

Map.addLayer(hotspot.updateMask(transformation.gt(0)), {
  min: 1, max: 8, palette: ['yellow', 'orange', 'red']
}, 'Change Hotspots', false);

// ═══════════════════════════════════════════════════════════════════════════
// 14. EXPORT METADATA
// ═══════════════════════════════════════════════════════════════════════════

var CLASS_NAMES = {
  0: 'No Change',
  1: 'Newly Inundated',
  2: 'Vegetation Loss',
  3: 'Built-up Alteration'
};
var CLASS_COLORS = {
  '0': '#CCCCCC',
  '1': '#0000FF',
  '2': '#00AA00',
  '3': '#FF0000'
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

var areaFeature = areaStatsGrouped(transformation, aoi, EXPORT_SCALE);
var studyCentroid = aoi.centroid(1);
var mapCenter = ee.Feature(null, {
  lat: studyCentroid.coordinates().get(1),
  lng: studyCentroid.coordinates().get(0),
  zoom: 11
});

// ═══════════════════════════════════════════════════════════════════════════
// 15. DASHBOARD EXPORTS (Tasks 01–10)
// ═══════════════════════════════════════════════════════════════════════════

// 01 — validation-style samples (rule-based class + ML class for optional LIME)
Export.table.toDrive({
  collection: transformation.updateMask(transformation.gt(0))
    .addBands(mlClassification.rename('ml_class'))
    .addBands(mlFeatureImage)
    .stratifiedSample({
      numPoints: 200, classBand: 'TerraTrace_Transformation',
      region: aoi, scale: EXPORT_SCALE, seed: 42, geometries: true
    })
    .map(function(f) {
      var coords = f.geometry().coordinates();
      return f.set({
        longitude: coords.get(0),
        latitude: coords.get(1),
        class: f.get('TerraTrace_Transformation'),
        predicted_class: f.get('ml_class')
      });
    }),
  description: '01_dashboard_validation_samples',
  fileFormat: 'CSV'
});

// 02 — K-means training samples
Export.table.toDrive({
  collection: kmTrain,
  description: '02_dashboard_training_samples',
  fileFormat: 'CSV'
});

// 03 — delta-band mean magnitude as importance proxy (server-side, no getInfo)
var bandMeans = mlFeatureImage.abs().reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: aoi,
  scale: PROFILE_SCALE,
  maxPixels: 1e13,
  tileScale: CLUSTER_TILE_SCALE
});
var bandMeanDict = ee.Dictionary(bandMeans);
var bandTotal = bandMeanDict.values().reduce(ee.Reducer.sum());
Export.table.toDrive({
  collection: ee.FeatureCollection(clusterBands.map(function(band) {
    return ee.Feature(null, {
      feature: band,
      importance_pct: ee.Number(bandMeanDict.get(band)).divide(bandTotal).multiply(100)
    });
  })),
  description: '03_dashboard_feature_importance',
  fileFormat: 'JSON'
});

// 04 — area stats from transformation (classes 0–3)
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

// 05 — model metrics (K-means agreement)
Export.table.toDrive({
  collection: ee.FeatureCollection([ee.Feature(null, {
    study_area_m2: aoi.area(1),
    study_area_km2: studyAreaKm2,
    ml_method: 'Unsupervised K-means (delta indices only)',
    k_clusters: K,
    baseline_km2: baselineKm2,
    ml_km2: mlKm2,
    overlap_km2: overlapKm2,
    ml_agreement_pct: mlAgreementPct,
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

// 06 — hotspots from transformation
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
        severity: ee.Algorithms.If(hs.gte(6), 'high', ee.Algorithms.If(hs.gte(3), 'medium', 'low'))
      });
    }),
  description: '06_dashboard_hotspots',
  fileFormat: 'JSON'
});

// 07 — map center
Export.table.toDrive({
  collection: ee.FeatureCollection([mapCenter]),
  description: '07_dashboard_map_center',
  fileFormat: 'JSON'
});

// 08 — ML classification GeoTIFF
Export.image.toDrive({
  image: mlClassification.addBands(hotspot).rename(['change_class', 'hotspot']),
  description: '08_terratrace_ml_geotiff',
  folder: 'TerraTrace_Dashboard',
  region: aoi,
  scale: EXPORT_SCALE,
  maxPixels: 1e13
});

// 09 — KPIs
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

// 10 — map layer tile URL placeholders (MapLayerId keys for Next.js)
Export.table.toDrive({
  collection: ee.FeatureCollection([ee.Feature(null, {
    base_pre: '',
    base_flood: '',
    mndwi_pre: '',
    mndwi_flood: '',
    delta_mndwi: '',
    ndwi_pre: '',
    ndwi_flood: '',
    delta_ndwi: '',
    binary_flood: '',
    lulc_pre: '',
    lulc_flood: '',
    lulc_change: '',
    transformation: '',
    flood_risk: '',
    flood_damage: '',
    bare_soil: '',
    ml_classification: '',
    ml_agreement: '',
    hotspots: ''
  })]),
  description: '10_dashboard_map_layers',
  fileFormat: 'JSON'
});

// ═══════════════════════════════════════════════════════════════════════════
// 16. SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

print('\n');
print('╔════════════════════════════════════════════════════════╗');
print('║     TERRATRACE — COMPLETE ANALYSIS SUMMARY            ║');
print('╚════════════════════════════════════════════════════════╝');

print('\n📅 TEMPORAL COVERAGE');
print('PRE date:', preDate);
print('FLOOD date:', floodDate);

print('\n💧 WATER INUNDATION');
print('Inundated Water (km²):', floodKm2);
print('Newly Inundated (km²):', newlyInundatedKm2);

print('\n🌍 LULC TRANSITIONS TO WATER');
print('Agriculture → Water (km²):', agriWaterKm2);
print('Vegetation → Water (km²):', vegWaterKm2);
print('Built-up → Water (km²):', builtWaterKm2);

print('\n🌱 VEGETATION & BUILT-UP');
print('Vegetation Loss (km²):', vegLossKm2);
print('Built-up Alteration (km²):', builtAltKm2);
print('Total LULC Change (km²):', lulcChangeKm2);

print('\n🤖 ML (K-MEANS)');
print('Method: unsupervised K-means, k =', K);
print('Features:', clusterBands.join(', '));
print('Training scale:', CLUSTER_TRAIN_SCALE, '| max pixels:', CLUSTER_MAX_PIXELS);
print('Profile scale:', PROFILE_SCALE, '| export scale:', EXPORT_SCALE);
print('ML agreement with rule-based (%):', mlAgreementPct);

print('\n✓ 10 export tasks queued → Tasks tab → RUN each (01–10)');
print('→ Download Drive exports to data/raw/');
print('→ node scripts/merge_gee_exports.mjs');
print('→ python scripts/run_lime_xai.py  (optional)');
print('→ cd dashboard && npm run dev');
print('→ Fill 10_dashboard_map_layers tile URLs after publishing EE assets');
