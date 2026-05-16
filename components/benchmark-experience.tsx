"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BenchmarkControls } from "@/components/benchmark-controls";
import { DashboardPanel } from "@/components/dashboard-panel";
import { SectionCard } from "@/components/section-card";
import { TranscriptPane } from "@/components/transcript-pane";
import { useBenchmarkRunner } from "@/hooks/use-benchmark-runner";
import type { SessionMode } from "@/lib/types";

export function BenchmarkExperience({
  mode,
  title,
  description
}: {
  mode: SessionMode;
  title: string;
  description: string;
}) {
  const router = useRouter();
  const [autoscroll, setAutoscroll] = useState(true);
  const runner = useBenchmarkRunner({ mode });

  const controlsLabel = useMemo(
    () =>
      mode === "live"
        ? runner.selection.provider === "google-ai-studio"
          ? "Google AI Studio Config"
          : "OpenRouter Config"
        : "Synthetic Stress Config",
    [mode, runner.selection.provider]
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 md:px-10">
      <section className="grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
        <SectionCard title={title} eyebrow={mode === "live" ? "Realtime Gemini" : "Synthetic Replay"}>
          <p className="max-w-2xl text-sm leading-7 text-mist/78">{description}</p>
        </SectionCard>
        <BenchmarkControls
          title={controlsLabel}
          mode={mode}
          selection={runner.selection}
          updateSelection={runner.updateSelection}
          onStart={runner.start}
          onStop={runner.stop}
          isRunning={runner.status === "running"}
          error={runner.error}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <TranscriptPane
          messages={runner.messages}
          status={runner.status}
          autoscroll={autoscroll}
          onAutoscrollChange={setAutoscroll}
        />
        <DashboardPanel
          report={runner.report}
          status={runner.status}
          onViewReport={
            runner.report
              ? () => {
                  router.push(`/results/${runner.report!.session.id}`);
                }
              : undefined
          }
        />
      </section>
    </main>
  );
}
