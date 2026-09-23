import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TerraTrace | Post-Flood LULC Dashboard",
  description:
    "TerraTrace — machine learning change detection and LIME explainable AI for Nepal August 2026 flood event",
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
