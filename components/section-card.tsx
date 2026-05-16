import clsx from "clsx";

export function SectionCard({
  title,
  eyebrow,
  children,
  className
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-glow",
        className
      )}
    >
      {(eyebrow || title) && (
        <header className="mb-5 space-y-2">
          {eyebrow ? (
            <div className="text-xs uppercase tracking-[0.26em] text-cyan/80">{eyebrow}</div>
          ) : null}
          <h2 className="text-xl font-semibold text-white">{title}</h2>
        </header>
      )}
      {children}
    </section>
  );
}
