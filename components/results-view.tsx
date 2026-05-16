"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardPanel } from "@/components/dashboard-panel";
import { SectionCard } from "@/components/section-card";
import { serializeReport } from "@/lib/metrics";
import type { BenchmarkReport } from "@/lib/types";

export function ResultsView({ id }: { id: string }) {
  const [report, setReport] = useState<BenchmarkReport | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(`benchmark-report:${id}`);
    if (raw) {
      setReport(JSON.parse(raw) as BenchmarkReport);
    }
  }, [id]);

  const summary = useMemo(() => {
    if (!report) return null;
    return [
      `Provider: ${report.session.provider}`,
      `Model: ${report.session.model}`,
      `Mode: ${report.session.mode}`,
      `Prompt preset: ${report.session.preset}`,
      `Output characters: ${report.derived.charactersReceived}`,
      `Estimated tok/s: ${report.derived.estimatedTokensPerSecond?.toFixed(1) ?? "n/a"}`
    ];
  }, [report]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 md:px-10">
      <SectionCard title="Benchmark Report" eyebrow="Results">
        {summary ? (
          <div className="space-y-2 text-sm leading-7 text-mist/80">
            {summary.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-mist/70">No local report was found for this session.</div>
        )}
      </SectionCard>

      <DashboardPanel report={report} status={report ? "done" : "idle"} />

      {report ? (
        <SectionCard title="Export JSON" eyebrow="Shareable Data">
          <div className="space-y-4">
            <p className="text-sm leading-7 text-mist/72">
              This JSON contains the derived metrics, backend timings, frontend samples, and
              environment metadata captured during the run.
            </p>
            <textarea
              className="min-h-80 w-full rounded-3xl border border-white/10 bg-black/30 p-4 font-[family-name:var(--font-mono)] text-xs leading-6 text-cyan"
              readOnly
              value={serializeReport(report)}
            />
          </div>
        </SectionCard>
      ) : null}
    </main>
  );
}
