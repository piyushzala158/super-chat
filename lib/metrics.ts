import type { BenchmarkReport, DerivedMetrics, FrontendSample } from "@/lib/types";

export function estimateTokens(characters: number) {
  return Math.max(1, Math.round(characters / 4));
}

export function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function maximum(values: number[]) {
  if (!values.length) return null;
  return Math.max(...values);
}

export function jitter(values: number[]) {
  const avg = average(values);
  if (!avg || values.length < 2) return null;
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export function computeDerivedMetrics(input: {
  startedAt: number;
  firstChunkAt: number | null;
  firstVisibleAt: number | null;
  completedAt: number | null;
  charactersReceived: number;
  chunkIntervals: number[];
  chunkProcessMs: number[];
  frontendSamples: FrontendSample[];
  queueDepths: number[];
  stallCount: number;
  reconnects: number;
  commitDurations: number[];
}): DerivedMetrics {
  const {
    startedAt,
    firstChunkAt,
    firstVisibleAt,
    completedAt,
    charactersReceived,
    chunkIntervals,
    chunkProcessMs,
    frontendSamples,
    queueDepths,
    stallCount,
    reconnects,
    commitDurations
  } = input;

  const estimatedTokens = estimateTokens(charactersReceived);
  const totalDurationMs = completedAt ? completedAt - startedAt : null;
  const estimatedTokensPerSecond =
    totalDurationMs && totalDurationMs > 0
      ? estimatedTokens / (totalDurationMs / 1000)
      : null;

  const fpsSamples = frontendSamples
    .map((sample) => sample.fps)
    .filter((value): value is number => value !== null);
  const droppedFrameSamples = frontendSamples
    .map((sample) => sample.droppedFrameRatio)
    .filter((value): value is number => value !== null);

  const queueAvg = average(queueDepths) ?? 0;
  const maxQueueDepth = maximum(queueDepths) ?? 0;
  const avgIncomingGap = average(chunkIntervals) ?? 0;

  return {
    ttftMs: firstChunkAt ? firstChunkAt - startedAt : null,
    firstVisibleTextMs: firstVisibleAt ? firstVisibleAt - startedAt : null,
    totalDurationMs,
    charactersReceived,
    estimatedTokens,
    estimatedTokensPerSecond,
    chunkCount: chunkIntervals.length ? chunkIntervals.length + 1 : charactersReceived > 0 ? 1 : 0,
    avgChunkIntervalMs: average(chunkIntervals),
    maxChunkGapMs: maximum(chunkIntervals),
    jitterMs: jitter(chunkIntervals),
    stalls: stallCount,
    reconnects,
    averageChunkProcessMs: average(chunkProcessMs),
    maxChunkProcessMs: maximum(chunkProcessMs),
    averageFps: average(fpsSamples),
    droppedFramesPct:
      droppedFrameSamples.length > 0 ? (average(droppedFrameSamples) ?? 0) * 100 : null,
    maxQueueDepth,
    backpressureActive:
      maxQueueDepth >= 4 && queueAvg > 1 && avgIncomingGap > 0 && (average(chunkProcessMs) ?? 0) > avgIncomingGap,
    reactCommits: commitDurations.length,
    averageCommitMs: average(commitDurations),
    maxCommitMs: maximum(commitDurations)
  };
}

export function buildTokensTimeline(args: {
  startedAt: number;
  visibleSamples: Array<{ at: number; characters: number }>;
}) {
  const { startedAt, visibleSamples } = args;
  return visibleSamples.map((sample) => {
    const elapsedMs = Math.max(1, sample.at - startedAt);
    return {
      at: sample.at,
      value: estimateTokens(sample.characters) / (elapsedMs / 1000)
    };
  });
}

export function serializeReport(report: BenchmarkReport) {
  return JSON.stringify(report, null, 2);
}
