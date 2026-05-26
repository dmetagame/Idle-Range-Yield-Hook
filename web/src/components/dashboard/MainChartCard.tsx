"use client";

import { useMemo, useState } from "react";
import { formatUnits } from "viem";

import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { BigStat } from "@/components/ui/StatRow";
import { TimeRangePills, type TimeRange } from "@/components/ui/TimeRangePills";

import { ReserveChart, type ReservePoint } from "./ReserveChart";

const RANGE_SECONDS: Record<TimeRange, number> = {
  "1H": 60 * 60,
  "4H": 4 * 60 * 60,
  "1D": 24 * 60 * 60,
  "1W": 7 * 24 * 60 * 60,
  "1M": 30 * 24 * 60 * 60,
  "6M": 180 * 24 * 60 * 60,
};

const fmt = (v: bigint, max = 6) =>
  Number(formatUnits(v, 18)).toLocaleString(undefined, { maximumFractionDigits: max });

type Mode = "active" | "parked";

type Status = "UNSET" | "ACTIVE_IN_RANGE" | "PARKED_OUT_OF_RANGE";

export function MainChartCard({
  mode,
  status,
  reserve0,
  reserve1,
  series,
  right,
}: {
  mode: Mode;
  status: Status;
  reserve0: bigint;
  reserve1: bigint;
  series: ReservePoint[];
  /** Optional CTA in the header (e.g. "Accrue yield" button in parked mode). */
  right?: React.ReactNode;
}) {
  const [range, setRange] = useState<TimeRange>("1D");
  const filtered = useMemo(() => {
    if (series.length < 2) return series;
    const cutoff = series[series.length - 1].t - RANGE_SECONDS[range];
    return series.filter((p) => p.t >= cutoff);
  }, [series, range]);

  const first = filtered[0];
  const last = filtered[filtered.length - 1];
  const delta = first && last ? last.total - first.total : 0;
  const deltaPct = first && first.total > 0 ? (delta / first.total) * 100 : 0;
  const deltaPositive = delta >= 0;

  const total = reserve0 + reserve1;
  const statusTone: "mint" | "amber" | "muted" =
    status === "ACTIVE_IN_RANGE" ? "mint" : status === "PARKED_OUT_OF_RANGE" ? "amber" : "muted";

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-text-muted">
            <Pill tone={statusTone} dot active>
              {status.replace(/_/g, " ")}
            </Pill>
            <span>{mode === "active" ? "Reserve total · IY0 + IY1" : "Vault claim · IY0 + IY1"}</span>
          </div>
          <div className="mt-3">
            <BigStat
              label="Total"
              value={fmt(total)}
              delta={
                series.length < 2
                  ? "Awaiting reads"
                  : `${deltaPositive ? "+" : ""}${deltaPct.toFixed(2)}%`
              }
              deltaTone={
                series.length < 2 ? "muted" : deltaPositive ? "positive" : "negative"
              }
            />
            <div className="mt-1 text-[12px] text-text-muted">
              {fmt(reserve0)} t0 · {fmt(reserve1)} t1
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          {right}
          <TimeRangePills value={range} onChange={setRange} />
        </div>
      </div>

      <div className="px-2 pb-2 pt-6 sm:px-4">
        <ReserveChart data={filtered} />
      </div>
    </Card>
  );
}
