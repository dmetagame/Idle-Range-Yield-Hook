"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ReservePoint = {
  /** epoch seconds */
  t: number;
  reserve0: number;
  reserve1: number;
  total: number;
};

export function ReserveChart({ data }: { data: ReservePoint[] }) {
  const hasData = data.length > 0;
  return (
    <div className="relative h-64 w-full">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="reserveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-mint)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--accent-mint)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t) =>
                new Date(Number(t) * 1000).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              }
              stroke="rgba(255,255,255,0.16)"
              tick={{ fill: "var(--text-faint)", fontSize: 10, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="total"
              stroke="rgba(255,255,255,0.16)"
              tick={{ fill: "var(--text-faint)", fontSize: 10, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              domain={["auto", "auto"]}
              width={56}
              tickFormatter={(v) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 3 })}
            />
            <Tooltip
              cursor={{ stroke: "rgba(61,255,142,0.3)", strokeDasharray: "3 3" }}
              contentStyle={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--text-primary)",
              }}
              labelFormatter={(t) => new Date(Number(t) * 1000).toLocaleString()}
              formatter={(value) => [
                Number(value as number).toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                }),
                "total reserve",
              ]}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--accent-mint)"
              strokeWidth={2}
              fill="url(#reserveFill)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-subtle text-center">
          <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
            Awaiting first read
          </div>
          <p className="max-w-xs text-[12px] text-text-faint">
            The chart fills in as on-chain reads land. Live since this session — no fake history.
          </p>
        </div>
      )}
    </div>
  );
}
