# ML File ↔ GitHub Sync Status & Missing Data

**For teammates** — use this to align the team **GEE Google Git ML** script with our **GitHub repo** and see what real data is still missing.

| Location | File | Role |
|----------|------|------|
| **Team GEE Git** | `earthengine/users/spatiocoretech/Hackathon/.../ML` | Latest team script (K-means + EE App UI) |
| **GitHub (canonical for dashboard)** | `earth-engine/terratrace_ml_export.js` | Same analysis + K-means + **Drive exports 01–10** for Next.js |
| **Do NOT use** | `ML_fixed.js`, `post_flood_lulc_ml.js`, `export_dashboard_data.js` | Old RF / Sentinel experiments — superseded |

**GitHub main branch:** already merged from PR #2 — `terratrace_ml_export.js` is the file to run.

---

## 1. Code match: Team ML.js vs GitHub `terratrace_ml_export.js`

### ✅ Matched (same logic / outputs)

| Feature | Team ML.js | GitHub `terratrace_ml_export.js` |
|---------|------------|----------------------------------|
| AOI | River buffer **1000 m** | ✅ Same |
| Imagery | Landsat-9 pre + flood | ✅ Same (+ **fallback date window** if 26 Aug empty) |
| Indices | MNDWI, NDWI, NDVI, NDBI, BSI + deltas | ✅ Same |
| JRC permanent water | occurrence ≥ 50%, `unmask(0)` for K-means mask | ✅ Same |
| Binary flood | MNDWI/NDWI thresholds + exclude permanent water | ✅ Same |
| LULC classes 1–4 | Water / Veg / Built-up / Agriculture | ✅ Same palette `0000FF, 008000, FF0000, FFD700` |
| Transitions | agri/veg/built → water, bare soil, vegetation loss | ✅ Same (used in KPIs + exports) |
| TerraTrace transformation | Classes 1–3 blue/green/red | ✅ Same `0000FF, 00AA00, FF0000` |
| Flood risk / damage / impact | Risk classes 1–4 | ✅ Same |
| **ML method** | **K-means** k=5 on 5 delta bands | ✅ Same |
| Cluster naming | Auto from profile (MNDWI↑ flood, NDVI↓ veg, NDBI↑ built) | ✅ Same thresholds |
| ML vs rule-based | `mlVsBaseline` agreement layer | ✅ Same |
| KPI area prints | newly inundated, ag/veg/built→water, LULC change, bare soil | ✅ Same |

### ⚡ Intentionally different (improvements on GitHub)

| Item | Team ML.js | GitHub version | Why |
|------|------------|----------------|-----|
| K-means training scale | 30 m | **60 m** | Speed |
| Training pixels | 5000 | **2500** | Speed |
| tileScale | 4 | **2** | Speed |
| Flood date window | 26–27 Aug only | **20 Aug – 5 Sep** + fallback | Avoids empty mosaic / null date error |
| Dashboard | **EE App** (`ui.*` panels, swipe, click inspector) | **Next.js** dashboard | Split: GEE = analysis + exports; web = UI |
| Drive exports | None | **Tasks 01–10** | Feeds `merge_gee_exports.mjs` |

### ⚠️ In team ML.js but NOT in GitHub file (optional / UI-only)

These exist in team GEE App but were **not copied** to GitHub because Next.js replaces the EE App UI:

| Missing from GitHub script | Impact | Action |
|----------------------------|--------|--------|
| `ui.*` dashboard (KPI cards, charts, layer checkboxes in GEE) | None for Next.js | Use `npm run dev` dashboard instead |
| Before/after **swipe** maps | EE App only | Optional future Next.js feature |
| **Click pixel inspector** (`dashMap.onClick`) | EE App only | Rule-based XAI panel in Next.js (static rules + LIME) |
| Separate `Map.addLayer` for every transition (agri→water, veg→built, etc.) | GEE map only | Core layers exported; extra viz optional |
| 16-class transition matrix (`lulcTransition16`) | Console/debug | Not required for dashboard KPIs |
| Cross-tab histogram print | Console/debug | Agreement % exported in **05** instead |
| Per-risk-class km² prints (low/moderate/high/very high) | Console only | Can add to export **09** if judges need it |

