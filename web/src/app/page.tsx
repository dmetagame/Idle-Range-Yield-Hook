"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from "wagmi";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { ActionButton, ActionCard, ActionInput } from "@/components/dashboard/ActionCard";
import { MainChartCard } from "@/components/dashboard/MainChartCard";
import { PoolStatsRail } from "@/components/dashboard/PoolStatsRail";
import { PoolTabs, type PoolMode } from "@/components/dashboard/PoolTabs";
import type { ReservePoint } from "@/components/dashboard/ReserveChart";
import {
  YourPositionCard,
  type PositionBar,
} from "@/components/dashboard/YourPositionCard";
import { Pill } from "@/components/ui/Pill";
import {
  erc20Abi,
  idleYieldHookAbi,
  mockYieldVaultAbi,
  poolManagerAbi,
  stateViewAbi,
  v4RouterAbi,
} from "@/lib/abi";
import {
  activePoolConfig,
  addresses,
  parkedDemoPoolConfig,
  ZERO,
} from "@/lib/contracts";
import { getPoolId, getPoolKey, type PoolKey } from "@/lib/pool-id";

const HOOK_NOT_DEPLOYED = addresses.idleYieldHook === ZERO;

type Status = "UNSET" | "ACTIVE_IN_RANGE" | "PARKED_OUT_OF_RANGE";
const STATUS_LABEL: Record<number, Status> = {
  0: "UNSET",
  1: "ACTIVE_IN_RANGE",
  2: "PARKED_OUT_OF_RANGE",
};

const POOL_CONFIGS: Record<PoolMode, typeof activePoolConfig> = {
  active: activePoolConfig,
  parked: parkedDemoPoolConfig,
};

export default function Page() {
  return (
    <DashboardShell>
      <HeroStrip />
      {HOOK_NOT_DEPLOYED ? <NotDeployedNotice /> : <Dashboard />}
    </DashboardShell>
  );
}

function HeroStrip() {
  return (
    <section className="rounded-2xl border border-border-subtle bg-bg-card p-5 sm:p-8">
      <h1 className="max-w-3xl text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl md:text-4xl">
        Concentrated LP capital that never sleeps.
      </h1>
      <p className="mt-3 max-w-3xl text-sm text-text-secondary">
        In-range capital sits in a hook-owned Uniswap V4 LP earning swap fees. Out-of-range
        capital sits in ERC-4626 vault shares earning lending yield. One hook, two paths,
        both verifiable on X Layer mainnet.
      </p>
      <div className="mt-5 flex flex-wrap gap-2 sm:mt-6">
        <Pill tone="mint" dot>
          ACTIVE_IN_RANGE · earns swap fees
        </Pill>
        <Pill tone="amber" dot>
          PARKED_OUT_OF_RANGE · earns vault yield
        </Pill>
        <Pill tone="muted">One hook · two pools · both live</Pill>
      </div>
    </section>
  );
}

function NotDeployedNotice() {
  return (
    <section className="mt-8 rounded-2xl border border-warning/30 bg-warning/5 p-6">
      <div className="text-sm font-medium text-warning">
        Contracts not yet deployed on X Layer mainnet.
      </div>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-bg-base p-3 text-xs text-text-secondary">
{`forge script script/04_DeployToXLayerMainnet.s.sol \\
  --rpc-url xlayer --broadcast \\
  --account deployer --sender <YOUR_ADDR>`}
      </pre>
    </section>
  );
}

