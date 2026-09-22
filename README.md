# Post-Flood LULC Alteration — ML + WebGIS Dashboard

SPARK 4.0 Nepal EO Hackathon project for the **August 2026 Bhoti Koshi / Trishuli flash-flood** event.

## Workflow

```
Multi-source EO → Preprocessing → Pre-event baseline → Change detection (ML)
  → Temporal persistence → LULC classification → Statistics & XAI → WebGIS dashboard
```

## Project structure

```
earth-engine/
  post_flood_lulc_ml.js      # Main GEE script: RF classifier
  export_dashboard_data.js   # 8 exports for dashboard + LIME

scripts/
  merge_gee_exports.mjs      # GEE JSON → dashboard/public/data/
  run_lime_xai.py            # LIME XAI on exported CSV samples
  requirements.txt

data/raw/                    # Drop GEE Drive downloads here

dashboard/
  app/                       # Next.js App Router
  components/                # Map, stats, LIME charts
  public/data/               # Final JSON consumed by dashboard
```

**→ Full step-by-step guide: [DATA_PIPELINE.md](./DATA_PIPELINE.md)**

## Earth Engine setup

1. Open your script: https://code.earthengine.google.com/66b080127077601025a662aa0b92e4ce
2. Append **`earth-engine/export_dashboard_data.js`** and run.
3. Complete all 8 export tasks in the **Tasks** tab.
4. Download exports to **`data/raw/`**
5. Run **`node scripts/merge_gee_exports.mjs`**
6. Run **`python scripts/run_lime_xai.py`**

### Assets used

| Asset | Path |
|-------|------|
| River | `projects/spatiocoretech-01-506820/assets/Bhoti_koshi_Trishulii_River` |
| Flood districts | `projects/spatiocoretech-01-506820/assets/Flood_Districts` |
| ML output (exported) | `projects/spatiocoretech-01-506820/assets/Flood_LULC_Change_ML` |

### ML + Explainable AI (LIME)

- **Model:** `ee.Classifier.smileRandomForest` (300 trees) in GEE
- **LIME:** Python `lime.lime_tabular.LimeTabularExplainer` on exported train/validation CSV
- **Global XAI:** Mean |LIME weight| per feature across explained pixels
- **Local XAI:** Per-pixel explanation — why this location was classified as Erosion, Water, etc.
- **Reference:** Gini importance also exported from GEE (`classifier.explain()`)

## Dashboard setup

```bash
cd dashboard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Dashboard features

- Interactive map with change-class layers and hotspot markers
- Temporal period selector (pre / immediate post / persistence)
- Area statistics and model confidence metrics
- LIME global + local explanation charts
- Green "Live GEE data" badge when pipeline is complete

## Data sources

- **Sentinel-2 SR Harmonized** — optical indices, 10–20 m
- **Landsat 9 Collection 2 Level-2** — SWIR/NBR, 30 m
- Study area: flood districts buffered ∩ river corridor

## Notes

- Sample JSON in `dashboard/public/data/` works for local demo (yellow badge).
- Follow **[DATA_PIPELINE.md](./DATA_PIPELINE.md)** to switch to real GEE outputs (green badge).
- Optional EE tile overlay: set `NEXT_PUBLIC_EE_TILE_URL` in `dashboard/.env.local`.
