import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { encodeSseEvent } from "@/lib/sse";
import type { BackendTiming } from "@/lib/types";

type RequestBody = {
  model: string;
  prompt: string;
  preset: string;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const routeStart = performance.now();
  const body = (await request.json()) as Partial<RequestBody>;

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY in the server environment." },
      { status: 500 }
    );
  }

  if (!body.model || !body.prompt) {
    return NextResponse.json({ error: "Model and prompt are required." }, { status: 400 });
  }

  const model = body.model;
  const prompt = body.prompt;
  const preset = body.preset ?? "custom";

  const startedAt = Date.now();
  const sessionId = crypto.randomUUID();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const timing: BackendTiming = {
        requestValidationMs: performance.now() - routeStart,
        providerStartMs: 0,
        providerFirstChunkMs: null,
        providerCompleteMs: null,
        transformOverheadMs: 0,
        flushIntervalMs: null,
        chunkCount: 0
      };

      try {
        controller.enqueue(
          encoder.encode(
            encodeSseEvent("session_start", {
              sessionId,
              mode: "live",
              model,
              preset,
              startedAt
            })
          )
        );

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const providerStart = performance.now();
        timing.providerStartMs = providerStart - routeStart;

        const response = await ai.models.generateContentStream({
          model,
          contents: prompt
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

          characters += delta.length;
          timing.chunkCount += 1;
          sequence += 1;

          controller.enqueue(
            encoder.encode(
              encodeSseEvent("chunk", {
                sequence,
                delta,
                serverTimestamp: Date.now()
              })
            )
          );

          const now = performance.now();
          timing.transformOverheadMs += now - transformStart;
          timing.flushIntervalMs = now - lastFlush;
          lastFlush = now;
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
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            encodeSseEvent("error", {
              code: "gemini_stream_error",
              message:
                error instanceof Error ? error.message : "Gemini streaming failed unexpectedly."
            })
          )
        );
        controller.enqueue(
          encoder.encode(
            encodeSseEvent("session_end", {
              completedAt: Date.now(),
              backendTiming: null,
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
