import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { WebVitals } from "@/components/web-vitals";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display"
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "Super Chat Benchmark",
  description:
    "A frontend-first AI chat performance benchmark app for measuring streaming latency, FPS, memory, and rendering throughput."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body className="font-[family-name:var(--font-display)]">
        <WebVitals />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
