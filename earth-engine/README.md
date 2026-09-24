# TerraTrace Earth Engine Scripts

## Primary script

**`terratrace_ml_export.js`** — synced with team **ML.js** on Google Git (Hackathon repo), plus:

- K-means speed tuning (`CLUSTER_TRAIN_SCALE=60`, `2500` pixels, `tileScale=2`)
- Dashboard exports Tasks **01–10** (Next.js app — no `ui.*` EE App block)
- GEE-correct palettes: LULC `#0000FF/#008000/#FF0000/#FFD700`, transformation `#0000FF/#00AA00/#FF0000`

### Run in GEE

1. Paste `terratrace_ml_export.js` → **Run**
2. Tasks tab → run **01–10**
3. Share Drive exports → `data/raw/`
4. `node scripts/merge_gee_exports.mjs`
5. Optional: `python scripts/run_lime_xai.py`
6. `cd dashboard && npm run dev`

### Live map layers in Next.js

After running the script, publish key layers in GEE and paste tile URLs into `dashboard/.env.local`:

```bash
NEXT_PUBLIC_EE_TILE_TRANSFORMATION=https://earthengine.googleapis.com/...
NEXT_PUBLIC_EE_TILE_BINARY_FLOOD=...
```

Or fill values from export **10_dashboard_map_layers** after publishing assets.

## Files

| File | Purpose |
|------|---------|
| `terratrace_ml_export.js` | Full analysis + K-means + exports (use this) |
| `ML_fixed.js` | Legacy RF hold-out module (superseded by K-means) |
| `Hackathon_Final_patches.js` | Patches for old two-file workflow |
