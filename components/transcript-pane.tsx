"use client";

import { Profiler, useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SectionCard } from "@/components/section-card";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

type RenderRow = {
  key: string;
  role: "user" | "assistant";
  content: string;
  markdown: boolean;
  streaming: boolean;
};

type StreamingMarkdownCache = {
  source: string;
  stableLength: number;
  blocks: Array<{ key: string; content: string }>;
  nextBlockId: number;
  tail: string;
};

const BENCHMARK_PERF_DEBUG_KEY = "benchmark-debug-perf";
const LARGE_MARKDOWN_VIRTUALIZE_THRESHOLD = 80000;
const VIRTUAL_MARKDOWN_BLOCK_SIZE = 6000;

function isBenchmarkPerfDebugEnabled() {
  if (typeof window === "undefined") return false;
  return (
    window.localStorage.getItem(BENCHMARK_PERF_DEBUG_KEY) === "1" ||
    window.location.search.includes("benchmarkDebug=1")
  );
}

function findStableMarkdownBoundary(content: string) {
  const lastParagraphBoundary = content.lastIndexOf("\n\n");
  if (lastParagraphBoundary === -1) return 0;

  let stableLength = lastParagraphBoundary + 2;
  const stableSlice = content.slice(0, stableLength);
  const fenceCount = (stableSlice.match(/```/g) ?? []).length;

  if (fenceCount % 2 === 0) {
    return stableLength;
  }

  const lastFenceStart = stableSlice.lastIndexOf("\n```");
  if (lastFenceStart > 0) {
    stableLength = lastFenceStart + 1;
  } else {
    stableLength = 0;
  }

  return stableLength;
}

function rebuildStreamingCache(messageKey: string, content: string) {
  const stableLength = findStableMarkdownBoundary(content);
  const stableContent = content.slice(0, stableLength);

  return {
    source: content,
    stableLength,
    blocks: stableContent
      ? [
          {
            key: `${messageKey}-stable-0`,
            content: stableContent
          }
        ]
      : [],
    nextBlockId: stableContent ? 1 : 0,
    tail: content.slice(stableLength)
  } satisfies StreamingMarkdownCache;
}

function splitMarkdownIntoBlocks(content: string, targetSize = VIRTUAL_MARKDOWN_BLOCK_SIZE) {
  if (!content) return [];
  const blocks: string[] = [];
  let cursor = 0;

  while (cursor < content.length) {
    const hardStop = Math.min(cursor + targetSize, content.length);
    let splitAt = content.lastIndexOf("\n\n", hardStop);
    if (splitAt <= cursor) {
      splitAt = hardStop;
    } else {
      splitAt += 2;
    }
    blocks.push(content.slice(cursor, splitAt));
    cursor = splitAt;
  }

  return blocks;
}

function VirtualizedMarkdown({
  messageKey,
  content
}: {
  messageKey: string;
  content: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const profilerEventCountRef = useRef(0);
  const blocks = useMemo(() => splitMarkdownIntoBlocks(content), [content]);
  const virtualizer = useVirtualizer({
    count: blocks.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 280,
    overscan: 5
  });
  const handleProfilerRender = (
    id: string,
    phase: "mount" | "update" | "nested-update",
    actualDuration: number,
    baseDuration: number
  ) => {
    if (!isBenchmarkPerfDebugEnabled()) return;
    profilerEventCountRef.current += 1;

    if (actualDuration < 6 && profilerEventCountRef.current > 5 && profilerEventCountRef.current % 20 !== 0) {
      return;
    }

    console.debug("[benchmark][markdown-render]", {
      id,
      phase,
      actualDurationMs: Number(actualDuration.toFixed(3)),
      baseDurationMs: Number(baseDuration.toFixed(3)),
      blockCount: blocks.length,
      contentChars: content.length,
      mode: "virtualized"
    });
  };

  return (
    <Profiler id={`VirtualizedMarkdown:${messageKey}`} onRender={handleProfilerRender}>
      <div
        ref={containerRef}
        className="max-h-[62vh] overflow-auto rounded-2xl border border-white/10 bg-black/20 p-2"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: "relative"
          }}
        >
          {virtualizer.getVirtualItems().map((item) => {
            const block = blocks[item.index] ?? "";
            return (
              <div
                key={`${messageKey}-block-${item.index}`}
                data-index={item.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${item.start}px)`
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{block}</ReactMarkdown>
              </div>
            );
          })}
        </div>
      </div>
    </Profiler>
  );
}

function StreamingAssistantContent({
  messageKey,
  content
}: {
  messageKey: string;
  content: string;
}) {
  const cacheRef = useRef<StreamingMarkdownCache>({
    source: "",
    stableLength: 0,
    blocks: [],
    nextBlockId: 0,
    tail: ""
  });
  const profilerEventCountRef = useRef(0);

  const cache = cacheRef.current;
  const debugPerf = isBenchmarkPerfDebugEnabled();

  if (content !== cache.source) {
    const prepareStart = performance.now();
    const isAppendOnly = content.startsWith(cache.source);
    const previousStableLength = cache.stableLength;
    const nextStableLength = findStableMarkdownBoundary(content);

    if (!isAppendOnly || nextStableLength < cache.stableLength) {
      cacheRef.current = rebuildStreamingCache(messageKey, content);
    } else {
      const appendedStable = content.slice(cache.stableLength, nextStableLength);
      if (appendedStable) {
        cache.blocks.push({
          key: `${messageKey}-stable-${cache.nextBlockId++}`,
          content: appendedStable
        });
      }
      cache.source = content;
      cache.stableLength = nextStableLength;
      cache.tail = content.slice(nextStableLength);
    }

    const nextCache = cacheRef.current;
    const prepareMs = performance.now() - prepareStart;

    if (
      debugPerf &&
      (prepareMs > 2 ||
        nextCache.blocks.length <= 3 ||
        nextCache.blocks.length % 25 === 0 ||
        content.length >= 100000)
    ) {
      console.debug("[benchmark][markdown-stream]", {
        messageKey,
        appendOnly: isAppendOnly,
        contentChars: content.length,
        stableChars: nextCache.stableLength,
        tailChars: nextCache.tail.length,
        blockCount: nextCache.blocks.length,
        parsedCharsThisUpdate: isAppendOnly
          ? nextStableLength - previousStableLength
          : nextCache.stableLength,
        prepareMs: Number(prepareMs.toFixed(3))
      });
    }
  }

  const handleProfilerRender = (
    id: string,
    phase: "mount" | "update" | "nested-update",
    actualDuration: number,
    baseDuration: number
  ) => {
    if (!isBenchmarkPerfDebugEnabled()) return;
    profilerEventCountRef.current += 1;

    if (actualDuration < 6 && profilerEventCountRef.current > 5 && profilerEventCountRef.current % 20 !== 0) {
      return;
    }

    console.debug("[benchmark][markdown-render]", {
      id,
      phase,
      actualDurationMs: Number(actualDuration.toFixed(3)),
      baseDurationMs: Number(baseDuration.toFixed(3)),
      contentChars: content.length,
      stableChars: cacheRef.current.stableLength,
      tailChars: cacheRef.current.tail.length,
      blockCount: cacheRef.current.blocks.length,
      mode: "streaming"
    });
  };

  return (
    <Profiler id={`StreamingMarkdown:${messageKey}`} onRender={handleProfilerRender}>
      <div className="prose-benchmark">
        {cacheRef.current.blocks.map((block) => (
          <ReactMarkdown key={block.key} remarkPlugins={[remarkGfm]}>
            {block.content}
          </ReactMarkdown>
        ))}
        {cacheRef.current.tail ? (
          <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-mist/88">
            {cacheRef.current.tail}
          </pre>
        ) : null}
      </div>
    </Profiler>
  );
}

export function TranscriptPane({
  messages,
  status,
  autoscroll,
  onAutoscrollChange
}: {
  messages: Message[];
  status: "idle" | "running" | "done" | "error";
  autoscroll: boolean;
  onAutoscrollChange: (value: boolean) => void;
  }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const profilerEventCountRef = useRef(0);

  const rows = useMemo<RenderRow[]>(() => {
    return messages.map((message) => ({
      key: message.id,
      role: message.role,
      content: message.content,
      streaming: Boolean(message.streaming),
      markdown: message.role === "assistant"
    }));
  }, [messages]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 128,
    overscan: 8
  });

  useEffect(() => {
    if (autoscroll && rows.length > 0) {
      virtualizer.scrollToIndex(rows.length - 1, { align: "end" });
    }
  }, [autoscroll, rows.length, virtualizer]);

  const handleProfilerRender = (
    id: string,
    phase: "mount" | "update" | "nested-update",
    actualDuration: number,
    baseDuration: number
  ) => {
    if (!isBenchmarkPerfDebugEnabled()) return;
    profilerEventCountRef.current += 1;

    if (
      actualDuration < 8 &&
      profilerEventCountRef.current > 5 &&
      profilerEventCountRef.current % 20 !== 0
    ) {
      return;
    }

    console.debug("[benchmark][react-render]", {
      id,
      phase,
      actualDurationMs: Number(actualDuration.toFixed(3)),
      baseDurationMs: Number(baseDuration.toFixed(3)),
      rows: rows.length
    });
  };

  return (
    <SectionCard title="Transcript" eyebrow="Streaming View">
      <div className="mb-4 flex items-center justify-between text-sm text-mist/68">
        <div>
          Status: <span className="text-white">{status}</span>
        </div>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoscroll}
            onChange={(event) => onAutoscrollChange(event.target.checked)}
          />
          Autoscroll
        </label>
      </div>
      <div
        ref={parentRef}
        className="h-[62vh] overflow-auto rounded-[1.8rem] border border-white/10 bg-black/20 p-3"
      >
        <Profiler id="TranscriptRows" onRender={handleProfilerRender}>
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: "relative"
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <div
                  key={row.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="absolute left-0 top-0 w-full px-2 py-2"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                >
                  <article
                    className={`rounded-3xl border px-4 py-4 ${
                      row.role === "user"
                        ? "ml-auto max-w-[82%] border-lime/30 bg-[linear-gradient(145deg,rgba(212,255,106,0.18),rgba(212,255,106,0.08))]"
                        : "max-w-[90%] border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]"
                    }`}
                  >
                    {row.markdown ? (
                      row.streaming ? (
                        <StreamingAssistantContent messageKey={row.key} content={row.content} />
                      ) : row.content.length >= LARGE_MARKDOWN_VIRTUALIZE_THRESHOLD ? (
                        <VirtualizedMarkdown messageKey={row.key} content={row.content} />
                      ) : (
                        <div className="prose-benchmark">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{row.content}</ReactMarkdown>
                        </div>
                      )
                    ) : (
                      <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-mist/88">
                        {row.content}
                      </pre>
                    )}
                  </article>
                </div>
              );
            })}
          </div>
        </Profiler>
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-cyan/80">
        Assistant markdown is rendered live while the stream is still arriving.
      </p>
    </SectionCard>
  );
}
