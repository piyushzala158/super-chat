import type { BenchmarkWebVitalMetric, BenchmarkWebVitalsSnapshot } from "@/lib/types";

export const BENCHMARK_WEB_VITALS_WINDOW_KEY = "__superChatWebVitals";

type BrowserWindowWithVitals = Window & {
  [BENCHMARK_WEB_VITALS_WINDOW_KEY]?: BenchmarkWebVitalsSnapshot;
};

export function readWebVitalsSnapshot(): BenchmarkWebVitalsSnapshot {
  if (typeof window === "undefined") return {};
  const browserWindow = window as BrowserWindowWithVitals;
  return browserWindow[BENCHMARK_WEB_VITALS_WINDOW_KEY] ?? {};
}

export function recordWebVital(metric: BenchmarkWebVitalMetric) {
  if (typeof window === "undefined") return;
  const browserWindow = window as BrowserWindowWithVitals;
  browserWindow[BENCHMARK_WEB_VITALS_WINDOW_KEY] = {
    ...(browserWindow[BENCHMARK_WEB_VITALS_WINDOW_KEY] ?? {}),
    [metric.name]: metric
  };
}
