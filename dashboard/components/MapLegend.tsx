"use client";

import {
  FLOOD_RISK_PALETTE,
  LULC_LEGEND,
  ML_AGREEMENT_PALETTE,
  TRANSFORMATION_LEGEND,
} from "@/lib/layerPalette";
import type { MapLayerDef } from "@/lib/mapLayers";

interface MapLegendProps {
  legendType: MapLayerDef["legend"];
}

export default function MapLegend({ legendType }: MapLegendProps) {
  let title = "Legend";
  let items: { label: string; color: string; emoji?: string }[] = TRANSFORMATION_LEGEND;

  if (legendType === "lulc") {
    title = "LULC classes";
    items = LULC_LEGEND;
  } else if (legendType === "flood_risk") {
    title = "Flood risk";
    items = FLOOD_RISK_PALETTE.map((r) => ({
      label: r.label,
      color: r.color,
    }));
  } else if (legendType === "ml_agreement") {
    title = "Rule-based vs ML";
    items = ML_AGREEMENT_PALETTE.map((r) => ({
      label: r.label,
      color: r.color,
    }));
  } else {
    title = "TerraTrace transformation";
    items = TRANSFORMATION_LEGEND;
  }

  return (
    <div className="absolute bottom-4 right-4 z-[1000] max-w-[200px] rounded-lg bg-black/95 px-3 py-2 backdrop-blur ring-1 ring-white/10">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-white">
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-xs text-white">
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            {item.emoji ? `${item.emoji} ` : ""}
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