**Conclusion:** Analysis + ML + KPI **numbers** match. GitHub adds exports + speed tuning; team ML adds EE App UI. **No need to paste team ML into GitHub wholesale** — paste **`terratrace_ml_export.js`** into GEE instead.

---

## 2. Missing DATA (nothing exported yet)

`data/raw/` is **empty** (only `.gitkeep`). Dashboard runs on **sample JSON** (`"dataSource": "sample"`).

### Required GEE Drive exports (teammate must run Tasks)

| # | Export name | Required? | Feeds dashboard |
|---|-------------|-----------|-----------------|
| 01 | `01_dashboard_validation_samples` | Optional | LIME XAI |
| 02 | `02_dashboard_training_samples` | Optional | LIME XAI |
| 03 | `03_dashboard_feature_importance` | Optional | Feature chart |
| **04** | **`04_dashboard_change_area_stats`** | **Required** | Class areas, legend stats |
| **05** | **`05_dashboard_model_metrics`** | **Required** | ML agreement %, dates, summary |
| **06** | **`06_dashboard_hotspots`** | **Required** | Map hotspot markers |
| **07** | **`07_dashboard_map_center`** | **Required** | Map center/zoom |
| 08 | `08_terratrace_ml_geotiff` | Optional | Offline raster |
| **09** | **`09_dashboard_kpis`** | **Required** | KPI cards (6 metrics) |
| **10** | **`10_dashboard_map_layers`** | **Required** (URLs filled manually) | Live map tile layers |

### After download → local pipeline

```bash
# 1. Put all Drive JSON/CSV files in:
data/raw/

# 2. Merge into dashboard:
node scripts/merge_gee_exports.mjs

# 3. Optional LIME:
python scripts/run_lime_xai.py
```

Expected result: `config.json` → `"dataSource": "real"` and real km² in KPI cards.

### Missing map tile URLs (live layers)

`config.json` → `"mapTileLayers": {}`  
`dashboard/.env.local` → **not created**

Until GEE tile URLs are published and set:

| Env variable | Layer |
|--------------|-------|
| `NEXT_PUBLIC_EE_TILE_TRANSFORMATION` | TerraTrace transformation |
| `NEXT_PUBLIC_EE_TILE_BINARY_FLOOD` | Binary flood |
| `NEXT_PUBLIC_EE_TILE_LULC_PRE` / `_FLOOD` | LULC maps |
| `NEXT_PUBLIC_EE_TILE_ML_CLASS` | K-means classification |
| `NEXT_PUBLIC_EE_TILE_FLOOD_RISK` | Flood risk |

See `dashboard/.env.example`.

---

## 3. Who does what

| Task | Who | Status |
|------|-----|--------|
| Confirm GitHub `terratrace_ml_export.js` = source of truth | All | ✅ On `main` |
| Run script in GEE + complete Tasks 01–10 | GEE access teammate | ❌ **Not done** |
| Share Drive exports → `data/raw/` | GEE teammate | ❌ **Not done** |
| Run `merge_gee_exports.mjs` | Anyone | ❌ Blocked on exports |
| Publish EE tile URLs → `.env.local` | GEE + frontend | ❌ **Not done** |
| Stop using old `ML_fixed.js` / RF workflow | All | ⚠️ Clarify with team |

---

## 4. Quick sync check for GEE teammate

Paste this at the top of GEE Code Editor after loading **`terratrace_ml_export.js`** from GitHub:

1. Run script — console should print:
   - `Study Area (km²)`
   - `K-means training samples (must be > 0)`
   - `Auto-assigned cluster IDs`
   - `ML agreement with rule-based (%)`
2. Tasks tab — **10** export tasks listed (`01_dashboard_…` through `10_dashboard_map_layers`)
3. If training samples = 0 → check cloud mask / flood window (fallback dates should help)

---

## 5. One-line summary for the team

> **Code is synced:** GitHub `terratrace_ml_export.js` = team ML analysis + K-means + dashboard exports. **Data is not synced:** zero GEE Drive exports in repo, no tile URLs — dashboard still shows **sample/demo** numbers until someone runs Tasks 01–10 and merges.
