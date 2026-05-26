"use client";

import {
  Area,
  AreaChart,
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
    <div className="relative h-72 w-full">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="reserveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              stroke="transparent"
              tick={{ fill: "var(--neutral-500)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis
              dataKey="total"
              stroke="transparent"
              tick={{ fill: "var(--neutral-500)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              domain={["auto", "auto"]}
              width={56}
              tickFormatter={(v) =>
                Number(v).toLocaleString(undefined, { maximumFractionDigits: 3 })
              }
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.16)" }}
              contentStyle={{
                background: "var(--neutral-900)",
                border: "1px solid var(--neutral-700)",
                borderRadius: 12,
                fontSize: 12,
                color: "var(--neutral-0)",
                padding: "8px 12px",
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
              stroke="var(--accent)"
              strokeWidth={1.5}
              fill="url(#reserveFill)"
              dot={false}
              activeDot={{
                r: 3,
                fill: "var(--accent)",
                stroke: "var(--neutral-900)",
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <div className="font-mono text-[12px] uppercase tracking-wide text-neutral-500">
            Awaiting first read
          </div>
          <p className="max-w-xs text-[13px] text-neutral-500">
            Live since this session. No fake history.
          </p>
        </div>
      )}
    </div>
  );
}
