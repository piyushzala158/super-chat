import clsx from "clsx";

export function MetricCard({
  label,
  value,
  accent = "default"
}: {
  label: string;
  value: string;
  accent?: "default" | "warning";
}) {
  return (
    <div
      className={clsx(
        "rounded-3xl border border-white/10 bg-black/25 p-4",
        accent === "warning" && "border-coral/35 bg-coral/10"
      )}
    >
      <div className="text-xs uppercase tracking-[0.22em] text-mist/55">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}
