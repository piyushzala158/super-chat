import { BenchmarkExperience } from "@/components/benchmark-experience";

export default function StressPage() {
  return (
    <BenchmarkExperience
      mode="synthetic"
      title="Stress Lab"
      description="Run reproducible frontend stress streams without depending on provider variability."
    />
  );
}
