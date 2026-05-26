const cn = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

export function TickRangeMini({
  lower,
  upper,
  current,
  className,
}: {
  lower: number;
  upper: number;
  /** undefined = unknown yet. */
  current: number | undefined;
  className?: string;
}) {
  const inRange =
    current !== undefined && Number.isFinite(current) && current >= lower && current < upper;
  const span = upper - lower;
  const pctRaw = current === undefined ? 0.5 : (current - lower) / span;
  const pct = Math.max(0, Math.min(1, pctRaw));
  const outside = current !== undefined && (current < lower || current >= upper);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-2 w-full overflow-visible rounded-full bg-white/[0.05]">
        {/* In-range band */}
        <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-gradient-to-r from-accent-mint/30 via-accent-mint/40 to-accent-teal/30" />
        {/* current tick marker */}
        {current !== undefined && (
          <div
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-bg-card"
            style={{
              left: outside ? (current < lower ? "0%" : "100%") : `${pct * 100}%`,
              background: outside ? "var(--warning)" : "var(--accent-mint)",
              boxShadow: outside
                ? "0 0 10px var(--warning)"
                : "0 0 10px var(--accent-mint-glow)",
            }}
          />
        )}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-text-faint">
        <span>{lower}</span>
        <span className={inRange ? "text-accent-mint" : "text-text-muted"}>
          {current === undefined ? "tick · ?" : `tick · ${current}`}
        </span>
        <span>{upper}</span>
      </div>
    </div>
  );
}
