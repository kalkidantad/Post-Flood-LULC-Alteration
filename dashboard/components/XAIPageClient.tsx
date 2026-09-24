"use client";

import { useMemo } from "react";
import AppShell from "./AppShell";
import ChartSlideshow from "./ChartSlideshow";
import HeroBanner from "./HeroBanner";
import InundationInsightPanel from "./InundationInsightPanel";
import { LimeGlobalChart, LimeLocalChart } from "./LimeChart";
import MlAgreementPanel from "./MlAgreementPanel";
import XAIChart from "./XAIChart";
import { defaultMlComparison } from "@/lib/chartDefaults";
import type {
  ChangeStats,
  DashboardConfig,
  FeatureImportance,
  LimeExplanations,
} from "@/lib/types";

interface XAIPageClientProps {
  config: DashboardConfig;
  stats: ChangeStats;
  lime: LimeExplanations | null;
  featureImportance: FeatureImportance[];
}

export default function XAIPageClient({
  config,
  stats,
  lime,
  featureImportance,
}: XAIPageClientProps) {
  const mlComparison = defaultMlComparison(stats);

  const slides = useMemo(() => {
    const items = [];

    if (featureImportance.length > 0) {
      items.push({
        label: "Delta bands",
        content: (
          <XAIChart
            data={featureImportance}
            method="Delta-band magnitude (K-means cluster profile proxy)"
            hideHeader
          />
        ),
      });
    }

    if (lime) {
      items.push({
        label: "LIME global",
        content: (
          <LimeGlobalChart globalData={lime.global} method={lime.method} hideHeader />
        ),
      });
      items.push({
        label: "LIME local",
        content: <LimeLocalChart localSamples={lime.local} hideHeader />,
      });
    }

    return items;
  }, [featureImportance, lime]);

  return (
    <AppShell config={config}>
      <HeroBanner
        config={config}
        title="Explainable AI"
        subtitle="Rule-based inundation logic, K-means cluster profiles, and LIME feature attributions for the Bhote Koshi flood event."
        compact
      />

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        <InundationInsightPanel lime={lime} inspection={null} />
        <MlAgreementPanel comparison={mlComparison} />
      </div>

      {slides.length > 0 ? (
        <ChartSlideshow slides={slides} />
      ) : (
        <section className="metric-card py-12 text-center text-sm text-white/60">
          No chart data loaded. Run the LIME pipeline to populate explanations.
        </section>
      )}
    </AppShell>
  );
}
