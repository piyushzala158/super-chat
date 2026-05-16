"use client";

import { GEMINI_MODELS, PROMPT_PRESETS, STRESS_PRESETS } from "@/lib/prompts";
import type { PromptPresetId, SessionMode } from "@/lib/types";
import { SectionCard } from "@/components/section-card";

type Selection = {
  model: string;
  promptPreset: PromptPresetId;
  customPrompt: string;
  stressPreset: string;
  chunkSize: number;
  chunkIntervalMs: number;
  jitterPct: number;
};

export function BenchmarkControls({
  title,
  mode,
  selection,
  updateSelection,
  onStart,
  onStop,
  isRunning,
  error
}: {
  title: string;
  mode: SessionMode;
  selection: Selection;
  updateSelection: (patch: Partial<Selection>) => void;
  onStart: () => void;
  onStop: () => void;
  isRunning: boolean;
  error: string | null;
}) {
  return (
    <SectionCard title={title} eyebrow="Session Controls">
      <div className="grid gap-4 md:grid-cols-2">
        {mode === "live" ? (
          <>
            <label className="space-y-2 text-sm">
              <span className="text-mist/65">Model</span>
              <select
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                value={selection.model}
                onChange={(event) => updateSelection({ model: event.target.value })}
              >
                {GEMINI_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                    {model.recommended ? " (recommended)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-mist/65">Prompt Preset</span>
              <select
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                value={selection.promptPreset}
                onChange={(event) => {
                  const nextPreset = event.target.value as PromptPresetId;
                  const preset = PROMPT_PRESETS.find((item) => item.id === event.target.value);
                  updateSelection({
                    promptPreset: nextPreset,
                    customPrompt: preset?.prompt ?? selection.customPrompt
                  });
                }}
              >
                {PROMPT_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-mist/65">Prompt</span>
              <textarea
                className="min-h-40 w-full rounded-3xl border border-white/10 bg-black/30 px-4 py-4 leading-7"
                value={selection.customPrompt}
                onChange={(event) => updateSelection({ customPrompt: event.target.value })}
              />
            </label>
          </>
        ) : (
          <>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-mist/65">Stress Preset</span>
              <select
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                value={selection.stressPreset}
                onChange={(event) => {
                  const preset = STRESS_PRESETS.find((item) => item.id === event.target.value);
                  updateSelection({
                    stressPreset: event.target.value,
                    chunkSize: preset?.chunkSize ?? selection.chunkSize,
                    chunkIntervalMs: preset?.chunkIntervalMs ?? selection.chunkIntervalMs,
                    jitterPct: preset?.jitterPct ?? selection.jitterPct
                  });
                }}
              >
                {STRESS_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-mist/65">Chunk Size</span>
              <input
                type="number"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                value={selection.chunkSize}
                onChange={(event) => updateSelection({ chunkSize: Number(event.target.value) })}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-mist/65">Chunk Interval (ms)</span>
              <input
                type="number"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                value={selection.chunkIntervalMs}
                onChange={(event) =>
                  updateSelection({ chunkIntervalMs: Number(event.target.value) })
                }
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-mist/65">Jitter %</span>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                value={selection.jitterPct}
                onChange={(event) => updateSelection({ jitterPct: Number(event.target.value) })}
              />
            </label>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          className="rounded-full bg-lime px-5 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onStart}
          disabled={isRunning}
        >
          {isRunning ? "Streaming..." : "Start Benchmark"}
        </button>
        <button
          className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onStop}
          disabled={!isRunning}
        >
          Stop Session
        </button>
        {error ? <div className="text-sm text-coral">{error}</div> : null}
      </div>
    </SectionCard>
  );
}
