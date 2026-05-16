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
        "panel-noise rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-glow backdrop-blur-sm",
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
