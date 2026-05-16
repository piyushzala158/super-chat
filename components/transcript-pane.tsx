"use client";

import { useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SectionCard } from "@/components/section-card";
import { useFormatAnalyzer } from "@/hooks/use-format-analyzer";

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
};

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
  const latestAssistant = messages.findLast((message) => message.role === "assistant");
  const analysis = useFormatAnalyzer(latestAssistant?.content ?? "");

  const rows = useMemo<RenderRow[]>(() => {
    return messages.flatMap((message) => {
      const parts =
        message.role === "assistant"
          ? message.content.split(/\n\n+/).filter(Boolean)
          : [message.content];

      return parts.map((part, index) => ({
        key: `${message.id}-${index}`,
        role: message.role,
        content: part,
        markdown:
          message.role === "assistant" &&
          !message.streaming &&
          !analysis.heavy &&
          (part.includes("#") || part.includes("|") || part.includes("```"))
      }));
    });
  }, [analysis.heavy, messages]);

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
        className="h-[62vh] overflow-auto rounded-[1.5rem] border border-white/10 bg-black/20 p-3"
      >
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
                      ? "ml-auto max-w-[82%] border-lime/30 bg-lime/10"
                      : "max-w-[90%] border-white/10 bg-white/5"
                  }`}
                >
                  {row.markdown ? (
                    <div className="prose-benchmark">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{row.content}</ReactMarkdown>
                    </div>
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
      </div>
      {analysis.heavy ? (
        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-coral/85">
          Heavy formatting detected. Markdown rendering is deferred to preserve responsiveness.
        </p>
      ) : null}
    </SectionCard>
  );
}
