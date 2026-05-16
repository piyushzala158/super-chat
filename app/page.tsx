import Link from "next/link";
import { FeatureGrid } from "@/components/feature-grid";
import { SectionCard } from "@/components/section-card";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-glow">
        <div className="bg-grid absolute inset-0 opacity-20" />
        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border border-cyan/30 bg-cyan/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-cyan">
              Frontend-First AI Chat Benchmark
            </div>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-white md:text-6xl">
                Measure how your AI chat UI behaves when the stream gets real.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-mist/80 md:text-lg">
                Super Chat Benchmark visualizes model latency, backend timing, chunk cadence,
                FPS, queue depth, memory growth, and backpressure inside one polished Next.js
                experience.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/live"
                className="rounded-full bg-lime px-6 py-3 text-sm font-semibold text-ink transition hover:scale-[1.01]"
              >
                Try Live Benchmark
              </Link>
              <Link
                href="/stress"
                className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-cyan/50 hover:bg-cyan/10"
              >
                Run Stress Test
              </Link>
            </div>
          </div>
          <SectionCard title="What You Can Prove" eyebrow="Benchmark DNA">
            <ul className="space-y-3 text-sm text-mist/80">
              <li>TTFT and first visible text are tracked separately.</li>
              <li>Real Gemini and synthetic stress runs share one rendering pipeline.</li>
              <li>Virtualized transcript rendering stays usable under long output.</li>
              <li>Queue growth, stalled gaps, and backpressure are shown live.</li>
              <li>Reports can be exported as JSON and revisited locally.</li>
            </ul>
          </SectionCard>
        </div>
      </section>

      <FeatureGrid />
    </main>
  );
}
