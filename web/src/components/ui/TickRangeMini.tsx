const cn = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

/**
 * Inline horizontal range visualization. Used in LiveState below the chart.
 * Flat, no glow — just a 1px range bar + a dot for the current tick.
 */
export function TickRangeMini({
  lower,
  upper,
  current,
  className,
}: {
  lower: number;
  upper: number;
  current: number | undefined;
  className?: string;
}) {
  const span = upper - lower;
  const pctRaw = current === undefined ? 0.5 : (current - lower) / span;
  const pct = Math.max(0, Math.min(1, pctRaw));
  const outside = current !== undefined && (current < lower || current >= upper);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="font-mono text-[12px] text-neutral-500">{lower}</span>
      <div className="relative h-px flex-1 bg-neutral-700">
        {current !== undefined && (
          <div
            className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: outside ? (current < lower ? "0%" : "100%") : `${pct * 100}%`,
              background: outside ? "var(--negative)" : "var(--accent)",
            }}
          />
        )}
      </div>
      <span className="font-mono text-[12px] text-neutral-500">{upper}</span>
    </div>
  );
}
