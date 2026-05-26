"use client";

import { Pill } from "./Pill";

export type TimeRange = "1H" | "4H" | "1D" | "1W" | "1M" | "6M";

const RANGES: TimeRange[] = ["1H", "4H", "1D", "1W", "1M", "6M"];

export function TimeRangePills({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (next: TimeRange) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-white/[0.02] p-1">
      {RANGES.map((r) => {
        const active = r === value;
        return (
          <Pill
            key={r}
            tone={active ? "mint" : "ghost"}
            active={active}
            onClick={() => onChange(r)}
            className="border-transparent px-3 py-1"
          >
            {r}
          </Pill>
        );
      })}
    </div>
  );
}
