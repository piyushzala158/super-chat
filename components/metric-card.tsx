import clsx from "clsx";

export function MetricCard({
  label,
  value,
  accent = "default",
  benchmark,
  helper
}: {
  label: string;
  value: string;
  accent?: "default" | "warning" | "success";
  benchmark?: string;
  helper?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-3xl border border-white/10 bg-black/25 p-4",
        accent === "warning" && "border-coral/35 bg-coral/10",
        accent === "success" && "border-lime/35 bg-lime/10"
      )}
    >
      <div className="text-xs uppercase tracking-[0.22em] text-mist/55">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {benchmark ? <div className="mt-2 text-xs text-cyan/80">Target: {benchmark}</div> : null}
      {helper ? <div className="mt-2 text-xs leading-5 text-mist/70">{helper}</div> : null}
    </div>
  );
}
