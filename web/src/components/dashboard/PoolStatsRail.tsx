import { formatUnits, type Hex } from "viem";

import { Card } from "@/components/ui/Card";
import { StatGrid, StatRow } from "@/components/ui/StatRow";
import { TickRangeMini } from "@/components/ui/TickRangeMini";

const formatAmount = (value: bigint, max = 4) => {
  const n = Number(formatUnits(value, 18));
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: max });
};

const shortPoolId = (id: Hex) => `${id.slice(0, 6)}…${id.slice(-4)}`;

export function PoolStatsRail({
  poolId,
  fee,
  tickSpacing,
  lowerTick,
  upperTick,
  currentTick,
  reserve0,
  reserve1,
  liquidityInPool,
  token0InHook,
  token1InHook,
  vault0Shares,
  vault1Shares,
  vault0Assets,
  vault1Assets,
}: {
  poolId: Hex;
  fee: number;
  tickSpacing: number;
  lowerTick: number;
  upperTick: number;
  currentTick: number | undefined;
  reserve0: bigint;
  reserve1: bigint;
  liquidityInPool: bigint;
  token0InHook: bigint;
  token1InHook: bigint;
  vault0Shares: bigint;
  vault1Shares: bigint;
  vault0Assets: bigint;
  vault1Assets: bigint;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="px-6 pt-6">
        <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-muted">
          Pool stats
        </div>
        <div className="mt-1 font-mono text-[11px] text-text-faint">{shortPoolId(poolId)}</div>
      </div>

      <div className="px-6 pt-5">
        <TickRangeMini lower={lowerTick} upper={upperTick} current={currentTick} />
      </div>

      <div className="px-6 pb-6 pt-5">
        <StatGrid>
          <StatRow label="Fee tier" value={`${(fee / 10000).toFixed(2)}%`} mono={false} />
          <StatRow label="Tick spacing" value={tickSpacing} />
          <StatRow
            label="Target range"
            value={`[${lowerTick}, ${upperTick}]`}
            mono
            hint={`±${(((upperTick - lowerTick) / 2) * 0.01).toFixed(1)}% around 1:1`}
          />
          <StatRow
            label="Current tick"
            value={currentTick === undefined ? "—" : currentTick}
            hint={
              currentTick === undefined
                ? "Awaiting first read"
                : currentTick >= lowerTick && currentTick < upperTick
                  ? "Inside range"
                  : "Outside range"
            }
          />
          <StatRow label="Reserve · token0" value={formatAmount(reserve0)} emphasize />
          <StatRow label="Reserve · token1" value={formatAmount(reserve1)} emphasize />
          <StatRow label="V4 LP liquidity" value={liquidityInPool.toString()} />
          <StatRow
            label="Vault assets · t0 / t1"
            value={`${formatAmount(vault0Assets)} · ${formatAmount(vault1Assets)}`}
          />
          <StatRow
            label="Hook custody · t0 / t1"
            value={`${formatAmount(token0InHook)} · ${formatAmount(token1InHook)}`}
          />
          <StatRow
            label="Vault shares · t0 / t1"
            value={`${formatAmount(vault0Shares)} · ${formatAmount(vault1Shares)}`}
          />
        </StatGrid>
      </div>
    </Card>
  );
}
