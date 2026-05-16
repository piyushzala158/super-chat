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
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-cyan shadow-[0_0_24px_rgba(111,243,255,0.95)]" />
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan">
                Super Chat
              </div>
              <div className="text-xs text-mist/60">AI Performance Benchmark Lab</div>
            </div>
          </Link>
          <nav className="flex gap-2 rounded-full border border-white/10 bg-white/5 p-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "rounded-full px-4 py-2 text-sm transition",
                  pathname === link.href
                    ? "bg-white text-ink"
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
