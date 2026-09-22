import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Post-Flood LULC Dashboard | Nepal EO Hackathon",
  description:
    "Machine learning change detection and explainable AI dashboard for Nepal August 2026 flood event",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
