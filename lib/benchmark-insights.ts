import type { BackendTiming, DerivedMetrics, LiveProvider } from "@/lib/types";

type Health = "great" | "ok" | "poor";

export type MetricInsight = {
  label: string;
  value: string;
  benchmark: string;
  helper: string;
  health: Health;
};

export type BottleneckInsight = {
  label: string;
  source: "backend" | "frontend" | "network" | "mixed" | "healthy";
  detail: string;
};

function classifyLowBetter(value: number | null, great: number, ok: number): Health {
  if (value === null) return "ok";
  if (value <= great) return "great";
  if (value <= ok) return "ok";
  return "poor";
}

function classifyHighBetter(value: number | null, great: number, ok: number): Health {
  if (value === null) return "ok";
  if (value >= great) return "great";
  if (value >= ok) return "ok";
  return "poor";
}

function accentFromHealth(health: Health) {
  if (health === "great") return "success" as const;
  if (health === "poor") return "warning" as const;
  return "default" as const;
}

function verdict(health: Health, great: string, ok: string, poor: string) {
  if (health === "great") return great;
  if (health === "ok") return ok;
  return poor;
}

export function buildMetricInsights(derived: DerivedMetrics | undefined) {
  const ttftHealth = classifyLowBetter(derived?.ttftMs ?? null, 900, 1800);
  const fpsHealth = classifyHighBetter(derived?.averageFps ?? null, 60, 45);
  const chunkGapHealth = classifyLowBetter(derived?.avgChunkIntervalMs ?? null, 60, 140);
  const queueHealth =
    (derived?.backpressureActive ?? false) || (derived?.maxQueueDepth ?? 0) > 6
      ? "poor"
      : (derived?.maxQueueDepth ?? 0) > 2
        ? "ok"
        : "great";

  const cards: MetricInsight[] = [
    {
      label: "TTFT",
      value: derived?.ttftMs ? `${derived.ttftMs.toFixed(0)}ms` : "n/a",
      benchmark: "<900ms great, <1800ms acceptable",
      helper: verdict(
        ttftHealth,
        "Fast model response. The UI should feel snappy.",
        "Usable, but there is visible waiting before content starts.",
        "Slow start. Users will likely feel the pause before streaming begins."
      ),
      health: ttftHealth
    },
    {
      label: "First Visible",
      value: derived?.firstVisibleTextMs ? `${derived.firstVisibleTextMs.toFixed(0)}ms` : "n/a",
      benchmark: "Keep this close to TTFT",
      helper:
        derived?.firstVisibleTextMs && derived?.ttftMs
          ? derived.firstVisibleTextMs - derived.ttftMs > 180
            ? "Frontend rendering is noticeably delaying visible text after the first chunk."
            : "Frontend is showing text quickly after data arrives."
          : "Measures when the UI actually becomes readable to the user.",
      health:
        derived?.firstVisibleTextMs && derived?.ttftMs && derived.firstVisibleTextMs - derived.ttftMs > 180
          ? "poor"
          : "great"
    },
    {
      label: "Estimated tok/s",
      value: derived?.estimatedTokensPerSecond
        ? derived.estimatedTokensPerSecond.toFixed(1)
        : "n/a",
      benchmark: ">40 feels strong for text chat",
      helper:
        derived?.estimatedTokensPerSecond && derived.estimatedTokensPerSecond < 20
          ? "Throughput is on the slow side. Long answers will feel heavy."
          : "Higher throughput keeps long answers feeling alive instead of sluggish.",
      health: classifyHighBetter(derived?.estimatedTokensPerSecond ?? null, 40, 20)
    },
    {
      label: "Avg Chunk Interval",
      value: derived?.avgChunkIntervalMs ? `${derived.avgChunkIntervalMs.toFixed(0)}ms` : "n/a",
      benchmark: "<60ms smooth, <140ms okay",
      helper: verdict(
        chunkGapHealth,
        "Chunks are arriving frequently enough to feel fluid.",
        "The stream is readable, but may feel a bit bursty.",
        "Large gaps between chunks can make streaming feel inconsistent."
      ),
      health: chunkGapHealth
    },
    {
      label: "FPS",
      value: derived?.averageFps ? derived.averageFps.toFixed(1) : "n/a",
      benchmark: "60+ great, 45+ acceptable",
      helper: verdict(
        fpsHealth,
        "Rendering smoothness is in a strong range for chat UX.",
        "Usable, but heavier streams may still feel a bit soft.",
        "Rendering smoothness is dropping under load."
      ),
      health: fpsHealth
    },
    {
      label: "Dropped Frames",
      value: derived?.droppedFramesPct ? `${derived.droppedFramesPct.toFixed(1)}%` : "n/a",
      benchmark: "<5% ideal",
      helper:
        (derived?.droppedFramesPct ?? 0) > 10
          ? "Too many slow frames. Scrolling and typing may feel sticky."
          : "This shows how often frames exceeded the smooth rendering budget.",
      health: classifyLowBetter(derived?.droppedFramesPct ?? null, 5, 10)
    },
    {
      label: "Max Queue Depth",
      value: `${derived?.maxQueueDepth ?? 0}`,
      benchmark: "0-2 ideal, 3-6 caution",
      helper: verdict(
        queueHealth,
        "Frontend is keeping up with incoming chunks.",
        "Some batching pressure exists, but it is still under control.",
        "Frontend is falling behind the stream and building a queue."
      ),
      health: queueHealth
    },
    {
      label: "Backpressure",
      value: derived?.backpressureActive ? "active" : "clear",
      benchmark: "Should stay clear",
      helper:
        derived?.backpressureActive
          ? "Incoming data is outrunning render capacity."
          : "Render capacity is healthy relative to the incoming stream.",
      health: derived?.backpressureActive ? "poor" : "great"
    }
  ];

  return cards.map((card) => ({ ...card, accent: accentFromHealth(card.health) }));
}

