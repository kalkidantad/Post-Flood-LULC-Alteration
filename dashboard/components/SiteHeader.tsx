"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { DashboardConfig } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/area-statistics", label: "Area statistics" },
  { href: "/xai", label: "Explainable AI" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

interface SiteHeaderProps {
  config: DashboardConfig;
}

export default function SiteHeader({ config }: SiteHeaderProps) {
  const pathname = usePathname();
  const brand = config.brand ?? "TerraTrace";

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7656/ingest/fa884f89-22ac-4292-bdf2-1e77989dda3a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c4750a" },
      body: JSON.stringify({
        sessionId: "c4750a",
        runId: "header-hero-fix",
        hypothesisId: "A",
        location: "SiteHeader.tsx:mount",
        message: "SiteHeader mounted",
        data: { pathname, brand },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [pathname, brand]);

  return (
    <header className="sticky top-0 z-50 bg-black/90 px-6 py-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-end gap-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-wide text-white transition hover:text-accent"
        >
          {brand}
        </Link>
        <nav>
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
