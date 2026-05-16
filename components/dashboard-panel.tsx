"use client";

import { SectionCard } from "@/components/section-card";
import { MetricCard } from "@/components/metric-card";
import { Sparkline } from "@/components/sparkline";
import type { BenchmarkReport } from "@/lib/types";

function formatMetric(value: number | null, unit = "", digits = 0) {
  if (value === null || Number.isNaN(value)) return "n/a";
  return `${value.toFixed(digits)}${unit}`;
}

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

  return (
    <div className="grid gap-6">
      <SectionCard title="Live Dashboard" eyebrow="Telemetry">
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard label="TTFT" value={formatMetric(derived?.ttftMs ?? null, "ms")} />
          <MetricCard
            label="First Visible"
            value={formatMetric(derived?.firstVisibleTextMs ?? null, "ms")}
          />
          <MetricCard
            label="Estimated tok/s"
            value={formatMetric(derived?.estimatedTokensPerSecond ?? null, "", 1)}
          />
          <MetricCard
            label="Avg Chunk Interval"
            value={formatMetric(derived?.avgChunkIntervalMs ?? null, "ms")}
          />
          <MetricCard label="FPS" value={formatMetric(derived?.averageFps ?? null, "", 1)} />
          <MetricCard
            label="Dropped Frames"
            value={formatMetric(derived?.droppedFramesPct ?? null, "%", 1)}
          />
          <MetricCard
            label="Max Queue Depth"
            value={formatMetric(derived?.maxQueueDepth ?? null)}
          />
          <MetricCard
            label="Backpressure"
            value={derived?.backpressureActive ? "active" : status === "idle" ? "idle" : "clear"}
            accent={derived?.backpressureActive ? "warning" : "default"}
          />
        </div>
      </SectionCard>

      <SectionCard title="Trend Lines" eyebrow="Charts">
        <div className="grid gap-4">
          <Sparkline
            title="Estimated tokens/sec"
            values={report?.tokensPerSecondTimeline.map((item) => item.value) ?? []}
          />
          <Sparkline
            title="Chunk interval (ms)"
            values={report?.chunkIntervals ?? []}
            tone="lime"
          />
          <Sparkline
            title="Queue depth"
            values={report?.queueDepthTimeline.map((item) => item.value) ?? []}
            tone="coral"
          />
          <Sparkline
            title="Heap MB"
            values={
              report?.frontendSamples
                .map((item) => item.heapMb)
                .filter((value): value is number => value !== null) ?? []
            }
          />
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
