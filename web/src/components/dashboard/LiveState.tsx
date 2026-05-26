"use client";

import { useMemo, useState } from "react";
import { formatUnits, type Hex } from "viem";

import { TickRangeMini } from "@/components/ui/TickRangeMini";

import { ReserveChart, type ReservePoint } from "./ReserveChart";

type Status = "UNSET" | "ACTIVE_IN_RANGE" | "PARKED_OUT_OF_RANGE";

type Range = "1H" | "4H" | "1D" | "1W" | "1M";
const RANGES: Range[] = ["1H", "4H", "1D", "1W", "1M"];
const RANGE_SECONDS: Record<Range, number> = {
  "1H": 60 * 60,
  "4H": 4 * 60 * 60,
  "1D": 24 * 60 * 60,
  "1W": 7 * 24 * 60 * 60,
  "1M": 30 * 24 * 60 * 60,
};

const cn = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

const fmt = (v: bigint, max = 4) =>
  Number(formatUnits(v, 18)).toLocaleString(undefined, { maximumFractionDigits: max });

export function LiveState({
  status,
  reserve0,
  reserve1,
  currentTick,
  lowerTick,
  upperTick,
  series,
}: {
  poolId: Hex;
  status: Status;
  reserve0: bigint;
  reserve1: bigint;
  currentTick: number | undefined;
  lowerTick: number;
  upperTick: number;
  series: ReservePoint[];
}) {
  const [range, setRange] = useState<Range>("1D");
  const filtered = useMemo(() => {
    if (series.length < 2) return series;
    const cutoff = series[series.length - 1].t - RANGE_SECONDS[range];
    return series.filter((p) => p.t >= cutoff);
  }, [series, range]);

  const total = reserve0 + reserve1;

  return (
    <section id="live" className="mx-auto max-w-5xl px-6 pt-20 md:pt-32">
      <div className="mx-auto max-w-3xl">
        <div className="font-mono text-[12px] uppercase tracking-wide text-neutral-500">
          Live state
        </div>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
          <div className="flex items-baseline gap-4">
            <span className="font-mono text-[44px] font-semibold leading-none tracking-tight text-neutral-0 tabular-nums md:text-[56px]">
              {fmt(total)}
            </span>
            <div className="flex items-center gap-2 text-[13px]">
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  status === "ACTIVE_IN_RANGE"
                    ? "bg-accent"
                    : status === "PARKED_OUT_OF_RANGE"
                      ? "bg-neutral-300"
                      : "bg-neutral-500",
                )}
              />
              <span className="text-neutral-300">{status.replace(/_/g, " ")}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 font-mono text-[12px] uppercase tracking-wide">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "transition-colors duration-150",
                  range === r ? "text-neutral-0" : "text-neutral-500 hover:text-neutral-50",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <ReserveChart data={filtered} />
      </div>

      <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-between gap-x-8 gap-y-3 text-[13px] text-neutral-300">
        <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono tabular-nums">
          <span>{fmt(reserve0)} IY0</span>
          <span className="text-neutral-500">·</span>
          <span>{fmt(reserve1)} IY1</span>
        </div>
        <div className="min-w-[200px] flex-1 md:max-w-[280px]">
          <TickRangeMini lower={lowerTick} upper={upperTick} current={currentTick} />
        </div>
      </div>
    </section>
  );
}
