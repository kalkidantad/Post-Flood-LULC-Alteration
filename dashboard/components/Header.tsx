import type { DashboardConfig } from "@/lib/types";
import DataSourceBadge from "./DataSourceBadge";

interface HeaderProps {
  config: DashboardConfig;
}

export default function Header({ config }: HeaderProps) {
  const brand = config.brand ?? "TerraTrace";

  return (
    <header className="border-b border-surface-border bg-black px-6 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 px-3 py-2">
            <span className="text-lg font-bold tracking-wider text-white">
              {brand}
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-accent">
              EO Analytics
            </span>
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              {config.title}
            </h1>
            <p className="text-sm text-white">{config.subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <DataSourceBadge config={config} />
          {config.dataSources.map((src) => (
            <span
              key={src}
              className="rounded-full bg-black px-3 py-1 text-white ring-1 ring-white/10"
            >
              {src}
            </span>
          ))}
          <span className="rounded-full bg-accent/10 px-3 py-1 text-white">
            {config.mlModel}
          </span>
        </div>
      </div>
    </header>
  );
}
