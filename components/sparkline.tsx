type Tone = "cyan" | "lime" | "coral";

const strokeMap: Record<Tone, string> = {
  cyan: "#6ff3ff",
  lime: "#d4ff6a",
  coral: "#ff7a66"
};

export function Sparkline({
  title,
  values,
  tone = "cyan"
}: {
  title: string;
  values: number[];
  tone?: Tone;
}) {
  const safeValues = values.slice(-36);
  const max = Math.max(...safeValues, 1);
  const min = Math.min(...safeValues, 0);
  const range = max - min || 1;
  const points = safeValues
    .map((value, index) => {
      const x = (index / Math.max(1, safeValues.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
      <div className="mb-3 text-xs uppercase tracking-[0.2em] text-mist/55">{title}</div>
      <svg viewBox="0 0 100 100" className="h-24 w-full overflow-visible">
        <polyline
          fill="none"
          stroke={strokeMap[tone]}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
      </svg>
    </div>
  );
}