function Dashboard() {
  const [mode, setMode] = useState<PoolMode>("active");
  const selectedConfig = POOL_CONFIGS[mode];
  const poolKey = useMemo(() => getPoolKey(selectedConfig), [selectedConfig]);
  const poolId = useMemo(() => getPoolId(poolKey), [poolKey]);
  const { address } = useAccount();

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

  // Live currentTick via StateView (only when pool initialised)
  const { data: slot0 } = useReadContract({
    address: addresses.stateView,
    abi: stateViewAbi,
    functionName: "getSlot0",
    args: [poolId],
    query: { enabled: status !== "UNSET", refetchInterval: 8000 },
  });
  const currentTick: number | undefined = slot0 ? Number(slot0[1]) : undefined;

  // Accumulate per-pool reserve series (live since this session, no fake history)
  const [seriesByPool, setSeriesByPool] = useState<Record<string, ReservePoint[]>>({});
  useEffect(() => {
    if (!reads) return;
    const r0 = Number(formatUnits(reserve0, 18));
    const r1 = Number(formatUnits(reserve1, 18));
    if (!Number.isFinite(r0) || !Number.isFinite(r1)) return;
    setSeriesByPool((prev) => {
      const arr = prev[poolId] ?? [];
      const last = arr[arr.length - 1];
      if (last && last.reserve0 === r0 && last.reserve1 === r1) return prev;
      const t = Math.floor(Date.now() / 1000);
      const next: ReservePoint = { t, reserve0: r0, reserve1: r1, total: r0 + r1 };
      const updated = [...arr, next].slice(-300);
      return { ...prev, [poolId]: updated };
    });
  }, [reads, poolId, reserve0, reserve1]);

  const series = seriesByPool[poolId] ?? [];
  const positionBars: PositionBar[] = useMemo(() => {
    if (totalShares === 0n || userShares === 0n) return [];
    const share = Number(userShares) / Number(totalShares);
    return series.slice(-12).map((p) => ({ t: p.t, value: share * p.total }));
  }, [series, userShares, totalShares]);

  const claim0 = totalShares > 0n ? (userShares * reserve0) / totalShares : 0n;
  const claim1 = totalShares > 0n ? (userShares * reserve1) / totalShares : 0n;

  function refetchAll() {
    void refetchPool();
    void refetchReads();
  }

  const yieldEnabled =
    mode === "parked" &&
    status === "PARKED_OUT_OF_RANGE" &&
    (vault0Shares > 0n || vault1Shares > 0n);

  return (
    <section className="mt-8 flex flex-col gap-6" id="pools">
      <PoolTabs mode={mode} onChange={setMode} />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="order-2 lg:order-1">
          <PoolStatsRail
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
        </div>
        <div className="order-1 lg:order-2">
          <MainChartCard
            mode={mode}
            status={status}
            reserve0={reserve0}
            reserve1={reserve1}
            series={series}
          />
        </div>
      </div>

      {mode === "parked" && status === "UNSET" ? (
        <InitializeParkedPoolCard onSuccess={refetchAll} poolKey={poolKey} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3" id="swap">
        <MintCard />
        <DepositCard onSuccess={refetchAll} poolKey={poolKey} status={status} />
        {mode === "active" ? (
          <SwapCard onSuccess={refetchAll} poolKey={poolKey} />
        ) : (
          <YieldCard onSuccess={refetchAll} enabled={yieldEnabled} />
        )}
      </div>

      <YourPositionCard
        userShares={userShares}
        claim0={claim0}
        claim1={claim1}
        bars={positionBars}
      />
    </section>
  );
}

function InitializeParkedPoolCard({
  poolKey,
  onSuccess,
}: {
  poolKey: PoolKey;
  onSuccess: () => void;
}) {
  const { address } = useAccount();
  const [submitting, setSubmitting] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  async function onInitialize() {
    if (!address) return;
    setSubmitting(true);
    try {
      const initializeHash = await writeContractAsync({
        address: addresses.poolManager,
        abi: poolManagerAbi,
        functionName: "initialize",
        args: [poolKey, parkedDemoPoolConfig.initialSqrtPriceX96],
      });
      await publicClient?.waitForTransactionReceipt({ hash: initializeHash });
      const registerHash = await writeContractAsync({
        address: addresses.idleYieldHook,
        abi: idleYieldHookAbi,
        functionName: "registerPool",
        args: [
          poolKey,
          parkedDemoPoolConfig.lowerTick,
          parkedDemoPoolConfig.upperTick,
          addresses.vault0,
          addresses.vault1,
        ],
      });
      await publicClient?.waitForTransactionReceipt({ hash: registerHash });
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/[0.06] p-5">
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-warning">
        Vault demo setup
      </div>
      <p className="mt-2 max-w-2xl text-[12px] text-text-secondary">
        Initialises a second V4 pool out of range and registers it with the deployed hook so
        deposits route straight into ERC-4626 vault shares.
      </p>
      <button
        type="button"
        disabled={!address || submitting}
        onClick={onInitialize}
        className="mt-3 inline-flex w-full max-w-xs items-center justify-center rounded-lg bg-warning px-4 py-2 text-sm font-medium text-bg-base transition hover:bg-warning/90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        {!address
          ? "Connect wallet first"
          : submitting
            ? "Initializing…"
            : "Initialize vault demo pool"}
      </button>
    </div>
  );
}

function MintCard() {
  const { address } = useAccount();
  const [amount, setAmount] = useState("25");
  const [submitting, setSubmitting] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  async function onMint() {
    if (!address) return;
    setSubmitting(true);
    try {
      const amt = parseUnits(amount || "0", 18);
      const mint0Hash = await writeContractAsync({
        address: addresses.token0,
        abi: erc20Abi,
        functionName: "mint",
        args: [address, amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: mint0Hash });
      const mint1Hash = await writeContractAsync({
        address: addresses.token1,
        abi: erc20Abi,
        functionName: "mint",
        args: [address, amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: mint1Hash });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ActionCard
      eyebrow="Test tokens"
      title="Mint IY0 + IY1"
      caption="Mock ERC-20s with public mint. Use these to test the flow on mainnet."
    >
      <ActionInput
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="25"
        type="number"
        min="0"
        suffix="each"
      />
      <ActionButton
        tone="muted"
        disabled={!address || submitting || !amount || Number(amount) <= 0}
        onClick={onMint}
      >
        {!address ? "Connect wallet first" : submitting ? "Minting…" : `Mint ${amount || "0"} of each`}
      </ActionButton>
    </ActionCard>
  );
}

function DepositCard({
  onSuccess,
  poolKey,
  status,
}: {
  onSuccess: () => void;
  poolKey: PoolKey;
  status: Status;
}) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("10");
  const [submitting, setSubmitting] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  async function onDeposit() {
    if (!address) return;
    setSubmitting(true);
    try {
      const amt = parseUnits(amount || "0", 18);
      const approve0Hash = await writeContractAsync({
        address: addresses.token0,
        abi: erc20Abi,
        functionName: "approve",
        args: [addresses.idleYieldHook, amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: approve0Hash });
      const approve1Hash = await writeContractAsync({
        address: addresses.token1,
        abi: erc20Abi,
        functionName: "approve",
        args: [addresses.idleYieldHook, amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: approve1Hash });
      const depositHash = await writeContractAsync({
        address: addresses.idleYieldHook,
        abi: idleYieldHookAbi,
        functionName: "deposit",
        args: [poolKey, amt, amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: depositHash });
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ActionCard
      eyebrow="Deposit"
      title="Add liquidity"
      caption={
        status === "ACTIVE_IN_RANGE"
          ? "Routes into the hook's V4 LP position."
          : status === "PARKED_OUT_OF_RANGE"
            ? "Routes straight into ERC-4626 vault shares."
            : "Pool not registered yet."
      }
    >
      <ActionInput
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="10"
        type="number"
        min="0"
        suffix="each side"
      />
      <ActionButton
        tone="mint"
        disabled={
          !address || status === "UNSET" || submitting || !amount || Number(amount) <= 0
        }
        onClick={onDeposit}
      >
        {!address
          ? "Connect wallet first"
          : status === "UNSET"
            ? "Pool not registered"
            : submitting
              ? "Depositing…"
              : `Deposit ${amount || "0"} of each`}
      </ActionButton>
    </ActionCard>
  );
}

function SwapCard({ onSuccess, poolKey }: { onSuccess: () => void; poolKey: PoolKey }) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("0.5");
  const [zeroForOne, setZeroForOne] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  async function onSwap() {
    if (!address) return;
    setSubmitting(true);
    try {
      const amt = parseUnits(amount || "0", 18);
      const inputToken = zeroForOne ? addresses.token0 : addresses.token1;
      const approveHash = await writeContractAsync({
        address: inputToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [addresses.v4Router, amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: approveHash });
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
      const swapHash = await writeContractAsync({
        address: addresses.v4Router,
        abi: v4RouterAbi,
        functionName: "swapExactTokensForTokens",
        args: [amt, 0n, zeroForOne, poolKey, "0x", address, deadline],
      });
      await publicClient?.waitForTransactionReceipt({ hash: swapHash });
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ActionCard
      eyebrow="Swap"
      title="Trade against the hook's LP"
      caption="Every swap routes through the hook. The 0.30% fee compounds into the LP reserves."
    >
      <ActionInput
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.5"
        type="number"
        min="0"
        suffix={
          <button
            type="button"
            onClick={() => setZeroForOne((v) => !v)}
            className="rounded bg-white/[0.05] px-2 py-1 font-mono text-[10px] font-medium text-text-secondary transition-colors hover:bg-accent-mint/15 hover:text-accent-mint"
          >
            {zeroForOne ? "IY0 → IY1" : "IY1 → IY0"}
          </button>
        }
      />
      <ActionButton
        tone="teal"
        disabled={!address || submitting || !amount || Number(amount) <= 0}
        onClick={onSwap}
      >
        {!address
          ? "Connect wallet first"
          : submitting
            ? "Swapping…"
            : `Swap ${amount || "0"} ${zeroForOne ? "IY0" : "IY1"}`}
      </ActionButton>
    </ActionCard>
  );
}

function YieldCard({ enabled, onSuccess }: { enabled: boolean; onSuccess: () => void }) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("0.25");
  const [submitting, setSubmitting] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  async function onAccrue() {
    if (!address) return;
    setSubmitting(true);
    try {
      const amt = parseUnits(amount || "0", 18);
      const approve0Hash = await writeContractAsync({
        address: addresses.token0,
        abi: erc20Abi,
        functionName: "approve",
        args: [addresses.vault0, amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: approve0Hash });
      const accrue0Hash = await writeContractAsync({
        address: addresses.vault0,
        abi: mockYieldVaultAbi,
        functionName: "accrueYield",
        args: [amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: accrue0Hash });
      const approve1Hash = await writeContractAsync({
        address: addresses.token1,
        abi: erc20Abi,
        functionName: "approve",
        args: [addresses.vault1, amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: approve1Hash });
      const accrue1Hash = await writeContractAsync({
        address: addresses.vault1,
        abi: mockYieldVaultAbi,
        functionName: "accrueYield",
        args: [amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: accrue1Hash });
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ActionCard
      eyebrow="Vault yield"
      title="Accrue lending yield"
      caption="Adds underlying to both vaults; raises share price for parked depositors."
    >
      <ActionInput
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.25"
        type="number"
        min="0"
        suffix="each vault"
      />
      <ActionButton
        tone="amber"
        disabled={!address || !enabled || submitting || !amount || Number(amount) <= 0}
        onClick={onAccrue}
      >
        {!address
          ? "Connect wallet first"
          : !enabled
            ? "Deposit into vault demo first"
            : submitting
              ? "Accruing…"
              : `Accrue ${amount || "0"}`}
      </ActionButton>
    </ActionCard>
  );
}
