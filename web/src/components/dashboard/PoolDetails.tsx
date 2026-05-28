"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { formatUnits, type Hex } from "viem";

import { ContractChip } from "@/components/ui/ContractChip";
import { StatRow } from "@/components/ui/StatRow";
import { addresses } from "@/lib/contracts";

const fmt = (v: bigint, max = 4) =>
  Number(formatUnits(v, 18)).toLocaleString(undefined, { maximumFractionDigits: max });

const shortId = (id: Hex) => `${id.slice(0, 8)}…${id.slice(-6)}`;

export function PoolDetails({
  poolMode,
  onSwitchPool,
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
  poolMode: "active" | "parked";
  onSwitchPool: () => void;
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
  const [open, setOpen] = useState(false);
  return (
    <section className="mx-auto max-w-3xl px-6 pt-20 pb-32 md:pt-32">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between border-t border-neutral-700 py-6 text-left text-[17px] text-neutral-0 transition-colors duration-150 hover:text-accent md:text-[18px]"
      >
        <span>Pool details</span>
        <ChevronDown
          className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={1.5}
        />
      </button>

      {open ? (
        <div className="space-y-12 pt-2 pb-8">
          <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
            <div className="divide-y divide-neutral-700">
              <StatRow label="Fee tier" value={`${(fee / 10000).toFixed(2)}%`} mono={false} />
              <StatRow label="Tick spacing" value={tickSpacing} />
              <StatRow label="Target range" value={`[${lowerTick}, ${upperTick}]`} />
              <StatRow
                label="Current tick"
                value={currentTick === undefined ? "—" : currentTick}
              />
              <StatRow label="V4 LP liquidity" value={liquidityInPool.toString()} />
            </div>
            <div className="divide-y divide-neutral-700">
              <StatRow label="Reserve · Token0" value={fmt(reserve0)} />
              <StatRow label="Reserve · Token1" value={fmt(reserve1)} />
              <StatRow
                label="Vault assets"
                value={`${fmt(vault0Assets)} · ${fmt(vault1Assets)}`}
              />
              <StatRow
                label="Hook custody"
                value={`${fmt(token0InHook)} · ${fmt(token1InHook)}`}
              />
              <StatRow
                label="Vault shares"
                value={`${fmt(vault0Shares)} · ${fmt(vault1Shares)}`}
              />
            </div>
          </div>

          <div>
            <div className="font-mono text-[12px] uppercase tracking-wide text-neutral-500">
              Pool id
            </div>
            <div className="mt-2 font-mono text-[14px] text-neutral-50">{shortId(poolId)}</div>
          </div>

          <div>
            <div className="font-mono text-[12px] uppercase tracking-wide text-neutral-500">
              Contracts
            </div>
            <div className="mt-2 divide-y divide-neutral-700">
              <ContractChip label="IdleYieldHook" address={addresses.idleYieldHook} />
              <ContractChip label="PoolManager" address={addresses.poolManager} />
              <ContractChip label="V4Router" address={addresses.v4Router} />
              <ContractChip label="Token0" address={addresses.token0} />
              <ContractChip label="Token1" address={addresses.token1} />
              <ContractChip label="Vault0" address={addresses.vault0} />
              <ContractChip label="Vault1" address={addresses.vault1} />
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={onSwitchPool}
              className="text-[14px] text-neutral-300 underline-offset-4 transition-colors duration-150 hover:text-accent hover:underline"
            >
              {poolMode === "active"
                ? "See the parked-pool demo →"
                : "← Back to the fee pool"}
            </button>
            <p className="mt-2 text-[13px] text-neutral-500">
              {poolMode === "active"
                ? "A second V4 pool initialised out of range. Deposits route into ERC-4626 vault shares so the parked path is live on-chain."
                : "Returns to the headline fee pool."}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
