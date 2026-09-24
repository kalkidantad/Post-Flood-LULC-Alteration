import DataSourceBadge from "./DataSourceBadge";
import type { DashboardConfig } from "@/lib/types";

interface HeroBannerProps {
  config: DashboardConfig;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export default function HeroBanner({
  config,
  title,
  subtitle,
  compact = false,
}: HeroBannerProps) {
  const heading = title ?? config.title;
  const desc = subtitle ?? config.subtitle;

  return (
    <section
      className={`hero-banner relative overflow-hidden text-center ${
        compact ? "rounded-2xl px-6 py-10" : "rounded-3xl px-8 py-16 md:py-20"
      }`}
    >
      <div className="hero-glow hero-glow-left" aria-hidden />
      <div className="hero-glow hero-glow-right" aria-hidden />

      <div className="relative z-10 mx-auto max-w-3xl">
        <h1
          className={`font-bold tracking-tight text-white ${
            compact ? "text-2xl md:text-3xl" : "text-3xl md:text-5xl lg:text-6xl"
          }`}
        >
          {heading}
        </h1>
        <p
          className={`mx-auto mt-4 max-w-2xl text-white/80 ${
            compact ? "text-sm md:text-base" : "text-base md:text-lg"
          }`}
        >
          {desc}
        </p>

        {!compact && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <DataSourceBadge config={config} />
            {config.dataSources.map((src) => (
              <span
                key={src}
                className="rounded-full bg-white/10 px-3 py-1 text-xs text-white"
              >
                {src}
              </span>
            ))}
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white">
              {config.mlModel}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
