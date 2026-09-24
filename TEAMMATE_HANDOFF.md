# TerraTrace — Teammate Handoff (What’s Done vs What’s Left)

**Branch:** `gee-real-data` → merge to `main` via PR  
**Study area:** Bhote Koshi / Trishuli corridor, Nepal  
**Event:** 26 August 2026  
**Repo:** [Post-Flood-LULC-Alteration](https://github.com/kalkidantad/Post-Flood-LULC-Alteration)

---

## ✅ Already completed (in this PR)

| Area | Status |
|------|--------|
| GEE analysis pipeline | Full Hackathon_Final logic + K-means ML in `earth-engine/terratrace_ml_export.js` |
| ML speed | K-means training at 60 m scale, 2500 pixels, tileScale 2 |
| Dashboard UI spec | KPI cards, LULC transformation table, XAI / insight panel |
| Map layer toggles | 18 layers aligned with team GEE App (structure in `dashboard/lib/mapLayers.ts`) |
| Colors & legend | Match team palettes (`#0000FF`, `#00AA00`, `#FF0000`, LULC gold/green) |
| Export tasks | GEE Tasks **01–10** (KPIs, hotspots, map center, layer manifest template) |
| Merge script | `scripts/merge_gee_exports.mjs` reads exports → `dashboard/public/data/` |
| Sample data | Dashboard runs locally with demo overlay (`npm run dev`) |

---

## 🔴 Critical — teammates with GEE access must do

### 1. Run GEE script and complete exports

**Who:** Teammate with **Earth Engine Editor** access to `projects/spatiocoretech-01-506820`

1. Open [Earth Engine Code Editor](https://code.earthengine.google.com/)
2. Paste entire **`earth-engine/terratrace_ml_export.js`** → **Run**
3. **Tasks** tab → run all exports **01–10** to Google Drive
4. Share the Drive folder with `kalitad0825@gmail.com` (or download locally)

**Expected outputs in Drive:**

| Task | File prefix | Purpose |
|------|-------------|---------|
| 01 | `01_dashboard_validation_samples` | Optional LIME CSV |
| 02 | `02_dashboard_training_samples` | K-means training samples |
| 03 | `03_dashboard_feature_importance` | Delta-band importance |
| 04 | `04_dashboard_change_area_stats` | Class areas for dashboard |
| 05 | `05_dashboard_model_metrics` | KPIs + ML agreement % |
| 06 | `06_dashboard_hotspots` | Map hotspot points |
| 07 | `07_dashboard_map_center` | Map center/zoom |
| 08 | `08_terratrace_ml_geotiff` | ML raster (optional) |
| 09 | `09_dashboard_kpis` | TerraTrace KPI cards |
| 10 | `10_dashboard_map_layers` | Tile URL placeholders |

### 2. Publish GEE map layers and wire tile URLs

**Who:** Same GEE teammate

The Next.js map layer toggles work, but **live rasters need tile URLs**:

1. In GEE, for each key layer publish or get `getMapId` / tile URL:
   - `transformation` (priority)
   - `binary_flood`
   - `lulc_pre`, `lulc_flood`
   - `ml_classification`
   - `flood_risk`
2. Fill URLs in export **10** or share with dashboard dev
3. Dashboard dev creates `dashboard/.env.local` from `dashboard/.env.example`:

```bash
NEXT_PUBLIC_EE_TILE_TRANSFORMATION=https://earthengine.googleapis.com/...
NEXT_PUBLIC_EE_TILE_BINARY_FLOOD=...
NEXT_PUBLIC_EE_TILE_LULC_PRE=...
```

4. Re-run merge after updating `10_dashboard_map_layers` JSON in `data/raw/`

---

## 🟡 Important — anyone can do locally

### 3. Merge real data into dashboard

```bash
# Drop GEE Drive downloads into:
data/raw/

node scripts/merge_gee_exports.mjs
```

Verify `dashboard/public/data/change_stats.json` and `config.json` show `"dataSource": "real"`.

### 4. Optional LIME XAI

```bash
pip install -r scripts/requirements.txt
python scripts/run_lime_xai.py
cd dashboard && npm run dev
```

Open http://localhost:3000 — yellow “demo” badge should disappear when real tiles are wired.

### 5. Deploy dashboard (Vercel / GitHub Pages)

**Who:** Frontend teammate

- Deploy `dashboard/` folder (Next.js)
- Set env vars for `NEXT_PUBLIC_EE_TILE_*` in hosting provider
- Confirm map layers toggle correctly on production URL

---

## 🟢 Nice to have / polish

| Task | Owner | Notes |
|------|-------|-------|
| Before/After swipe view | Frontend | GEE App has swipe; Next.js only has layer toggles so far |
| Click-to-inspect pixel XAI | Frontend + GEE | GEE App has `dashMap.onClick` inspector; port to Next.js if time |
| Validate K-means vs rule-based | EO analyst | Compare `ml_agreement_pct` in export 05 with visual check |
| Hackathon slide screenshots | Anyone | Run dashboard + GEE App side by side for judges |
| CI / lint | DevOps | `cd dashboard && npm run build` on PR |

---

## 📁 Key files (don’t duplicate work)

| File | Role |
|------|------|
| `earth-engine/terratrace_ml_export.js` | **Single source of truth** — paste into GEE |
| `earth-engine/ML_fixed.js` | Legacy RF module — **superseded**, ignore unless reverting |
| `scripts/merge_gee_exports.mjs` | GEE exports → dashboard JSON |
| `scripts/run_lime_xai.py` | LIME on exported CSV |
| `dashboard/lib/mapLayers.ts` | Layer IDs must match GEE export 10 |
| `dashboard/lib/layerPalette.ts` | Official colors — change here only |

---

## 🚫 Known blockers

| Blocker | Workaround |
|---------|------------|
| `kalitad0825@gmail.com` cannot access GCP project `spatiocoretech-01-506820` | Teammate with Editor role runs exports and shares Drive |
| GEE git repo “No accessible repositories” | Use local `terratrace_ml_export.js` paste instead of clone |
| No tile URLs → map shows demo markers | Expected until step 2 above is done |

---

## Quick verification checklist

- [ ] GEE script runs without errors in Code Editor
- [ ] All 10 export tasks completed
- [ ] `node scripts/merge_gee_exports.mjs` succeeds
- [ ] Dashboard KPI numbers match GEE console prints
- [ ] At least `TRANSFORMATION` tile URL loads on map
- [ ] Layer toggles show/hide overlays
- [ ] Legend colors match GEE App
- [ ] PR merged to `main`

---

## Contact / handoff

- **GEE + exports:** teammate with `spatiocoretech-01-506820` access  
- **Dashboard + deploy:** Kalkidan (`kalitad0825@gmail.com`)  
- **Questions on ML method:** K-means is unsupervised — validation = rule-based agreement %, not accuracy/kappa
