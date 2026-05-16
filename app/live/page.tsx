import { BenchmarkExperience } from "@/components/benchmark-experience";

export default function LivePage() {
  return (
    <BenchmarkExperience
      mode="live"
      title="Live Benchmark"
      description="Benchmark real Gemini streaming with a split view for transcript, timing, throughput, FPS, memory, and backpressure."
    />
  );
}
