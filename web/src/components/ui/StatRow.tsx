import type { ReactNode } from "react";

const cn = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

export function StatRow({
  label,
  value,
  hint,
  mono = true,
  emphasize,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  mono?: boolean;
  emphasize?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 py-2.5 text-sm",
        className,
      )}
    >
      <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted">{label}</div>
      <div
        className={cn(
          "text-right",
          mono && "font-mono",
          emphasize ? "text-text-primary" : "text-text-secondary",
        )}
      >
        <div>{value}</div>
        {hint && <div className="mt-0.5 text-[11px] font-sans text-text-faint">{hint}</div>}
      </div>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border-subtle">{children}</div>;
}

export function BigStat({
  label,
  value,
  delta,
  deltaTone = "muted",
}: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  deltaTone?: "positive" | "negative" | "muted";
}) {
  const deltaColor =
    deltaTone === "positive"
      ? "text-positive bg-accent-mint/10"
      : deltaTone === "negative"
        ? "text-negative bg-negative/10"
        : "text-text-muted bg-white/[0.04]";
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted">{label}</div>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="font-mono text-3xl font-semibold tracking-tight text-text-primary">
          {value}
        </span>
        {delta && (
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", deltaColor)}>
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
