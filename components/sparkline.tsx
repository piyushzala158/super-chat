type Tone = "cyan" | "lime" | "coral";

const strokeMap: Record<Tone, string> = {
  cyan: "#6ff3ff",
  lime: "#d4ff6a",
  coral: "#ff7a66"
};

export function Sparkline({
  title,
  values,
  tone = "cyan",
  summary,
  benchmark
}: {
  title: string;
  values: number[];
  tone?: Tone;
  summary?: string;
  benchmark?: string;
}) {
  const safeValues = values.slice(-36);
  const max = Math.max(...safeValues, 1);
  const min = Math.min(...safeValues, 0);
  const range = max - min || 1;
  const mid = min + range / 2;
  const points = safeValues
    .map((value, index) => {
      const x = (index / Math.max(1, safeValues.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.2em] text-mist/55">{title}</div>
        {benchmark ? <div className="text-[11px] text-cyan/80">{benchmark}</div> : null}
      </div>
      <div className="grid grid-cols-[56px_1fr] gap-3">
        <div className="flex h-24 flex-col justify-between text-[11px] text-mist/52">
          <span>{max.toFixed(1)}</span>
          <span>{mid.toFixed(1)}</span>
          <span>{min.toFixed(1)}</span>
        </div>
        <svg viewBox="0 0 100 100" className="h-24 w-full overflow-visible">
          <line x1="0" y1="0" x2="100" y2="0" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <line x1="0" y1="100" x2="100" y2="100" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
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
      {summary ? <p className="mt-2 text-xs leading-5 text-mist/68">{summary}</p> : null}
    </div>
  );
}
