import type { DashboardConfig } from "@/lib/types";

export default function DataSourceBadge({ config }: { config: DashboardConfig }) {
  const isReal = config.dataSource === "real";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium text-white ${
        isReal ? "bg-green-500/10" : "bg-yellow-500/10"
      }`}
    >
      {isReal ? "Live GEE data" : "Sample data — run pipeline to replace"}
    </span>
  );
}
