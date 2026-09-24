import DashboardClient from "@/components/DashboardClient";
import { loadDashboardData } from "@/lib/loadData";

export default async function HomePage() {
  // #region agent log
  fetch("http://127.0.0.1:7656/ingest/fa884f89-22ac-4292-bdf2-1e77989dda3a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c4750a" },
    body: JSON.stringify({
      sessionId: "c4750a",
      runId: "pre-fix",
      hypothesisId: "A",
      location: "app/page.tsx:HomePage",
      message: "SSR HomePage render start",
      data: { nodeEnv: process.env.NODE_ENV },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  const { config, stats, lime, pixelSamples } = await loadDashboardData();

  return (
    <DashboardClient
      config={config}
      stats={stats}
      lime={lime}
      pixelSamples={pixelSamples}
    />
  );
}
