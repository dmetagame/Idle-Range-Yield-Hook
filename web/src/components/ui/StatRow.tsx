import type { ReactNode } from "react";

const cn = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

export function StatRow({
  label,
  value,
  hint,
  mono = true,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-6 py-3", className)}>
      <div className="text-[13px] text-neutral-300">{label}</div>
      <div className={cn("text-right text-[14px] text-neutral-50", mono && "font-mono tabular-nums")}>
        <div>{value}</div>
        {hint && <div className="mt-0.5 font-sans text-[12px] text-neutral-500">{hint}</div>}
      </div>
    </div>
  );
}
