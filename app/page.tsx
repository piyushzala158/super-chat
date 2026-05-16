import Link from "next/link";
import { FeatureGrid } from "@/components/feature-grid";
import { SectionCard } from "@/components/section-card";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
      <section className="relative overflow-hidden rounded-[2.6rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-8 shadow-glow md:p-10">
        <div className="bg-grid absolute inset-0 opacity-15" />
        <div className="absolute -left-14 top-20 h-48 w-48 rounded-full bg-coral/15 blur-3xl" />
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan/15 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border border-coral/30 bg-coral/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-coral">
              Streaming UX Performance Lab
            </div>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold leading-[0.95] text-white md:text-7xl">
                See exactly where a chat experience starts to bend under load.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-mist/80 md:text-lg">
                This is not another glossy chatbot shell. It is a benchmark cockpit for streaming
                UI behavior, with live blame signals across provider latency, transport cadence,
                render throughput, memory drift, and backpressure.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/live"
                className="rounded-full bg-[linear-gradient(145deg,#d4ff6a,#9ef18f)] px-6 py-3 text-sm font-semibold text-ink transition hover:scale-[1.01]"
              >
                Try Live Benchmark
              </Link>
              <Link
                href="/stress"
                className="rounded-full border border-white/15 bg-black/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-coral/50 hover:bg-coral/10"
              >
                Run Stress Test
              </Link>
            </div>
            <div className="grid max-w-3xl gap-3 pt-2 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-mist/50">Diagnose</div>
                <div className="mt-2 text-lg font-semibold text-white">BE vs FE</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-mist/50">Measure</div>
                <div className="mt-2 text-lg font-semibold text-white">FPS + Queue Depth</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-mist/50">Compare</div>
                <div className="mt-2 text-lg font-semibold text-white">Providers + Models</div>
              </div>
            </div>
          </div>
          <SectionCard title="What This Feels Like" eyebrow="Control Room" className="border-cyan/20">
            <div className="space-y-4 text-sm text-mist/80">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                TTFT and first visible text are separated so you can see if the wait is provider-side or UI-side.
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                Charts explain trend direction instead of just plotting decorative lines.
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                Live markdown formatting keeps streaming answers readable while they arrive.
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                Advanced model settings stay tucked away until you actually need them.
              </div>
            </div>
          </SectionCard>
        </div>
      </section>

      <FeatureGrid />
    </main>
  );
}