export function buildBottleneckInsights(args: {
  derived: DerivedMetrics | undefined;
  backendTiming: BackendTiming | null | undefined;
  provider: LiveProvider | "synthetic" | undefined;
}) {
  const { derived, backendTiming, provider } = args;
  const startupGap =
    derived?.ttftMs !== null &&
    derived?.ttftMs !== undefined &&
    backendTiming?.providerFirstChunkMs !== null &&
    backendTiming?.providerFirstChunkMs !== undefined
      ? derived.ttftMs - backendTiming.providerFirstChunkMs
      : null;
  const renderGap =
    derived?.firstVisibleTextMs !== null &&
    derived?.firstVisibleTextMs !== undefined &&
    derived?.ttftMs !== null &&
    derived?.ttftMs !== undefined
      ? derived.firstVisibleTextMs - derived.ttftMs
      : null;
  const streamOverhead =
    derived?.avgChunkIntervalMs !== null &&
    derived?.avgChunkIntervalMs !== undefined &&
    backendTiming?.avgFlushIntervalMs !== null &&
    backendTiming?.avgFlushIntervalMs !== undefined
      ? derived.avgChunkIntervalMs - backendTiming.avgFlushIntervalMs
      : null;

  const startup: BottleneckInsight =
    backendTiming?.providerFirstChunkMs && derived?.ttftMs
      ? backendTiming.providerFirstChunkMs / derived.ttftMs > 0.72
        ? {
            label: "Startup Path",
            source: "backend",
            detail: `${provider === "synthetic" ? "Synthetic generator" : "Provider/backend"} is dominating startup latency before the first chunk reaches the browser.`
          }
        : startupGap !== null && startupGap > 250
          ? {
              label: "Startup Path",
              source: "network",
              detail: "There is noticeable delay after the backend produced the first chunk, which points to transfer or browser-side handoff overhead."
            }
          : {
              label: "Startup Path",
              source: "healthy",
              detail: "Startup is balanced. The first chunk reaches the UI without unusual extra delay."
            }
      : {
          label: "Startup Path",
          source: "mixed",
          detail: "Need a full run to identify whether startup is backend or frontend dominated."
        };

  const render: BottleneckInsight =
    renderGap !== null && renderGap > 180
      ? {
          label: "Render Path",
          source: "frontend",
          detail: "The browser is taking noticeable extra time to turn received chunks into visible text."
        }
      : (derived?.backpressureActive ?? false) || (derived?.averageFps ?? 60) < 45
        ? {
            label: "Render Path",
            source: "frontend",
            detail: "The frontend render path is under pressure. Queue growth or low FPS suggests the UI is struggling to keep up."
          }
        : {
            label: "Render Path",
            source: "healthy",
            detail: "Rendering looks healthy. The UI is not adding a significant delay after data arrives."
          };

  const stream: BottleneckInsight =
    derived?.backpressureActive
      ? {
          label: "Streaming Cadence",
          source: "frontend",
          detail: "Chunks are arriving faster than the frontend can apply them, so this is primarily a UI throughput problem."
        }
      : streamOverhead !== null && streamOverhead > 80
        ? {
            label: "Streaming Cadence",
            source: "network",
            detail: "Client chunk gaps are much larger than backend flush cadence, so transport or browser buffering is adding latency."
          }
        : (derived?.avgChunkIntervalMs ?? 0) > 140
          ? {
              label: "Streaming Cadence",
              source: "backend",
              detail: "Chunk cadence is slow before it even reaches the UI, so the provider/backend stream itself is the main issue."
            }
          : {
              label: "Streaming Cadence",
              source: "healthy",
              detail: "Chunk cadence looks stable relative to render capacity."
            };

  return {
    startup,
    render,
    stream,
    startupGap,
    renderGap,
    streamOverhead
  };
}

export function summarizeSeries(values: number[], direction: "higher" | "lower") {
  if (!values.length) return "No samples yet.";
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const last = values[values.length - 1];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const trend =
    last > avg * 1.12
      ? direction === "higher"
        ? "ending above average"
        : "ending worse than average"
      : last < avg * 0.88
        ? direction === "higher"
          ? "ending below average"
          : "ending better than average"
        : "ending near average";

  return `Avg ${avg.toFixed(1)}, last ${last.toFixed(1)}, range ${min.toFixed(1)}-${max.toFixed(1)}, ${trend}.`;
}
