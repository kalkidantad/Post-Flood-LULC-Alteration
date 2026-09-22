import type { DashboardConfig } from "@/lib/types";

export default function DataSourceBadge({ config }: { config: DashboardConfig }) {
  const isReal = config.dataSource === "real";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        isReal
          ? "border border-green-500/40 bg-green-500/10 text-green-400"
          : "border border-yellow-500/40 bg-yellow-500/10 text-yellow-400"
      }`}
    >
      {isReal ? "Live GEE data" : "Sample data — run pipeline to replace"}
    </span>
  );
}
