"use client";

import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from "wagmi";

import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  erc20Abi,
  idleYieldHookAbi,
  mockYieldVaultAbi,
  poolManagerAbi,
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

type PoolMode = "active" | "parked";

const POOL_MODES = {
  active: {
    label: "Fee pool",
    eyebrow: "ACTIVE RANGE",
    description: "Live V4 liquidity collecting swap fees on X Layer mainnet.",
    config: activePoolConfig,
  },
  parked: {
    label: "Vault demo",
    eyebrow: "PARKED RANGE",
    description: "Out-of-range pool that routes deposits into ERC-4626 vault shares.",
    config: parkedDemoPoolConfig,
  },
} as const;

export default function Page() {
  return (
    <DashboardShell>
      <Hero />
      {HOOK_NOT_DEPLOYED ? <NotDeployedNotice /> : <Dashboard />}
    </DashboardShell>
  );
}

function Hero() {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
        Concentrated LP capital that never sleeps.
      </h1>
      <p className="mt-3 max-w-3xl text-zinc-400">
        In-range capital sits in a hook-owned V4 LP. Out-of-range capital sits in
        ERC-4626 vault shares. The dashboard below separates both live paths so each
        one can be verified on-chain.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Pill label="Swap fees" detail="V4 LP reserves grow on every routed swap" />
        <Pill label="Vault yield" detail="Parked deposits accrue via ERC-4626 shares" />
        <Pill label="One hook" detail="Both flows use the same deployed hook contract" />
      </div>
    </section>
  );
}

function Pill({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">
        {label}
      </div>
      <div className="mt-1 text-sm text-zinc-300">{detail}</div>
    </div>
  );
}

function NotDeployedNotice() {
  return (
    <section className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
      <div className="text-sm font-medium text-amber-300">
        Contracts not yet deployed on X Layer mainnet.
      </div>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-300">
{`forge script script/04_DeployToXLayerMainnet.s.sol \\
  --rpc-url xlayer --broadcast \\
  --account deployer --sender <YOUR_ADDR>`}
      </pre>
    </section>
  );
}

