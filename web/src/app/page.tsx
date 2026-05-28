"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useBlockNumber, useReadContract, useReadContracts } from "wagmi";

import { Hero } from "@/components/dashboard/Hero";
import {
  IntegrationsPanel,
  type TransactionReceipt,
} from "@/components/dashboard/IntegrationsPanel";
import { LiveState } from "@/components/dashboard/LiveState";
import { PoolDetails } from "@/components/dashboard/PoolDetails";
import { ProofPanel } from "@/components/dashboard/ProofPanel";
import type { ReservePoint } from "@/components/dashboard/ReserveChart";
import { StateStrip } from "@/components/dashboard/StateStrip";
import { Steps } from "@/components/dashboard/Steps";
import { YourPosition } from "@/components/dashboard/YourPosition";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  idleYieldHookAbi,
  mockYieldVaultAbi,
  stateViewAbi,
} from "@/lib/abi";
import {
  activePoolConfig,
  addresses,
  parkedDemoPoolConfig,
  ZERO,
} from "@/lib/contracts";
import { getPoolId, getPoolKey } from "@/lib/pool-id";

const HOOK_NOT_DEPLOYED = addresses.idleYieldHook === ZERO;

type Status = "UNSET" | "ACTIVE_IN_RANGE" | "PARKED_OUT_OF_RANGE";
const STATUS_LABEL: Record<number, Status> = {
  0: "UNSET",
  1: "ACTIVE_IN_RANGE",
  2: "PARKED_OUT_OF_RANGE",
};

const POOL_CONFIGS = {
  active: activePoolConfig,
  parked: parkedDemoPoolConfig,
} as const;

type SeriesAction = {
  poolId: string;
  reserve0: number;
  reserve1: number;
  t: number;
};

function seriesReducer(
  prev: Record<string, ReservePoint[]>,
  action: SeriesAction,
) {
  const arr = prev[action.poolId] ?? [];
  const last = arr[arr.length - 1];
  if (last && last.reserve0 === action.reserve0 && last.reserve1 === action.reserve1) {
    return prev;
  }
  const next: ReservePoint = {
    t: action.t,
    reserve0: action.reserve0,
    reserve1: action.reserve1,
    total: action.reserve0 + action.reserve1,
  };
  return { ...prev, [action.poolId]: [...arr, next].slice(-300) };
}

export default function Page() {
  return (
    <DashboardShell>
      <Hero />
      {HOOK_NOT_DEPLOYED ? <NotDeployedNotice /> : <Dashboard />}
    </DashboardShell>
  );
}

function NotDeployedNotice() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <div className="rounded-2xl bg-white/[0.025] p-8 text-[14px] text-neutral-300">
        Contracts are not deployed on this chain. Run{" "}
        <code className="font-mono text-neutral-0">
          forge script script/04_DeployToXLayerMainnet.s.sol --broadcast
        </code>
        .
      </div>
    </section>
  );
}

