import type { Metadata } from "next";
import AreaStatisticsPageClient from "@/components/AreaStatisticsPageClient";
import { loadDashboardData } from "@/lib/loadData";

export const metadata: Metadata = {
  title: "Area Statistics | TerraTrace",
  description: "KPI cards, LULC transitions, and area charts for the Nepal flood study corridor",
};

export default async function AreaStatisticsPage() {
  const { config, stats, lime } = await loadDashboardData();

  return <AreaStatisticsPageClient config={config} stats={stats} lime={lime} />;
}
