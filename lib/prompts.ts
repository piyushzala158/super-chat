import type { PromptPresetId, StressPreset } from "@/lib/types";

export const GEMINI_MODELS = [
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    recommended: true,
    kind: "stable"
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    recommended: false,
    kind: "stable"
  },
  {
    id: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro Preview",
    recommended: false,
    kind: "preview"
  }
] as const;

export const OPENROUTER_MODELS = [
  {
    id: "openrouter/free",
    label: "OpenRouter Free Router",
    description: "Automatically routes to an available free model.",
    recommended: true
  },
  {
    id: "custom",
    label: "Custom Model ID",
    description: "Paste any exact OpenRouter model ID, including :free variants.",
    recommended: false
  }
] as const;

export const PROMPT_PRESETS: Array<{
  id: PromptPresetId;
  label: string;
  prompt: string;
}> = [
  {
    id: "short-answer",
    label: "Short Answer",
    prompt:
      "Explain what makes a streaming AI chat UI feel fast in 5 concise bullet points."
  },
  {
    id: "structured-markdown",
    label: "Structured Markdown",
    prompt:
      "Write a benchmark report in markdown with headings, a table, bullets, and one code block explaining frontend streaming performance metrics."
  },
  {
    id: "code-generation",
    label: "Code Generation",
    prompt:
      "Generate a TypeScript utility that batches incoming stream chunks, tracks throughput, and exposes telemetry hooks. Include comments and a short explanation."
  },
  {
    id: "large-explanation",
    label: "Large Explanation",
    prompt:
      "Write a detailed, readable explanation of how to optimize an AI chat frontend for long context streaming, including rendering, virtualization, memory, and backpressure."
  },
  {
    id: "long-stress",
    label: "Long Stress Prompt",
    prompt:
      "Produce a very long technical benchmark narrative with multiple markdown sections, tables, numbered lists, and several large fenced TypeScript code blocks about chat performance engineering."
  }
];

export const STRESS_PRESETS: StressPreset[] = [
  {
    id: "long-markdown",
    label: "Long Markdown",
    description: "Dense markdown with headings, bullets, quotes, and inline code.",
    chunkSize: 64,
    chunkIntervalMs: 45,
    jitterPct: 0.25,
    totalCharacters: 24000,
    contentType: "markdown"
  },
  {
    id: "large-code-block",
    label: "Large Code Block",
    description: "Streams long TypeScript blocks to pressure parsing and layout.",
    chunkSize: 80,
    chunkIntervalMs: 35,
    jitterPct: 0.12,
    totalCharacters: 28000,
    contentType: "code"
  },
  {
    id: "large-table",
    label: "Large Table",
    description: "Wide markdown tables with repeated rows and inline metrics.",
    chunkSize: 72,
    chunkIntervalMs: 40,
    jitterPct: 0.2,
    totalCharacters: 26000,
    contentType: "table"
  },
  {
    id: "high-chunk-rate",
    label: "High Chunk Rate",
    description: "Tiny chunks pushed quickly to trigger queue growth and pressure.",
    chunkSize: 14,
    chunkIntervalMs: 12,
    jitterPct: 0.08,
    totalCharacters: 16000,
    contentType: "mixed"
  },
  {
    id: "long-session",
    label: "Long Session",
    description: "Multi-minute style stream designed to show memory stability.",
    chunkSize: 48,
    chunkIntervalMs: 70,
    jitterPct: 0.3,
    totalCharacters: 46000,
    contentType: "mixed"
  },
  {
    id: "ten-k-replay",
    label: "10k Message Replay",
    description: "Simulates a very large transcript that depends on virtualization.",
    chunkSize: 52,
    chunkIntervalMs: 18,
    jitterPct: 0.15,
    totalCharacters: 64000,
    contentType: "mixed"
  }
];

export function getPromptPreset(id: PromptPresetId) {
  return PROMPT_PRESETS.find((preset) => preset.id === id) ?? PROMPT_PRESETS[0];
}

export function getStressPreset(id: string) {
  return STRESS_PRESETS.find((preset) => preset.id === id) ?? STRESS_PRESETS[0];
}
