"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: "🗺️" },
  { href: "/area-statistics", label: "Area statistics", icon: "📊" },
  { href: "/xai", label: "Explainable AI", icon: "🧠" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-t border-surface-border bg-black px-6">
      <ul className="flex gap-1 overflow-x-auto py-2">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-accent/15 text-white"
                    : "text-white hover:bg-white/10"
                }`}
              >
                <span aria-hidden>{icon}</span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
