import type { Metadata } from "next";
import XAIPageClient from "@/components/XAIPageClient";
import { loadDashboardData } from "@/lib/loadData";

export const metadata: Metadata = {
  title: "Explainable AI | TerraTrace",
  description: "LIME and rule-based explainable AI for post-flood LULC change detection",
};

export default async function XAIPage() {
  const { config, stats, lime, featureImportance } = await loadDashboardData();

  return (
    <XAIPageClient
      config={config}
      stats={stats}
      lime={lime}
      featureImportance={featureImportance}
    />
  );
}
