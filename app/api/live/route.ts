import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { encodeSseEvent } from "@/lib/sse";
import type {
  BackendTiming,
  GoogleLiveConfig,
  LiveProvider,
  OpenRouterLiveConfig
} from "@/lib/types";

type RequestBody = {
  provider: LiveProvider;
  prompt: string;
  preset: string;
  googleConfig?: GoogleLiveConfig;
  openrouterConfig?: OpenRouterLiveConfig;
};

export const runtime = "nodejs";

function toStopArray(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSeed(value: number | null | undefined) {
  return value === null || Number.isNaN(value) ? undefined : value;
}

export async function POST(request: Request) {
  const routeStart = performance.now();
  const body = (await request.json()) as Partial<RequestBody>;

  if (!body.provider || !body.prompt) {
    return NextResponse.json({ error: "Provider and prompt are required." }, { status: 400 });
  }

  const provider = body.provider;
  const prompt = body.prompt;
  const preset = body.preset ?? "custom";
  const startedAt = Date.now();
  const sessionId = crypto.randomUUID();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const timing: BackendTiming = {
        provider,
        requestValidationMs: performance.now() - routeStart,
        providerStartMs: 0,
        providerFirstChunkMs: null,
        providerCompleteMs: null,
        transformOverheadMs: 0,
        avgFlushIntervalMs: null,
        chunkCount: 0
      };

      let flushGapTotal = 0;
      let flushGapCount = 0;
      let selectedModel = "unknown";

      const markFlush = (lastFlush: number) => {
        const now = performance.now();
        flushGapTotal += now - lastFlush;
        flushGapCount += 1;
        timing.avgFlushIntervalMs = flushGapTotal / flushGapCount;
        return now;
      };

      try {
        if (provider === "google-ai-studio") {
          const config = body.googleConfig;
          const apiKey = config?.apiKey?.trim() || process.env.GEMINI_API_KEY;

          if (!config || !apiKey || !config.model) {
            throw new Error("Google AI Studio needs an API key and model.");
          }

          selectedModel = config.model;
          controller.enqueue(
            encoder.encode(
              encodeSseEvent("session_start", {
                sessionId,
                mode: "live",
                provider,
                model: selectedModel,
                preset,
                startedAt
              })
            )
          );

          const ai = new GoogleGenAI({ apiKey });
          const providerStart = performance.now();
          timing.providerStartMs = providerStart - routeStart;

          const response = await ai.models.generateContentStream({
            model: config.model,
            contents: prompt,
            config: {
              systemInstruction: config.systemInstruction || undefined,
              temperature: config.temperature,
              topP: config.topP,
              topK: config.topK,
              maxOutputTokens: config.maxOutputTokens,
              candidateCount: config.candidateCount,
              stopSequences: toStopArray(config.stopSequences),
              seed: normalizeSeed(config.seed),
              responseMimeType: config.responseMimeType,
              presencePenalty: config.presencePenalty,
              frequencyPenalty: config.frequencyPenalty
            }
          });

          let sequence = 0;
          let lastFlush = performance.now();
          let characters = 0;

          for await (const chunk of response) {
            const transformStart = performance.now();
            const delta = chunk.text ?? "";
            if (!delta) continue;

            if (timing.providerFirstChunkMs === null) {
              timing.providerFirstChunkMs = performance.now() - routeStart;
            }

            sequence += 1;
            characters += delta.length;
            timing.chunkCount += 1;

            controller.enqueue(
              encoder.encode(
                encodeSseEvent("chunk", {
                  sequence,
                  delta,
                  serverTimestamp: Date.now()
                })
              )
            );

            lastFlush = markFlush(lastFlush);
            timing.transformOverheadMs += performance.now() - transformStart;
          }

          timing.providerCompleteMs = performance.now() - routeStart;
          controller.enqueue(
            encoder.encode(
              encodeSseEvent("metric", {
                backendTiming: timing
              })
            )
          );
          controller.enqueue(
            encoder.encode(
              encodeSseEvent("session_end", {
                completedAt: Date.now(),
                backendTiming: timing,
                completionStatus: "ok",
                outputCharacters: characters
              })
            )
          );
        } else {
          const config = body.openrouterConfig;
          const apiKey = config?.apiKey?.trim() || process.env.OPENROUTER_API_KEY;
          const model =
            config?.model === "custom"
              ? config.customModel.trim()
              : config?.model?.trim() || "openrouter/free";

          if (!config || !apiKey || !model) {
            throw new Error("OpenRouter needs an API key and model.");
          }

          selectedModel = model;
          controller.enqueue(
            encoder.encode(
              encodeSseEvent("session_start", {
                sessionId,
                mode: "live",
                provider,
                model,
                preset,
                startedAt
              })
            )
          );

          const providerStart = performance.now();
          timing.providerStartMs = providerStart - routeStart;

          const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://super-chat.local",
              "X-Title": "Super Chat Benchmark"
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: prompt }],
              stream: true,
              temperature: config.temperature,
              top_p: config.topP,
              top_k: config.topK,
              max_tokens: config.maxTokens,
              frequency_penalty: config.frequencyPenalty,
              presence_penalty: config.presencePenalty,
              repetition_penalty: config.repetitionPenalty,
              min_p: config.minP,
              top_a: config.topA,
              seed: normalizeSeed(config.seed),
              stop: toStopArray(config.stop),
              response_format: config.jsonMode ? { type: "json_object" } : undefined
            })
          });

          if (!upstream.ok || !upstream.body) {
            const errorBody = (await upstream.json().catch(() => null)) as
              | { error?: { message?: string } }
              | null;
            throw new Error(
              errorBody?.error?.message ??
                `OpenRouter request failed with status ${upstream.status}.`
            );
          }

          let sequence = 0;
          let characters = 0;
          let lastFlush = performance.now();
          let buffer = "";
          const reader = upstream.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let separatorIndex = buffer.indexOf("\n\n");
            while (separatorIndex !== -1) {
              const rawEvent = buffer.slice(0, separatorIndex);
              buffer = buffer.slice(separatorIndex + 2);
              separatorIndex = buffer.indexOf("\n\n");

              const dataLines = rawEvent
                .split("\n")
                .filter((line) => line.startsWith("data:"))
                .map((line) => line.replace(/^data:\s?/, "").trim());

              if (!dataLines.length) continue;
              const joined = dataLines.join("");
              if (joined === "[DONE]") continue;

              const payload = JSON.parse(joined) as {
                error?: { message?: string };
                model?: string;
                choices?: Array<{
                  finish_reason?: string | null;
                  delta?: { content?: string };
                }>;
              };

              if (payload.model) {
                selectedModel = payload.model;
              }

              if (payload.error?.message) {
                throw new Error(payload.error.message);
              }

              const delta = payload.choices?.[0]?.delta?.content ?? "";
              if (!delta) continue;

              if (timing.providerFirstChunkMs === null) {
                timing.providerFirstChunkMs = performance.now() - routeStart;
              }

              sequence += 1;
              characters += delta.length;
              timing.chunkCount += 1;

              controller.enqueue(
                encoder.encode(
                  encodeSseEvent("chunk", {
                    sequence,
                    delta,
                    serverTimestamp: Date.now()
                  })
                )
              );

              lastFlush = markFlush(lastFlush);
            }
          }

          timing.providerCompleteMs = performance.now() - routeStart;
          controller.enqueue(
            encoder.encode(
              encodeSseEvent("metric", {
                backendTiming: timing
              })
            )
          );
          controller.enqueue(
            encoder.encode(
              encodeSseEvent("session_end", {
                completedAt: Date.now(),
                backendTiming: timing,
                completionStatus: "ok",
                outputCharacters: characters
              })
            )
          );
        }
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            encodeSseEvent("error", {
              code: "live_stream_error",
              message:
                error instanceof Error ? error.message : "Live provider streaming failed."
            })
          )
        );
        controller.enqueue(
          encoder.encode(
            encodeSseEvent("session_end", {
              completedAt: Date.now(),
              backendTiming: timing,
              completionStatus: "error",
              outputCharacters: 0
            })
          )
        );
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
