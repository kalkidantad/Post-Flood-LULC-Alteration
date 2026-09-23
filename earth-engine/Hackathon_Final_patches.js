// Apply these 3 patches to Hackathon_Final BEFORE pasting ML_fixed.js
// Search for the original lines and replace.

// PATCH 1 — Add at top of section 4 (after var l9 = ...):
var EXPORT_SCALE = 30;

// PATCH 2 — Replace LULC water rules (section 11):
// OLD: var preWater = mndwiPre.gt(0.15);
// NEW:
var preWater = mndwiPre.gt(0.15).and(nonPermanentWater);
var floodWaterClass = mndwiFlood.gt(0.15).and(nonPermanentWater);

// PATCH 3 — Replace calculateAreaKm2 scale: 30 with scale: EXPORT_SCALE
// And add data quality prints after image counts:
print('=== DATA QUALITY ===');
print('Pre cloud-free images:', preCollection.size());
print('Flood cloud-free images:', floodCollection.size());
