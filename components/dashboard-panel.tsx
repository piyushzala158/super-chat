"use client";

import { SectionCard } from "@/components/section-card";
import { MetricCard } from "@/components/metric-card";
import { Sparkline } from "@/components/sparkline";
import {
  buildBottleneckInsights,
  buildMetricInsights,
  summarizeSeries
} from "@/lib/benchmark-insights";
import type { BenchmarkReport } from "@/lib/types";

const WEB_VITAL_TARGETS: Record<string, string> = {
  CLS: "<0.1",
  FCP: "<1.8s",
  INP: "<200ms",
  LCP: "<2.5s",
  TTFB: "<800ms",
  "Next.js-hydration": "Lower is better",
  "Next.js-route-change-to-render": "Lower is better",
  "Next.js-render": "Lower is better"
};

export function DashboardPanel({
  report,
  status,
  onViewReport
}: {
  report: BenchmarkReport | null;
  status: "idle" | "running" | "done" | "error";
  onViewReport?: () => void;
}) {
  const derived = report?.derived;
  const metricInsights = buildMetricInsights(derived);
  const bottlenecks = buildBottleneckInsights({
    derived,
    backendTiming: report?.backendTiming,
    provider: report?.session.provider
  });
  const tokensSeries = report?.tokensPerSecondTimeline.map((item) => item.value) ?? [];
  const chunkSeries = report?.chunkIntervals ?? [];
  const queueSeries = report?.queueDepthTimeline.map((item) => item.value) ?? [];
  const heapSeries =
    report?.frontendSamples
      .map((item) => item.heapMb)
      .filter((value): value is number => value !== null) ?? [];
  const webVitals = Object.values(report?.webVitals ?? {}).sort((left, right) =>
    left.name.localeCompare(right.name)
  );

  return (
    <div className="grid gap-6">
      <SectionCard title="Live Dashboard" eyebrow="Telemetry">
        <div className="grid gap-4 sm:grid-cols-2">
          {metricInsights.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              benchmark={metric.benchmark}
              helper={metric.helper}
              accent={metric.accent}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Trend Lines" eyebrow="Charts">
        <div className="mb-4 rounded-3xl border border-cyan/20 bg-cyan/8 p-4 text-sm leading-7 text-mist/78">
          These charts are meant to answer four questions: Is the model streaming steadily? Is the UI keeping up? Is memory growing too fast? Are we ending the session healthier or worse than we started?
        </div>
        <div className="grid gap-4">
          <Sparkline
            title="Estimated tokens/sec"
            values={tokensSeries}
            benchmark="Higher is better. 40+ is strong."
            summary={summarizeSeries(tokensSeries, "higher")}
          />
          <Sparkline
            title="Chunk interval (ms)"
            values={chunkSeries}
            tone="lime"
            benchmark="Lower is smoother. Aim under 60ms."
            summary={summarizeSeries(chunkSeries, "lower")}
          />
          <Sparkline
            title="Queue depth"
            values={queueSeries}
            tone="coral"
            benchmark="Near 0 means FE is keeping up."
            summary={summarizeSeries(queueSeries, "lower")}
          />
          <Sparkline
            title="Heap MB"
            values={heapSeries}
            benchmark="Watch for relentless upward drift."
            summary={summarizeSeries(heapSeries, "lower")}
          />
        </div>
      </SectionCard>

      <SectionCard title="Where The Latency Lives" eyebrow="Diagnosis">
        <div className="grid gap-4">
          {[bottlenecks.startup, bottlenecks.stream, bottlenecks.render].map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-white/10 bg-black/25 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white">{item.label}</div>
                <div className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan">
                  {item.source}
                </div>
              </div>
              <p className="mt-3 text-sm leading-7 text-mist/74">{item.detail}</p>
            </div>
          ))}
          {report?.backendTiming ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-mist/72">
              <p>Backend first chunk: {report.backendTiming.providerFirstChunkMs?.toFixed(0) ?? "n/a"}ms</p>
              <p>Backend avg flush cadence: {report.backendTiming.avgFlushIntervalMs?.toFixed(1) ?? "n/a"}ms</p>
              <p>Frontend first visible gap after TTFT: {bottlenecks.renderGap?.toFixed(0) ?? "n/a"}ms</p>
              <p>Client-vs-backend stream gap: {bottlenecks.streamOverhead?.toFixed(1) ?? "n/a"}ms</p>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Web Vitals" eyebrow="Page Health">
        {webVitals.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {webVitals.map((metric) => (
              <div
                key={metric.id}
                className="rounded-3xl border border-white/10 bg-black/25 p-4 text-sm leading-7 text-mist/74"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-white">{metric.name}</div>
                  <div className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan">
                    {metric.rating ?? "observed"}
                  </div>
                </div>
                <p className="mt-3 text-white">
                  {metric.name === "CLS" ? metric.value.toFixed(3) : `${metric.value.toFixed(1)}ms`}
                </p>
                <p>Target: {WEB_VITAL_TARGETS[metric.name] ?? "Lower is better"}</p>
                <p>Navigation: {metric.navigationType ?? "n/a"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-7 text-mist/72">
            Web Vitals have not been reported yet for this page load.
          </p>
        )}
      </SectionCard>

      <SectionCard title="What This Run Means" eyebrow="Interpretation">
        <div className="space-y-3 text-sm leading-7 text-mist/76">
          <p>
            {status === "idle"
              ? "Run a session to see whether slowness is coming from the model, the stream cadence, or the frontend render path."
              : derived?.backpressureActive
                ? "This run shows frontend pressure: queue depth rose enough that rendering could not keep pace with incoming chunks."
                : (derived?.ttftMs ?? 0) > 1800
                  ? "This run is mainly model or backend bound: the stream started slowly, but the frontend stayed relatively healthy afterward."
                  : (derived?.averageFps ?? 60) < 45
                    ? "This run is mostly frontend bound: the stream arrived, but the UI lost smoothness while rendering it."
                    : "This run looks healthy overall: startup, throughput, and render smoothness are all within a solid demo range."}
          </p>
          <p>
            Compare <span className="text-white">TTFT</span> against <span className="text-white">First Visible</span> to spot frontend delay, and compare <span className="text-white">Avg Chunk Interval</span> against <span className="text-white">Queue Depth</span> to see whether the stream or the renderer is the limiting factor.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Session Actions" eyebrow="Report">
        <div className="space-y-4 text-sm text-mist/72">
          <p>Status: {status}</p>
          <p>
            Completed sessions are stored locally so you can open the result page and export the
            report JSON.
          </p>
          <button
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            onClick={onViewReport}
            disabled={!report || !onViewReport}
          >
            View Latest Report
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
