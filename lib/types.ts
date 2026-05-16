export type SessionMode = "live" | "synthetic";
export type LiveProvider = "google-ai-studio" | "openrouter";

export type PromptPresetId =
  | "short-answer"
  | "structured-markdown"
  | "code-generation"
  | "large-explanation"
  | "long-stress";

export type StressPresetId =
  | "long-markdown"
  | "large-code-block"
  | "large-table"
  | "high-chunk-rate"
  | "long-session"
  | "ten-k-replay";

export type BackendTiming = {
  provider: LiveProvider | "synthetic";
  requestValidationMs: number;
  providerStartMs: number;
  providerFirstChunkMs: number | null;
  providerCompleteMs: number | null;
  transformOverheadMs: number;
  avgFlushIntervalMs: number | null;
  chunkCount: number;
};

export type StreamChunk = {
  sequence: number;
  delta: string;
  receivedAt: number;
  serverTimestamp: number;
};

export type FrontendSample = {
  at: number;
  fps: number | null;
  heapMb: number | null;
  domNodes: number | null;
  queueDepth: number;
  chunkProcessMs: number | null;
  droppedFrameRatio: number | null;
};

export type DerivedMetrics = {
  ttftMs: number | null;
  firstVisibleTextMs: number | null;
  totalDurationMs: number | null;
  charactersReceived: number;
  estimatedTokens: number;
  estimatedTokensPerSecond: number | null;
  chunkCount: number;
  avgChunkIntervalMs: number | null;
  maxChunkGapMs: number | null;
  jitterMs: number | null;
  stalls: number;
  reconnects: number;
  averageChunkProcessMs: number | null;
  maxChunkProcessMs: number | null;
  averageFps: number | null;
  droppedFramesPct: number | null;
  maxQueueDepth: number;
  backpressureActive: boolean;
  reactCommits: number;
  averageCommitMs: number | null;
  maxCommitMs: number | null;
};

export type BenchmarkSession = {
  id: string;
  mode: SessionMode;
  provider: LiveProvider | "synthetic";
  model: string;
  preset: PromptPresetId | StressPresetId;
  startedAt: number;
};

export type BenchmarkReport = {
  session: BenchmarkSession;
  prompt: string;
  backendTiming: BackendTiming | null;
  derived: DerivedMetrics;
  frontendSamples: FrontendSample[];
  chunkIntervals: number[];
  tokensPerSecondTimeline: Array<{ at: number; value: number }>;
  queueDepthTimeline: Array<{ at: number; value: number }>;
  environment: {
    viewport: { width: number; height: number } | null;
    userAgent: string | null;
    deviceMemoryGb: number | null;
  };
};

export type SessionStartEvent = {
  sessionId: string;
  mode: SessionMode;
  provider: LiveProvider | "synthetic";
  model: string;
  preset: string;
  startedAt: number;
};

export type ChunkEvent = {
  sequence: number;
  delta: string;
  serverTimestamp: number;
};

export type MetricEvent = {
  backendTiming?: Partial<BackendTiming>;
};

export type SessionEndEvent = {
  completedAt: number;
  backendTiming: BackendTiming | null;
  completionStatus: "ok" | "error";
  outputCharacters: number;
};

export type ErrorEvent = {
  code: string;
  message: string;
};

export type StreamEventMap = {
  session_start: SessionStartEvent;
  chunk: ChunkEvent;
  metric: MetricEvent;
  session_end: SessionEndEvent;
  error: ErrorEvent;
};

export type StreamEventName = keyof StreamEventMap;

export type StreamEnvelope<T extends StreamEventName = StreamEventName> = {
  event: T;
  data: StreamEventMap[T];
};

export type StressPreset = {
  id: StressPresetId;
  label: string;
  description: string;
  chunkSize: number;
  chunkIntervalMs: number;
  jitterPct: number;
  totalCharacters: number;
  contentType: "markdown" | "code" | "table" | "mixed";
};

export type GoogleLiveConfig = {
  apiKey: string;
  model: string;
  systemInstruction: string;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  candidateCount: number;
  stopSequences: string;
  seed: number | null;
  responseMimeType: "text/plain" | "application/json";
  presencePenalty: number;
  frequencyPenalty: number;
};

export type OpenRouterLiveConfig = {
  apiKey: string;
  model: string;
  customModel: string;
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  frequencyPenalty: number;
  presencePenalty: number;
  repetitionPenalty: number;
  minP: number;
  topA: number;
  seed: number | null;
  stop: string;
  jsonMode: boolean;
};
