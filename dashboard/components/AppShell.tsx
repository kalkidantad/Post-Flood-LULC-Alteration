import type { DashboardConfig } from "@/lib/types";
import SiteHeader from "./SiteHeader";

interface AppShellProps {
  config: DashboardConfig;
  children: React.ReactNode;
}

export default function AppShell({ config, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-black">
      <SiteHeader config={config} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
        {children}
      </main>
      <footer className="border-t border-surface-border px-6 py-3 text-center text-xs text-white">
        <span className="font-semibold tracking-wide">TerraTrace</span>
        {" · "}SPARK 4.0 Nepal EO Hackathon · Landsat 9 · K-means ML + rule-based XAI
      </footer>
    </div>
  );
}
