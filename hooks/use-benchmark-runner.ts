"use client";

import { useEffect, useMemo, useRef, useState, startTransition } from "react";
import { buildTokensTimeline, computeDerivedMetrics } from "@/lib/metrics";
import { getPromptPreset, getStressPreset } from "@/lib/prompts";
import { parseSseResponse } from "@/lib/sse";
import type {
  BackendTiming,
  BenchmarkReport,
  ChunkEvent,
  GoogleLiveConfig,
  LiveProvider,
  MetricEvent,
  OpenRouterLiveConfig,
  PromptPresetId,
  FrontendSample,
  SessionEndEvent,
  SessionMode,
  SessionStartEvent,
  StreamEnvelope
} from "@/lib/types";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

type RunnerSelection = {
  provider: LiveProvider;
  promptPreset: PromptPresetId;
  customPrompt: string;
  google: GoogleLiveConfig;
  openrouter: OpenRouterLiveConfig;
  stressPreset: string;
  chunkSize: number;
  chunkIntervalMs: number;
  jitterPct: number;
};

const initialSelection: RunnerSelection = {
  provider: "google-ai-studio",
  promptPreset: "structured-markdown",
  customPrompt: getPromptPreset("structured-markdown").prompt,
  google: {
    apiKey: "",
    model: "gemini-2.5-flash",
    systemInstruction: "",
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 1024,
    candidateCount: 1,
    stopSequences: "",
    seed: null,
    responseMimeType: "text/plain",
    presencePenalty: 0,
    frequencyPenalty: 0
  },
  openrouter: {
    apiKey: "",
    model: "openrouter/free",
    customModel: "",
    temperature: 1,
    topP: 1,
    topK: 0,
    maxTokens: 1024,
    frequencyPenalty: 0,
    presencePenalty: 0,
    repetitionPenalty: 1,
    minP: 0,
    topA: 0,
    seed: null,
    stop: "",
    jsonMode: false
  },
  stressPreset: "long-markdown",
  chunkSize: getStressPreset("long-markdown").chunkSize,
  chunkIntervalMs: getStressPreset("long-markdown").chunkIntervalMs,
  jitterPct: getStressPreset("long-markdown").jitterPct
};

const BENCHMARK_PERF_DEBUG_KEY = "benchmark-debug-perf";
const BENCHMARK_SELECTION_STORAGE_KEY = "benchmark-selection:v1";
const BENCHMARK_REPORT_STORAGE_PREFIX = "benchmark-report:";
const BENCHMARK_CURRENT_REPORT_STORAGE_KEY = `${BENCHMARK_REPORT_STORAGE_PREFIX}current`;
const MIN_TRANSCRIPT_FLUSH_INTERVAL_MS = 32;
const MAX_REPORTED_FPS = 120;
const MIN_VALID_FRAME_DELTA_MS = 4;
const MAX_VALID_FRAME_DELTA_MS = 1000;
const REPORT_STORAGE_SAMPLE_CAP = 1200;

function isBenchmarkPerfDebugEnabled() {
  if (typeof window === "undefined") return false;
  return (
    window.localStorage.getItem(BENCHMARK_PERF_DEBUG_KEY) === "1" ||
    window.location.search.includes("benchmarkDebug=1")
  );
}

function sampleArray<T>(values: T[], cap: number) {
  if (values.length <= cap) return values;
  const stride = Math.ceil(values.length / cap);
  const sampled: T[] = [];
  for (let index = 0; index < values.length; index += stride) {
    sampled.push(values[index]);
  }
  return sampled;
}

function compactReportForStorage(report: BenchmarkReport): BenchmarkReport {
  return {
    ...report,
    frontendSamples: sampleArray(report.frontendSamples, REPORT_STORAGE_SAMPLE_CAP),
    chunkIntervals: sampleArray(report.chunkIntervals, REPORT_STORAGE_SAMPLE_CAP),
    tokensPerSecondTimeline: sampleArray(report.tokensPerSecondTimeline, REPORT_STORAGE_SAMPLE_CAP),
    queueDepthTimeline: sampleArray(report.queueDepthTimeline, REPORT_STORAGE_SAMPLE_CAP)
  };
}

