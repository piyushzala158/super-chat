"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { href: "/", label: "Overview" },
  { href: "/live", label: "Live Benchmark" },
  { href: "/stress", label: "Stress Lab" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07111de0] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,122,102,0.9),rgba(111,243,255,0.85))]">
              <div className="absolute inset-[1px] rounded-2xl bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_50%)]" />
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan">
                Super Chat
              </div>
              <div className="text-xs text-mist/60">Streaming Systems Observatory</div>
            </div>
          </Link>
          <nav className="flex gap-2 rounded-full border border-white/10 bg-white/5 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "rounded-full px-4 py-2 text-sm transition",
                  pathname === link.href
                    ? "bg-[linear-gradient(145deg,#d4ff6a,#6ff3ff)] text-ink"
                    : "text-mist/70 hover:bg-white/10 hover:text-white"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
