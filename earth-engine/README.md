# TerraTrace Earth Engine Scripts

## Primary script (use this)

**`terratrace_ml_export.js`** — single paste-ready file combining:

- Hackathon_Final analysis (LULC, transitions, bare soil, flood risk)
- All critical ML fixes (see below)
- 9 dashboard export tasks

### How to run

1. Open [Earth Engine Code Editor](https://code.earthengine.google.com/)
2. Paste entire `terratrace_ml_export.js` → **Run**
3. **Tasks** tab → run exports `01` through `09`
4. Share Drive folder → download to `data/raw/`
5. `node scripts/merge_gee_exports.mjs`
6. `python scripts/run_lime_xai.py`
7. `cd dashboard && npm run dev`

## Critical fixes applied

| Issue | Fix |
|-------|-----|
| Circular ML logic | Labels from independent transition layers; spatial block hold-out validation |
| Class imbalance | 600 stratified samples per class (5 classes) |
| Feature redundancy | Delta-only features (5 bands), normalized [0,1] |
| Rigid LULC thresholds | AOI percentile-based adaptive thresholds |
| Permanent water | JRC ≥50% included in LULC water; excluded from new inundation |
| Small sample size | 3,000 total training points (600×5) |
| Data quality | Cloud counts, valid pixel fraction, threshold prints |
| Inflated validation | Spatial hold-out (block 0 train / block 1 validate) |
| RF hyperparameters | 500 trees, varsPerSplit=2 |
| Hotspot kernel | 5px square convolution |
| Area units | Consistent `EXPORT_SCALE = 30` everywhere |

## Legacy / alternate files

- **`ML_fixed.js`** — ML + exports only; paste after team `Hackathon_Final` if you prefer two-part workflow
- **`Hackathon_Final_patches.js`** — 3 line patches for team baseline before appending `ML_fixed.js`
