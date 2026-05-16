# Super Chat Benchmark Lab

Super Chat is a streaming UI benchmark cockpit for measuring how an AI chat frontend behaves under load. It focuses on the full path from provider latency to client render pressure, including:

- time to first token
- first visible text
- Core Web Vitals
- tokens per second
- queue depth
- dropped frames
- heap growth
- markdown rendering pressure

## What It Includes

- `Live` mode for real provider-backed streaming
- `Stress Lab` mode for reproducible synthetic load
- a live transcript view
- a telemetry dashboard with charts and bottleneck hints
- app-wide Web Vitals instrumentation
- local report export for the latest completed run

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Add your environment variables in `.env` if needed.

3. Start the app:

```bash
npm run dev
```

Open the local Next.js app in your browser and choose either the live benchmark or the stress lab.

## Scripts

- `npm run dev` - start the development server
- `npm run build` - create a production build
- `npm run start` - start the production server
- `npm run typecheck` - run TypeScript checks

## Benchmark Modes

### Live Benchmark

Use `/live` to stream from a real provider. This mode lets you compare:

- provider latency
- streaming cadence
- render smoothness
- memory pressure

### Stress Lab

Use `/stress` to run synthetic streams with controlled chunk size, chunk interval, jitter, and content shape. This is the best mode for reproducing render problems and queue buildup consistently.

The synthetic presets are defined in [lib/prompts.ts](/Users/piyushzala/Desktop/my%20projects/super-caht/lib/prompts.ts) and the content generator lives in [lib/stress-content.ts](/Users/piyushzala/Desktop/my%20projects/super-caht/lib/stress-content.ts).

## Report Storage

Completed benchmark reports are stored in `localStorage` under a single current-report key:

- `benchmark-report:current`

Older per-session report keys are cleared before a new report is written, which keeps browser storage from filling up with stale runs.

The results page still supports opening a report by session id, but it now prefers the current stored report first for reload reliability.

## Web Vitals

The app captures Web Vitals through Next.js `useReportWebVitals` and stores the latest snapshot in memory for the current page load. That snapshot is included in each benchmark report so you can compare:

- streaming-specific metrics like queue depth and dropped frames
- standard page metrics like `LCP`, `INP`, `CLS`, `FCP`, and `TTFB`

If debug mode is enabled, Web Vitals are also logged to the console with the `[benchmark][web-vitals]` prefix.

## Debugging Performance

If you enable benchmark debug mode with `?benchmarkDebug=1` or `localStorage["benchmark-debug-perf"] = "1"`, the app logs:

- flush timing
- web vitals
- markdown streaming preparation cost
- React render durations
- virtualized markdown render durations

This is helpful when you want to confirm whether the bottleneck is:

- stream cadence
- transcript rendering
- markdown parsing
- queue buildup

## Notes

- The transcript renderer batches flushes to reduce frame pressure when tokens arrive quickly.
- The stress content is intentionally dense so it can expose render bottlenecks, queue growth, and memory drift.
- Reports are intended to be short-lived and local to the browser session unless you export the JSON manually.
