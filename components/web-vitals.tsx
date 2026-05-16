"use client";

import { useReportWebVitals } from "next/web-vitals";
import { recordWebVital } from "@/lib/web-vitals";
import type { BenchmarkWebVitalMetric } from "@/lib/types";

const BENCHMARK_PERF_DEBUG_KEY = "benchmark-debug-perf";

function isBenchmarkPerfDebugEnabled() {
  if (typeof window === "undefined") return false;
  return (
    window.localStorage.getItem(BENCHMARK_PERF_DEBUG_KEY) === "1" ||
    window.location.search.includes("benchmarkDebug=1")
  );
}

const handleWebVitals: Parameters<typeof useReportWebVitals>[0] = (metric) => {
  const snapshot: BenchmarkWebVitalMetric = {
    id: metric.id,
    name: metric.name as BenchmarkWebVitalMetric["name"],
    value: metric.value,
    delta: metric.delta,
    rating: metric.rating,
    navigationType: metric.navigationType,
    entriesCount: metric.entries.length,
    recordedAt: Date.now()
  };

  recordWebVital(snapshot);

  if (isBenchmarkPerfDebugEnabled()) {
    console.debug("[benchmark][web-vitals]", snapshot);
  }
};

export function WebVitals() {
  useReportWebVitals(handleWebVitals);
  return null;
}
