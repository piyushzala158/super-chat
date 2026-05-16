import { SectionCard } from "@/components/section-card";

const cards = [
  {
    title: "Latency Breakdown",
    copy: "Separate provider, network, and frontend timing so the bottleneck is obvious."
  },
  {
    title: "Backpressure Detection",
    copy: "Track queue growth and apply rate so you can see when the UI falls behind the stream."
  },
  {
    title: "Long-Session Stability",
    copy: "Measure FPS, heap growth, DOM count, and dropped frames during extended streams."
  },
  {
    title: "Synthetic Stress Lab",
    copy: "Reproduce chunk storms, giant code blocks, and transcript pressure without live API noise."
  }
];

export function FeatureGrid() {
  return (
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <SectionCard key={card.title} title={card.title}>
          <p className="text-sm leading-7 text-mist/75">{card.copy}</p>
        </SectionCard>
      ))}
    </section>
  );
}