function Dashboard() {
  const [mode, setMode] = useState<PoolMode>("active");
  const selected = POOL_MODES[mode];
  const poolKey = getPoolKey(selected.config);
  const poolId = getPoolId(poolKey);
  const { address } = useAccount();

  const { data: pool, refetch: refetchPool } = useReadContract({
    address: addresses.idleYieldHook,
    abi: idleYieldHookAbi,
    functionName: "pools",
    args: [poolId],
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
  });

  const reserve0 = (reads?.[0].result as bigint | undefined) ?? 0n;
  const reserve1 = (reads?.[1].result as bigint | undefined) ?? 0n;
  const userShares = (reads?.[2].result as bigint | undefined) ?? 0n;
  const vault0Assets = (reads?.[3].result as bigint | undefined) ?? 0n;
  const vault1Assets = (reads?.[4].result as bigint | undefined) ?? 0n;

  function refetchAll() {
    void refetchPool();
    void refetchReads();
  }

  return (
    <section className="mt-8">
      <ModeTabs mode={mode} onChange={setMode} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <StatusCard
            mode={mode}
            status={status}
            poolId={poolId}
            label={selected.label}
            description={selected.description}
          />
          <ReserveCard
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
        <div className="space-y-6">
          {mode === "parked" && status === "UNSET" ? (
            <InitializeParkedPoolCard onSuccess={refetchAll} poolKey={poolKey} />
          ) : null}
          <UserPositionCard
            userShares={userShares}
            reserve0={reserve0}
            reserve1={reserve1}
            totalShares={totalShares}
          />
          <MintCard />
          <DepositCard onSuccess={refetchAll} poolKey={poolKey} status={status} />
          {mode === "active" ? (
            <SwapCard onSuccess={refetchAll} poolKey={poolKey} />
          ) : (
            <YieldCard
              onSuccess={refetchAll}
              enabled={status === "PARKED_OUT_OF_RANGE" && (vault0Shares > 0n || vault1Shares > 0n)}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function ModeTabs({
  mode,
  onChange,
}: {
  mode: PoolMode;
  onChange: (mode: PoolMode) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(Object.keys(POOL_MODES) as PoolMode[]).map((key) => {
        const option = POOL_MODES[key];
        const active = key === mode;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              active
                ? "border-emerald-400/60 bg-emerald-400/10"
                : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
            }`}
          >
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              {option.eyebrow}
            </div>
            <div className="mt-1 text-sm font-medium text-zinc-100">{option.label}</div>
            <div className="mt-1 text-xs text-zinc-500">{option.description}</div>
          </button>
        );
      })}
    </div>
  );
}

function StatusCard({
  mode,
  status,
  poolId,
  label,
  description,
}: {
  mode: PoolMode;
  status: Status;
  poolId: string;
  label: string;
  description: string;
}) {
  const isActive = status === "ACTIVE_IN_RANGE";
  const isParked = status === "PARKED_OUT_OF_RANGE";
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {label}
          </div>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">{description}</p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
            isActive
              ? "bg-emerald-500/20 text-emerald-300"
              : isParked
                ? "bg-amber-500/20 text-amber-300"
                : "bg-zinc-700/20 text-zinc-400"
          }`}
        >
          <span
            className={`size-2 rounded-full ${
              isActive ? "bg-emerald-400" : isParked ? "bg-amber-400" : "bg-zinc-500"
            }`}
          />
          {status.replace(/_/g, " ")}
        </span>
      </div>
      <div className="mt-5 grid gap-3 text-xs text-zinc-500 sm:grid-cols-2">
        <div>
          <div className="uppercase tracking-wider">PoolId</div>
          <div className="mt-1 break-all font-mono text-zinc-300">{poolId}</div>
        </div>
        <div>
          <div className="uppercase tracking-wider">Verifier path</div>
          <div className="mt-1 text-zinc-300">
            {mode === "active"
              ? "Deposit and swap against live V4 LP."
              : "Deposit, accrue vault yield, then compare reserves."}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReserveCard({
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Reserves claimable by depositors
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <Stat label="Token0" value={reserve0} />
        <Stat label="Token1" value={reserve1} />
      </div>
      <div className="mt-6 grid gap-3 border-t border-zinc-800 pt-4 text-sm sm:grid-cols-3">
        <Metric label="V4 LP liquidity" value={liquidityInPool.toString()} />
        <Metric
          label="Vault assets"
          value={`${formatAmount(vault0Assets)} / ${formatAmount(vault1Assets)}`}
        />
        <Metric
          label="Hook custody"
          value={`${formatAmount(token0InHook)} / ${formatAmount(token1InHook)}`}
        />
        <Metric label="Vault shares 0" value={vault0Shares.toString()} />
        <Metric label="Vault shares 1" value={vault1Shares.toString()} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: bigint }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-2xl text-zinc-50">{formatAmount(value)}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 break-all font-mono text-zinc-200">{value}</div>
    </div>
  );
}

function UserPositionCard({
  userShares,
  reserve0,
  reserve1,
  totalShares,
}: {
  userShares: bigint;
  reserve0: bigint;
  reserve1: bigint;
  totalShares: bigint;
}) {
  const claim0 = totalShares > 0n ? (userShares * reserve0) / totalShares : 0n;
  const claim1 = totalShares > 0n ? (userShares * reserve1) / totalShares : 0n;
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Your position
      </div>
      <div className="mt-2 break-all font-mono text-sm text-zinc-300">
        {userShares > 0n ? userShares.toString() : "0"} shares
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Claim token0" value={formatUnits(claim0, 18)} />
        <Metric label="Claim token1" value={formatUnits(claim1, 18)} />
      </div>
    </div>
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
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
      <div className="text-xs font-medium uppercase tracking-wider text-amber-300">
        Vault demo setup
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        This initializes a second V4 pool out of range and registers it with the
        deployed hook. Deposits to this pool go straight into vault shares.
      </p>
      <button
        type="button"
        disabled={!address || submitting}
        onClick={onInitialize}
        className="mt-3 w-full rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {!address ? "Connect wallet first" : submitting ? "Initializing..." : "Initialize vault demo"}
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Test tokens
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="w-full bg-transparent text-sm text-zinc-100 outline-none"
          placeholder="25"
          min="0"
        />
        <span className="text-xs text-zinc-500">each</span>
      </div>
      <button
        type="button"
        disabled={!address || submitting || !amount || Number(amount) <= 0}
        onClick={onMint}
        className="mt-3 w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {!address ? "Connect wallet first" : submitting ? "Minting..." : `Mint ${amount || "0"}`}
      </button>
    </div>
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Deposit
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="w-full bg-transparent text-sm text-zinc-100 outline-none"
          placeholder="10"
          min="0"
        />
        <span className="text-xs text-zinc-500">each side</span>
      </div>
      <button
        type="button"
        disabled={!address || status === "UNSET" || submitting || !amount || Number(amount) <= 0}
        onClick={onDeposit}
        className="mt-3 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {!address
          ? "Connect wallet first"
          : status === "UNSET"
            ? "Pool not registered"
            : submitting
              ? "Submitting..."
              : `Deposit ${amount || "0"} of each`}
      </button>
    </div>
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Swap
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="w-full bg-transparent text-sm text-zinc-100 outline-none"
          placeholder="0.5"
          min="0"
        />
        <button
          type="button"
          onClick={() => setZeroForOne((value) => !value)}
          className="rounded bg-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-700"
        >
          {zeroForOne ? "IY0 -> IY1" : "IY1 -> IY0"}
        </button>
      </div>
      <button
        type="button"
        disabled={!address || submitting || !amount || Number(amount) <= 0}
        onClick={onSwap}
        className="mt-3 w-full rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {!address ? "Connect wallet first" : submitting ? "Swapping..." : `Swap ${amount || "0"}`}
      </button>
    </div>
  );
}

function YieldCard({
  enabled,
  onSuccess,
}: {
  enabled: boolean;
  onSuccess: () => void;
}) {
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Vault yield
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="w-full bg-transparent text-sm text-zinc-100 outline-none"
          placeholder="0.25"
          min="0"
        />
        <span className="text-xs text-zinc-500">each vault</span>
      </div>
      <button
        type="button"
        disabled={!address || !enabled || submitting || !amount || Number(amount) <= 0}
        onClick={onAccrue}
        className="mt-3 w-full rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {!address
          ? "Connect wallet first"
          : !enabled
            ? "Deposit into vault demo first"
            : submitting
              ? "Accruing..."
              : `Accrue ${amount || "0"}`}
      </button>
    </div>
  );
}

function formatAmount(value: bigint) {
  const formatted = formatUnits(value, 18);
  const numeric = Number(formatted);
  if (!Number.isFinite(numeric)) return formatted;
  return numeric.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
