"use client";

import { formatUnits } from "viem";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import { Card } from "@/components/ui/Card";
import { BigStat } from "@/components/ui/StatRow";

const fmt = (v: bigint, max = 4) =>
  Number(formatUnits(v, 18)).toLocaleString(undefined, { maximumFractionDigits: max });

export type PositionBar = {
  t: number;
  value: number;
};

export function YourPositionCard({
  userShares,
  claim0,
  claim1,
  bars,
}: {
  userShares: bigint;
  claim0: bigint;
  claim1: bigint;
  bars: PositionBar[];
}) {
  const hasBars = bars.length > 0;
  const total = claim0 + claim1;
  return (
    <Card className="overflow-hidden">
      <div className="grid gap-6 px-6 py-6 sm:grid-cols-[1.1fr_2fr]">
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-muted">
              Your position
            </div>
            <div className="mt-1 text-sm font-medium text-text-primary">
              ERC-6909 shares + claim
            </div>
          </div>

          <BigStat label="Shares held" value={userShares > 0n ? fmt(userShares, 0) : "0"} />

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Mini label="Claim token0" value={fmt(claim0)} />
            <Mini label="Claim token1" value={fmt(claim1)} />
          </div>

          <div className="text-[11px] text-text-faint">
            Total claim · {fmt(total)} (token0 + token1, raw)
          </div>
        </div>

        <div className="flex h-48 flex-col">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-muted">
              Claim composition · live snapshots
            </div>
          </div>
          {hasBars ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="positionBarFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-mint)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--accent-teal)" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <Tooltip
                  cursor={{ fill: "rgba(61,255,142,0.06)" }}
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--text-primary)",
                  }}
                  labelFormatter={(t) => new Date(Number(t) * 1000).toLocaleTimeString()}
                  formatter={(value) => [
                    Number(value as number).toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    }),
                    "claim total",
                  ]}
                />
                <Bar dataKey="value" radius={[6, 6, 2, 2]} isAnimationActive={false}>
                  {bars.map((_, i) => (
                    <Cell key={i} fill="url(#positionBarFill)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border-subtle text-center">
              <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
                No snapshots yet
              </div>
              <p className="max-w-xs text-[11px] text-text-faint">
                Bars appear as the on-chain reserve reads land on this session.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-text-faint">{label}</div>
      <div className="mt-0.5 font-mono text-base text-text-primary">{value}</div>
    </div>
  );
}
