import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vent — Geothermal Intelligence Engine",
  description: "Physics-based Structural Integrity Score and Resilience Certification for geothermal developers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-vent-bg text-vent-text">{children}</body>
    </html>
  );
}
