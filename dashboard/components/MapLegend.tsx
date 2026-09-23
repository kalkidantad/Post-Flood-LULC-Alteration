const LEGEND = [
  { label: "Water", color: "#0984e3", emoji: "🔵" },
  { label: "Vegetation", color: "#00b894", emoji: "🟢" },
  { label: "Soil / Bare", color: "#8B4513", emoji: "🟤" },
  { label: "Built-up", color: "#e17055", emoji: "🏢" },
];

export default function MapLegend() {
  return (
    <div className="absolute bottom-4 right-4 z-[1000] rounded-lg border border-surface-border bg-surface-card/95 px-3 py-2 backdrop-blur">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-gray-400">
        Legend
      </p>
      <ul className="space-y-1">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-xs text-gray-200">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            {item.emoji} {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
