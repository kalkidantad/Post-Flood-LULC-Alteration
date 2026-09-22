import DashboardClient from "@/components/DashboardClient";
import { loadDashboardData } from "@/lib/loadData";

export default async function HomePage() {
  const { config, stats, lime } = await loadDashboardData();

  return <DashboardClient config={config} stats={stats} lime={lime} />;
}
