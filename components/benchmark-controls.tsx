"use client";

import { useMemo, useState } from "react";
import {
  GEMINI_MODELS,
  OPENROUTER_MODELS,
  PROMPT_PRESETS,
  STRESS_PRESETS
} from "@/lib/prompts";
import type {
  GoogleLiveConfig,
  LiveProvider,
  OpenRouterLiveConfig,
  PromptPresetId,
  SessionMode
} from "@/lib/types";
import { SectionCard } from "@/components/section-card";

type Selection = {
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

function NumberInput({
  label,
  value,
  step,
  min,
  max,
  onChange
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="text-mist/65">{label}</span>
      <input
        type="number"
        className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function Drawer({
  open,
  title,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <button className="flex-1 cursor-default" onClick={onClose} aria-label="Close drawer" />
      <div className="panel-noise h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-[#08131eea] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-cyan/80">Advanced Config</div>
            <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-mist/75 hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const activeGoogle = selection.google;
  const activeOpenRouter = selection.openrouter;

  const liveSummary = useMemo(() => {
    if (selection.provider === "google-ai-studio") {
      const model = GEMINI_MODELS.find((item) => item.id === activeGoogle.model)?.label ?? activeGoogle.model;
      return `Google AI Studio, ${model}, temp ${activeGoogle.temperature}, max ${activeGoogle.maxOutputTokens}`;
    }

    const model =
      activeOpenRouter.model === "custom"
        ? activeOpenRouter.customModel || "Custom model"
        : OPENROUTER_MODELS.find((item) => item.id === activeOpenRouter.model)?.label ??
          activeOpenRouter.model;
    return `OpenRouter, ${model}, temp ${activeOpenRouter.temperature}, max ${activeOpenRouter.maxTokens}`;
  }, [selection.provider, activeGoogle, activeOpenRouter]);

  return (
    <>
      <SectionCard title={title} eyebrow="Session Controls">
        <div className="grid gap-4 md:grid-cols-2">
          {mode === "live" ? (
            <>
              <label className="space-y-2 text-sm">
                <span className="text-mist/65">Provider</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                  value={selection.provider}
                  onChange={(event) =>
                    updateSelection({ provider: event.target.value as LiveProvider })
                  }
                >
                  <option value="google-ai-studio">Google AI Studio</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-mist/65">Prompt Preset</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                  value={selection.promptPreset}
                  onChange={(event) => {
                    const nextPreset = event.target.value as PromptPresetId;
                    const preset = PROMPT_PRESETS.find((item) => item.id === nextPreset);
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

              {selection.provider === "google-ai-studio" ? (
                <>
                  <label className="space-y-2 text-sm">
                    <span className="text-mist/65">Gemini Model</span>
                    <select
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                      value={activeGoogle.model}
                      onChange={(event) =>
                        updateSelection({
                          google: { ...activeGoogle, model: event.target.value }
                        })
                      }
                    >
                      {GEMINI_MODELS.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-mist/65">Google API Key</span>
                    <input
                      type="password"
                      autoComplete="off"
                      placeholder="Paste your Google AI Studio key"
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                      value={activeGoogle.apiKey}
                      onChange={(event) =>
                        updateSelection({
                          google: { ...activeGoogle, apiKey: event.target.value }
                        })
                      }
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="space-y-2 text-sm">
                    <span className="text-mist/65">OpenRouter Model</span>
                    <select
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                      value={activeOpenRouter.model}
                      onChange={(event) =>
                        updateSelection({
                          openrouter: { ...activeOpenRouter, model: event.target.value }
                        })
                      }
                    >
                      {OPENROUTER_MODELS.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-mist/65">OpenRouter API Key</span>
                    <input
                      type="password"
                      autoComplete="off"
                      placeholder="Paste your OpenRouter key"
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                      value={activeOpenRouter.apiKey}
                      onChange={(event) =>
                        updateSelection({
                          openrouter: { ...activeOpenRouter, apiKey: event.target.value }
                        })
                      }
                    />
                  </label>
                </>
              )}

              <label className="space-y-2 text-sm md:col-span-2">
                <span className="text-mist/65">Prompt</span>
                <textarea
                  className="min-h-40 w-full rounded-[1.8rem] border border-white/10 bg-black/30 px-4 py-4 leading-7"
                  value={selection.customPrompt}
                  onChange={(event) => updateSelection({ customPrompt: event.target.value })}
                />
              </label>

              <div className="md:col-span-2 rounded-[1.6rem] border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-mist/50">Active Config</div>
                <div className="mt-2 text-sm leading-7 text-mist/78">{liveSummary}</div>
                <button
                  type="button"
                  onClick={() => setAdvancedOpen(true)}
                  className="mt-4 rounded-full border border-cyan/30 bg-cyan/10 px-4 py-2 text-sm font-medium text-cyan hover:bg-cyan/15"
                >
                  Open Advanced Settings
                </button>
              </div>
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
              <NumberInput
                label="Chunk Size"
                value={selection.chunkSize}
                step={1}
                min={1}
                onChange={(value) => updateSelection({ chunkSize: value })}
              />
              <NumberInput
                label="Chunk Interval (ms)"
                value={selection.chunkIntervalMs}
                step={1}
                min={1}
                onChange={(value) => updateSelection({ chunkIntervalMs: value })}
              />
              <NumberInput
                label="Jitter %"
                value={selection.jitterPct}
                step={0.01}
                min={0}
                onChange={(value) => updateSelection({ jitterPct: value })}
              />
            </>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            className="rounded-full bg-[linear-gradient(145deg,#d4ff6a,#9ef18f)] px-5 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
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

      {mode === "live" ? (
        <Drawer
          open={advancedOpen}
          onClose={() => setAdvancedOpen(false)}
          title={selection.provider === "google-ai-studio" ? "Google AI Studio" : "OpenRouter"}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {selection.provider === "google-ai-studio" ? (
              <>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-mist/65">System Instruction</span>
                  <textarea
                    className="min-h-24 w-full rounded-[1.6rem] border border-white/10 bg-black/30 px-4 py-4 leading-7"
                    value={activeGoogle.systemInstruction}
                    onChange={(event) =>
                      updateSelection({
                        google: { ...activeGoogle, systemInstruction: event.target.value }
                      })
                    }
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-mist/65">Response MIME Type</span>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                    value={activeGoogle.responseMimeType}
                    onChange={(event) =>
                      updateSelection({
                        google: {
                          ...activeGoogle,
                          responseMimeType: event.target.value as "text/plain" | "application/json"
                        }
                      })
                    }
                  >
                    <option value="text/plain">text/plain</option>
                    <option value="application/json">application/json</option>
                  </select>
                </label>
                <NumberInput label="Temperature" value={activeGoogle.temperature} step={0.1} min={0} max={2} onChange={(value) => updateSelection({ google: { ...activeGoogle, temperature: value } })} />
                <NumberInput label="Top P" value={activeGoogle.topP} step={0.05} min={0} max={1} onChange={(value) => updateSelection({ google: { ...activeGoogle, topP: value } })} />
                <NumberInput label="Top K" value={activeGoogle.topK} step={1} min={0} onChange={(value) => updateSelection({ google: { ...activeGoogle, topK: value } })} />
                <NumberInput label="Max Output Tokens" value={activeGoogle.maxOutputTokens} step={1} min={1} onChange={(value) => updateSelection({ google: { ...activeGoogle, maxOutputTokens: value } })} />
                <NumberInput label="Candidate Count" value={activeGoogle.candidateCount} step={1} min={1} onChange={(value) => updateSelection({ google: { ...activeGoogle, candidateCount: value } })} />
                <NumberInput label="Presence Penalty" value={activeGoogle.presencePenalty} step={0.1} min={-2} max={2} onChange={(value) => updateSelection({ google: { ...activeGoogle, presencePenalty: value } })} />
                <NumberInput label="Frequency Penalty" value={activeGoogle.frequencyPenalty} step={0.1} min={-2} max={2} onChange={(value) => updateSelection({ google: { ...activeGoogle, frequencyPenalty: value } })} />
                <label className="space-y-2 text-sm">
                  <span className="text-mist/65">Seed</span>
                  <input
                    type="number"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                    value={activeGoogle.seed ?? ""}
                    placeholder="optional"
                    onChange={(event) =>
                      updateSelection({
                        google: {
                          ...activeGoogle,
                          seed: event.target.value ? Number(event.target.value) : null
                        }
                      })
                    }
                  />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-mist/65">Stop Sequences</span>
                  <textarea
                    className="min-h-20 w-full rounded-[1.6rem] border border-white/10 bg-black/30 px-4 py-4 leading-7"
                    placeholder="One stop sequence per line"
                    value={activeGoogle.stopSequences}
                    onChange={(event) =>
                      updateSelection({
                        google: { ...activeGoogle, stopSequences: event.target.value }
                      })
                    }
                  />
                </label>
              </>
            ) : (
              <>
                {activeOpenRouter.model === "custom" ? (
                  <label className="space-y-2 text-sm md:col-span-2">
                    <span className="text-mist/65">Custom Model ID</span>
                    <input
                      type="text"
                      placeholder="Example: deepseek/deepseek-r1:free"
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                      value={activeOpenRouter.customModel}
                      onChange={(event) =>
                        updateSelection({
                          openrouter: { ...activeOpenRouter, customModel: event.target.value }
                        })
                      }
                    />
                  </label>
                ) : null}
                <label className="space-y-2 text-sm">
                  <span className="text-mist/65">JSON Mode</span>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                    value={activeOpenRouter.jsonMode ? "on" : "off"}
                    onChange={(event) =>
                      updateSelection({
                        openrouter: {
                          ...activeOpenRouter,
                          jsonMode: event.target.value === "on"
                        }
                      })
                    }
                  >
                    <option value="off">Off</option>
                    <option value="on">On</option>
                  </select>
                </label>
                <NumberInput label="Temperature" value={activeOpenRouter.temperature} step={0.1} min={0} max={2} onChange={(value) => updateSelection({ openrouter: { ...activeOpenRouter, temperature: value } })} />
                <NumberInput label="Top P" value={activeOpenRouter.topP} step={0.05} min={0} max={1} onChange={(value) => updateSelection({ openrouter: { ...activeOpenRouter, topP: value } })} />
                <NumberInput label="Top K" value={activeOpenRouter.topK} step={1} min={0} onChange={(value) => updateSelection({ openrouter: { ...activeOpenRouter, topK: value } })} />
                <NumberInput label="Max Tokens" value={activeOpenRouter.maxTokens} step={1} min={1} onChange={(value) => updateSelection({ openrouter: { ...activeOpenRouter, maxTokens: value } })} />
                <NumberInput label="Frequency Penalty" value={activeOpenRouter.frequencyPenalty} step={0.1} min={-2} max={2} onChange={(value) => updateSelection({ openrouter: { ...activeOpenRouter, frequencyPenalty: value } })} />
                <NumberInput label="Presence Penalty" value={activeOpenRouter.presencePenalty} step={0.1} min={-2} max={2} onChange={(value) => updateSelection({ openrouter: { ...activeOpenRouter, presencePenalty: value } })} />
                <NumberInput label="Repetition Penalty" value={activeOpenRouter.repetitionPenalty} step={0.1} min={0} max={2} onChange={(value) => updateSelection({ openrouter: { ...activeOpenRouter, repetitionPenalty: value } })} />
                <NumberInput label="Min P" value={activeOpenRouter.minP} step={0.01} min={0} max={1} onChange={(value) => updateSelection({ openrouter: { ...activeOpenRouter, minP: value } })} />
                <NumberInput label="Top A" value={activeOpenRouter.topA} step={0.01} min={0} max={1} onChange={(value) => updateSelection({ openrouter: { ...activeOpenRouter, topA: value } })} />
                <label className="space-y-2 text-sm">
                  <span className="text-mist/65">Seed</span>
                  <input
                    type="number"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                    value={activeOpenRouter.seed ?? ""}
                    placeholder="optional"
                    onChange={(event) =>
                      updateSelection({
                        openrouter: {
                          ...activeOpenRouter,
                          seed: event.target.value ? Number(event.target.value) : null
                        }
                      })
                    }
                  />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-mist/65">Stop Sequences</span>
                  <textarea
                    className="min-h-20 w-full rounded-[1.6rem] border border-white/10 bg-black/30 px-4 py-4 leading-7"
                    placeholder="One stop sequence per line"
                    value={activeOpenRouter.stop}
                    onChange={(event) =>
                      updateSelection({
                        openrouter: { ...activeOpenRouter, stop: event.target.value }
                      })
                    }
                  />
                </label>
              </>
            )}
          </div>
        </Drawer>
      ) : null}
    </>
  );
}