function clearStoredBenchmarkReports() {
  if (typeof window === "undefined") return;

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key && key.startsWith(BENCHMARK_REPORT_STORAGE_PREFIX)) {
      window.localStorage.removeItem(key);
    }
  }
}

export function useBenchmarkRunner({ mode }: { mode: SessionMode }) {
  const [selection, setSelection] = useState<RunnerSelection>(initialSelection);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bufferRef = useRef("");
  const pendingChunksRef = useRef<ChunkEvent[]>([]);
  const metricsRef = useRef({
    sessionId: crypto.randomUUID(),
    startedAt: 0,
    sessionStartedAt: 0,
    provider: selection.provider as LiveProvider | "synthetic",
    model: selection.google.model,
    preset: selection.promptPreset as string,
    firstChunkAt: null as number | null,
    firstVisibleAt: null as number | null,
    completedAt: null as number | null,
    lastChunkAt: null as number | null,
    charactersReceived: 0,
    chunkIntervals: [] as number[],
    chunkProcessMs: [] as number[],
    frontendSamples: [] as FrontendSample[],
    queueDepths: [] as number[],
    stalls: 0,
    reconnects: 0,
    commitDurations: [] as number[],
    backendTiming: null as BackendTiming | null,
    visibleSamples: [] as Array<{ at: number; characters: number }>
  });

  const flushHandle = useRef<number | null>(null);
  const flushCountRef = useRef(0);
  const lastFlushAtRef = useRef(0);
  const hasHydratedSelectionRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(BENCHMARK_SELECTION_STORAGE_KEY);
    if (!raw) {
      hasHydratedSelectionRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<RunnerSelection>;
      setSelection((previous) => ({
        ...previous,
        ...parsed,
        google: { ...previous.google, ...(parsed.google ?? {}) },
        openrouter: { ...previous.openrouter, ...(parsed.openrouter ?? {}) }
      }));
    } catch {
      window.localStorage.removeItem(BENCHMARK_SELECTION_STORAGE_KEY);
    } finally {
      hasHydratedSelectionRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasHydratedSelectionRef.current) return;
    window.localStorage.setItem(BENCHMARK_SELECTION_STORAGE_KEY, JSON.stringify(selection));
  }, [selection]);

  useEffect(() => {
    return () => {
      if (flushHandle.current !== null) {
        clearTimeout(flushHandle.current);
      }
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (status !== "running") return;

    let rafId = 0;
    let lastFrameAt = performance.now();
    let droppedFrames = 0;
    let totalFrames = 0;

    const sample = () => {
      const now = performance.now();
      const delta = now - lastFrameAt;
      lastFrameAt = now;
      if (delta < MIN_VALID_FRAME_DELTA_MS || delta > MAX_VALID_FRAME_DELTA_MS) {
        rafId = requestAnimationFrame(sample);
        return;
      }
      totalFrames += 1;
      if (delta > 20) droppedFrames += 1;

      const fps = delta > 0 ? Math.min(MAX_REPORTED_FPS, 1000 / delta) : null;
      const heap = "memory" in performance
        ? ((performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
            ?.usedJSHeapSize ?? 0) /
          1024 /
          1024
        : null;

      metricsRef.current.frontendSamples.push({
        at: Date.now(),
        fps,
        heapMb: heap ? Math.round(heap * 10) / 10 : null,
        domNodes: document.getElementsByTagName("*").length,
        queueDepth: pendingChunksRef.current.length,
        chunkProcessMs:
          metricsRef.current.chunkProcessMs[metricsRef.current.chunkProcessMs.length - 1] ?? null,
        droppedFrameRatio: totalFrames > 0 ? droppedFrames / totalFrames : null
      });
      metricsRef.current.queueDepths.push(pendingChunksRef.current.length);
      rafId = requestAnimationFrame(sample);
    };

    rafId = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(rafId);
  }, [status]);

  const buildAndPersistReport = useMemo(
    () => () => {
      const metrics = metricsRef.current;
      const derived = computeDerivedMetrics({
        startedAt: metrics.startedAt,
        firstChunkAt: metrics.firstChunkAt,
        firstVisibleAt: metrics.firstVisibleAt,
        completedAt: metrics.completedAt,
        charactersReceived: metrics.charactersReceived,
        chunkIntervals: metrics.chunkIntervals,
        chunkProcessMs: metrics.chunkProcessMs,
        frontendSamples: metrics.frontendSamples,
        queueDepths: metrics.queueDepths,
        stallCount: metrics.stalls,
        reconnects: metrics.reconnects,
        commitDurations: metrics.commitDurations
      });

      const prompt =
        mode === "live" ? selection.customPrompt : getStressPreset(selection.stressPreset).label;
      const nextReport: BenchmarkReport = {
        session: {
          id: metrics.sessionId,
          mode,
          provider: metrics.provider,
          model: metrics.model,
          preset: metrics.preset as BenchmarkReport["session"]["preset"],
          startedAt: metrics.sessionStartedAt
        },
        prompt,
        backendTiming: metrics.backendTiming,
        derived,
        frontendSamples: metrics.frontendSamples,
        chunkIntervals: metrics.chunkIntervals,
        tokensPerSecondTimeline: buildTokensTimeline({
          startedAt: metrics.startedAt,
          visibleSamples: metrics.visibleSamples
        }),
        queueDepthTimeline: metrics.frontendSamples.map((sample) => ({
          at: sample.at,
          value: sample.queueDepth
        })),
        environment: {
          viewport:
            typeof window !== "undefined"
              ? { width: window.innerWidth, height: window.innerHeight }
              : null,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
          deviceMemoryGb:
            typeof navigator !== "undefined" && "deviceMemory" in navigator
              ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null
              : null
        }
      };

      const fullPayload = JSON.stringify(nextReport);
      try {
        clearStoredBenchmarkReports();
        window.localStorage.setItem(BENCHMARK_CURRENT_REPORT_STORAGE_KEY, fullPayload);
      } catch {
        const compacted = compactReportForStorage(nextReport);
        const compactedPayload = JSON.stringify(compacted);
        try {
          clearStoredBenchmarkReports();
          window.localStorage.setItem(BENCHMARK_CURRENT_REPORT_STORAGE_KEY, compactedPayload);
          if (isBenchmarkPerfDebugEnabled()) {
            console.warn("[benchmark][report-storage]", {
              mode: "compacted",
              originalBytes: fullPayload.length,
              compactedBytes: compactedPayload.length,
              cap: REPORT_STORAGE_SAMPLE_CAP
            });
          }
        } catch {
          if (isBenchmarkPerfDebugEnabled()) {
            console.warn("[benchmark][report-storage]", {
              mode: "skipped",
              reason: "quota_exceeded",
              originalBytes: fullPayload.length
            });
          }
        }
      }
      setReport(nextReport);
      return nextReport;
    },
    [mode, selection.customPrompt, selection.stressPreset]
  );

  function scheduleFlush() {
    if (flushHandle.current !== null) return;
    const elapsedSinceLastFlush = lastFlushAtRef.current
      ? performance.now() - lastFlushAtRef.current
      : MIN_TRANSCRIPT_FLUSH_INTERVAL_MS;
    const delay = Math.max(0, MIN_TRANSCRIPT_FLUSH_INTERVAL_MS - elapsedSinceLastFlush);

    flushHandle.current = window.setTimeout(() => {
      flushHandle.current = null;
      flushPendingNow();
    }, delay);
  }

  function flushPendingNow() {
    const queue = pendingChunksRef.current.splice(0);
    if (!queue.length) return;
    lastFlushAtRef.current = performance.now();

    const debugPerf = isBenchmarkPerfDebugEnabled();
    const flushId = ++flushCountRef.current;
    const flushTimerLabel = `[benchmark][flush#${flushId}]`;
    if (debugPerf) {
      console.time(flushTimerLabel);
    }
    const start = performance.now();
    const previousLength = bufferRef.current.length;
    const delta = queue.map((item) => item.delta).join("");
    const joinMs = performance.now() - start;

    const appendStart = performance.now();
    bufferRef.current += delta;
    const appendMs = performance.now() - appendStart;
    metricsRef.current.charactersReceived += delta.length;
    metricsRef.current.visibleSamples.push({
      at: Date.now(),
      characters: metricsRef.current.charactersReceived
    });
    if (!metricsRef.current.firstVisibleAt) {
      metricsRef.current.firstVisibleAt = Date.now();
    }

    const dispatchStart = performance.now();
    startTransition(() => {
      const commitStart = performance.now();
      setMessages((previous) =>
        previous.map((message) =>
          message.id === "assistant-active"
            ? {
                ...message,
                content: bufferRef.current
              }
            : message
        )
      );
      metricsRef.current.commitDurations.push(performance.now() - commitStart);
    });
    const dispatchMs = performance.now() - dispatchStart;

    const totalMs = performance.now() - start;
    metricsRef.current.chunkProcessMs.push(totalMs);

    if (debugPerf && (flushId <= 5 || flushId % 25 === 0 || queue.length >= 8 || totalMs > 4)) {
      console.debug("[benchmark][flush]", {
        flushId,
        queueDepth: queue.length,
        deltaChars: delta.length,
        bufferCharsBefore: previousLength,
        bufferCharsAfter: bufferRef.current.length,
        joinMs: Number(joinMs.toFixed(3)),
        appendMs: Number(appendMs.toFixed(3)),
        dispatchMs: Number(dispatchMs.toFixed(3)),
        totalMs: Number(totalMs.toFixed(3))
      });
    }
    if (debugPerf) {
      console.timeEnd(flushTimerLabel);
    }
  }

  async function start() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("running");
    setError(null);
    setReport(null);

    const promptPreset = getPromptPreset(selection.promptPreset);
    const stressPreset = getStressPreset(selection.stressPreset);
    const prompt = mode === "live" ? selection.customPrompt : stressPreset.label;

    metricsRef.current = {
      sessionId: crypto.randomUUID(),
      startedAt: Date.now(),
      sessionStartedAt: Date.now(),
      provider: mode === "live" ? selection.provider : "synthetic",
      model:
        mode === "live"
          ? selection.provider === "google-ai-studio"
            ? selection.google.model
            : selection.openrouter.model === "custom"
              ? selection.openrouter.customModel || "custom-openrouter-model"
              : selection.openrouter.model
          : "synthetic-generator",
      preset: mode === "live" ? promptPreset.id : stressPreset.id,
      firstChunkAt: null,
      firstVisibleAt: null,
      completedAt: null,
      lastChunkAt: null,
      charactersReceived: 0,
      chunkIntervals: [],
      chunkProcessMs: [],
      frontendSamples: [],
      queueDepths: [],
      stalls: 0,
      reconnects: 0,
      commitDurations: [],
      backendTiming: null,
      visibleSamples: []
    };
    flushCountRef.current = 0;
    lastFlushAtRef.current = 0;
    if (flushHandle.current !== null) {
      clearTimeout(flushHandle.current);
      flushHandle.current = null;
    }
    bufferRef.current = "";
    pendingChunksRef.current = [];
    setMessages([
      {
        id: "user-prompt",
        role: "user",
        content: prompt
      },
      {
        id: "assistant-active",
        role: "assistant",
        content: "",
        streaming: true
      }
    ]);

    const endpoint = mode === "live" ? "/api/live" : "/api/stress";
    const payload =
      mode === "live"
        ? {
            provider: selection.provider,
            prompt: selection.customPrompt,
            preset: selection.promptPreset,
            googleConfig: selection.google,
            openrouterConfig: selection.openrouter
          }
        : {
            presetId: selection.stressPreset,
            chunkSize: selection.chunkSize,
            chunkIntervalMs: selection.chunkIntervalMs,
            jitterPct: selection.jitterPct
          };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed with status ${response.status}.`);
      }

      await parseSseResponse(response, (envelope: StreamEnvelope) => {
        if (controller.signal.aborted) return;

        switch (envelope.event) {
          case "session_start":
            {
              const data = envelope.data as SessionStartEvent;
              metricsRef.current.sessionId = data.sessionId;
              metricsRef.current.sessionStartedAt = data.startedAt;
              metricsRef.current.provider = data.provider;
              metricsRef.current.model = data.model;
            }
            break;
          case "chunk": {
            const data = envelope.data as ChunkEvent;
            const receivedAt = Date.now();
            if (!metricsRef.current.firstChunkAt) {
              metricsRef.current.firstChunkAt = receivedAt;
            }
            if (metricsRef.current.lastChunkAt) {
              const gap = receivedAt - metricsRef.current.lastChunkAt;
              metricsRef.current.chunkIntervals.push(gap);
              const rolling = metricsRef.current.chunkIntervals.slice(-8);
              const rollingAvg =
                rolling.reduce((sum, value) => sum + value, 0) / Math.max(1, rolling.length);
              if (rollingAvg > 0 && gap > rollingAvg * 3) {
                metricsRef.current.stalls += 1;
              }
            }
            metricsRef.current.lastChunkAt = receivedAt;
            pendingChunksRef.current.push(data);
            scheduleFlush();
            break;
          }
          case "metric":
            {
              const data = envelope.data as MetricEvent;
              if (!data.backendTiming) break;
              metricsRef.current.backendTiming = {
                provider: data.backendTiming.provider ?? metricsRef.current.provider,
                requestValidationMs: data.backendTiming.requestValidationMs ?? 0,
                providerStartMs: data.backendTiming.providerStartMs ?? 0,
                providerFirstChunkMs: data.backendTiming.providerFirstChunkMs ?? null,
                providerCompleteMs: data.backendTiming.providerCompleteMs ?? null,
                transformOverheadMs: data.backendTiming.transformOverheadMs ?? 0,
                avgFlushIntervalMs: data.backendTiming.avgFlushIntervalMs ?? null,
                chunkCount: data.backendTiming.chunkCount ?? 0
              };
            }
            break;
          case "session_end":
            {
              const data = envelope.data as SessionEndEvent;
              flushPendingNow();
              metricsRef.current.completedAt = data.completedAt;
              if (data.backendTiming) {
                metricsRef.current.backendTiming = data.backendTiming;
              }
              setMessages((previous) =>
                previous.map((message) =>
                  message.id === "assistant-active" ? { ...message, streaming: false } : message
                )
              );
              setStatus(data.completionStatus === "ok" ? "done" : "error");
              buildAndPersistReport();
            }
            break;
          case "error":
            setError((envelope.data as { message: string }).message);
            setStatus("error");
            break;
          default:
            break;
        }
      });
    } catch (nextError) {
      if (controller.signal.aborted) return;
      setStatus("error");
      setError(nextError instanceof Error ? nextError.message : "Benchmark failed.");
    }
  }

  function stop() {
    abortRef.current?.abort();
    if (flushHandle.current !== null) {
      clearTimeout(flushHandle.current);
      flushHandle.current = null;
    }
    flushPendingNow();
    metricsRef.current.completedAt = Date.now();
    setMessages((previous) =>
      previous.map((message) =>
        message.id === "assistant-active" ? { ...message, streaming: false } : message
      )
    );
    setStatus("done");
    buildAndPersistReport();
  }

  return {
    selection,
    updateSelection: (patch: Partial<RunnerSelection>) =>
      setSelection((previous) => ({ ...previous, ...patch })),
    messages,
    status,
    error,
    report,
    start,
    stop
  };
}
