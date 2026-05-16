import { NextResponse } from "next/server";
import { getStressPreset } from "@/lib/prompts";
import { encodeSseEvent } from "@/lib/sse";
import { createStressContent } from "@/lib/stress-content";
import type { BackendTiming } from "@/lib/types";

type RequestBody = {
  presetId: string;
  chunkSize?: number;
  chunkIntervalMs?: number;
  jitterPct?: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const routeStart = performance.now();
  const body = (await request.json()) as Partial<RequestBody>;
  const preset = getStressPreset(body.presetId ?? "long-markdown");
  const content = createStressContent(preset.id);
  const sessionId = crypto.randomUUID();
  const startedAt = Date.now();
  const chunkSize = body.chunkSize ?? preset.chunkSize;
  const chunkIntervalMs = body.chunkIntervalMs ?? preset.chunkIntervalMs;
  const jitterPct = body.jitterPct ?? preset.jitterPct;

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

      controller.enqueue(
        encoder.encode(
          encodeSseEvent("session_start", {
            sessionId,
            mode: "synthetic",
            model: "synthetic-generator",
            preset: preset.id,
            startedAt
          })
        )
      );

      let index = 0;
      let sequence = 0;
      let lastFlush = performance.now();

      while (index < content.length) {
        const delta = content.slice(index, index + chunkSize);
        index += chunkSize;
        sequence += 1;
        timing.chunkCount += 1;
        if (timing.providerFirstChunkMs === null) {
          timing.providerFirstChunkMs = performance.now() - routeStart;
        }

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
        timing.flushIntervalMs = now - lastFlush;
        lastFlush = now;

        const jitter = chunkIntervalMs * jitterPct;
        const waitMs = Math.max(
          4,
          Math.round(chunkIntervalMs + (Math.random() * jitter * 2 - jitter))
        );
        await sleep(waitMs);
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
            outputCharacters: content.length
          })
        )
      );
      controller.close();
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

export function GET() {
  return NextResponse.json({ ok: true });
}
