import type { DashboardConfig } from "@/lib/types";
import DataSourceBadge from "./DataSourceBadge";

interface HeaderProps {
  config: DashboardConfig;
}

export default function Header({ config }: HeaderProps) {
  return (
    <header className="border-b border-surface-border bg-surface-card px-6 py-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white">
            {config.title}
          </h1>
          <p className="text-sm text-gray-400">{config.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <DataSourceBadge config={config} />
          {config.dataSources.map((src) => (
            <span
              key={src}
              className="rounded-full border border-surface-border bg-surface px-3 py-1 text-gray-300"
            >
              {src}
            </span>
          ))}
          <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-accent">
            {config.mlModel}
          </span>
        </div>
      </div>
    </header>
  );
}