function Dashboard() {
  const [poolMode, setPoolMode] = useState<"active" | "parked">("active");
  const [receipts, setReceipts] = useState<TransactionReceipt[]>([]);
  const selectedConfig = POOL_CONFIGS[poolMode];
  const poolKey = useMemo(() => getPoolKey(selectedConfig), [selectedConfig]);
  const poolId = useMemo(() => getPoolId(poolKey), [poolKey]);
  const { address } = useAccount();

  const { data: latestBlock } = useBlockNumber({
    query: { refetchInterval: 8000 },
  });

  const { data: owner } = useReadContract({
    address: addresses.idleYieldHook,
    abi: idleYieldHookAbi,
    functionName: "owner",
    query: { refetchInterval: 60_000 },
  });

  const { data: pool, refetch: refetchPool } = useReadContract({
    address: addresses.idleYieldHook,
    abi: idleYieldHookAbi,
    functionName: "pools",
    args: [poolId],
    query: { refetchInterval: 8000 },
  });

  const status: Status = pool ? STATUS_LABEL[Number(pool[10])] : "UNSET";
  const liquidityInPool = pool ? pool[4] : 0n;
  const token0InHook = pool ? pool[5] : 0n;
  const token1InHook = pool ? pool[6] : 0n;
  const vault0Shares = pool ? pool[7] : 0n;
  const vault1Shares = pool ? pool[8] : 0n;
  const totalShares = pool ? pool[9] : 0n;

  const { data: reads, refetch: refetchReads } = useReadContracts({
    contracts: [
      {
        address: addresses.idleYieldHook,
        abi: idleYieldHookAbi,
        functionName: "totalReserve0",
        args: [poolId],
      },
      {
        address: addresses.idleYieldHook,
        abi: idleYieldHookAbi,
        functionName: "totalReserve1",
        args: [poolId],
      },
      {
        address: addresses.idleYieldHook,
        abi: idleYieldHookAbi,
        functionName: "poolShares",
        args: [poolId, address ?? ZERO],
      },
      {
        address: addresses.vault0,
        abi: mockYieldVaultAbi,
        functionName: "convertToAssets",
        args: [vault0Shares],
      },
      {
        address: addresses.vault1,
        abi: mockYieldVaultAbi,
        functionName: "convertToAssets",
        args: [vault1Shares],
      },
    ],
    query: { refetchInterval: 8000 },
  });

  const reserve0 = (reads?.[0].result as bigint | undefined) ?? 0n;
  const reserve1 = (reads?.[1].result as bigint | undefined) ?? 0n;
  const userShares = (reads?.[2].result as bigint | undefined) ?? 0n;
  const vault0Assets = (reads?.[3].result as bigint | undefined) ?? 0n;
  const vault1Assets = (reads?.[4].result as bigint | undefined) ?? 0n;

  const { data: slot0 } = useReadContract({
    address: addresses.stateView,
    abi: stateViewAbi,
    functionName: "getSlot0",
    args: [poolId],
    query: { enabled: status !== "UNSET", refetchInterval: 8000 },
  });
  const currentTick: number | undefined = slot0 ? Number(slot0[1]) : undefined;

  const [seriesByPool, addSeriesPoint] = useReducer(seriesReducer, {});
  useEffect(() => {
    if (!reads) return;
    const r0 = Number(formatUnits(reserve0, 18));
    const r1 = Number(formatUnits(reserve1, 18));
    if (!Number.isFinite(r0) || !Number.isFinite(r1)) return;
    addSeriesPoint({
      poolId,
      reserve0: r0,
      reserve1: r1,
      t: Math.floor(Date.now() / 1000),
    });
  }, [reads, poolId, reserve0, reserve1]);

  const series = seriesByPool[poolId] ?? [];
  const claim0 = totalShares > 0n ? (userShares * reserve0) / totalShares : 0n;
  const claim1 = totalShares > 0n ? (userShares * reserve1) / totalShares : 0n;

  function refetchAll() {
    void refetchPool();
    void refetchReads();
  }

  function onReceipt(receipt: Omit<TransactionReceipt, "at">) {
    setReceipts((prev) =>
      [
        { ...receipt, at: Date.now() },
        ...prev.filter((item) => item.hash !== receipt.hash),
      ].slice(0, 8),
    );
  }

  const yieldEnabled =
    poolMode === "parked" &&
    status === "PARKED_OUT_OF_RANGE" &&
    (vault0Shares > 0n || vault1Shares > 0n);

  return (
    <>
      <div className="mx-auto max-w-3xl px-6 pt-12 md:pt-20">
        <StateStrip status={status} poolMode={poolMode} onSelectMode={setPoolMode} />
      </div>
      <LiveState
        poolId={poolId}
        status={status}
        reserve0={reserve0}
        reserve1={reserve1}
        currentTick={currentTick}
        lowerTick={selectedConfig.lowerTick}
        upperTick={selectedConfig.upperTick}
        series={series}
      />
      <YourPosition userShares={userShares} claim0={claim0} claim1={claim1} />
      <Steps
        poolMode={poolMode}
        poolKey={poolKey}
        status={status}
        yieldEnabled={yieldEnabled}
        onSuccess={refetchAll}
        onReceipt={onReceipt}
      />
      <ProofPanel
        poolMode={poolMode}
        poolId={poolId}
        status={status}
        owner={owner}
        latestBlock={latestBlock}
        reserve0={reserve0}
        reserve1={reserve1}
        currentTick={currentTick}
        lowerTick={selectedConfig.lowerTick}
        upperTick={selectedConfig.upperTick}
        liquidityInPool={liquidityInPool}
        totalShares={totalShares}
      />
      <IntegrationsPanel
        poolMode={poolMode}
        poolId={poolId}
        account={address}
        receipts={receipts}
      />
      <PoolDetails
        poolMode={poolMode}
        onSwitchPool={() => setPoolMode((m) => (m === "active" ? "parked" : "active"))}
        poolId={poolId}
        fee={selectedConfig.fee}
        tickSpacing={selectedConfig.tickSpacing}
        lowerTick={selectedConfig.lowerTick}
        upperTick={selectedConfig.upperTick}
        currentTick={currentTick}
        reserve0={reserve0}
        reserve1={reserve1}
        liquidityInPool={liquidityInPool}
        token0InHook={token0InHook}
        token1InHook={token1InHook}
        vault0Shares={vault0Shares}
        vault1Shares={vault1Shares}
        vault0Assets={vault0Assets}
        vault1Assets={vault1Assets}
      />
    </>
  );
}
