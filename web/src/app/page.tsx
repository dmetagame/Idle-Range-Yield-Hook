"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";

import { erc20Abi, idleYieldHookAbi } from "@/lib/abi";
import { addresses, ZERO } from "@/lib/contracts";
import { getPoolId, getPoolKey } from "@/lib/pool-id";

const HOOK_NOT_DEPLOYED = addresses.idleYieldHook === ZERO;

type Status = "UNSET" | "ACTIVE_IN_RANGE" | "PARKED_OUT_OF_RANGE";
const STATUS_LABEL: Record<number, Status> = {
  0: "UNSET",
  1: "ACTIVE_IN_RANGE",
  2: "PARKED_OUT_OF_RANGE",
};

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <Header />
      <Hero />
      {HOOK_NOT_DEPLOYED ? <NotDeployedNotice /> : <Dashboard />}
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between pb-8">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500" />
        <div>
          <div className="text-lg font-semibold tracking-tight">IdleYield Hook</div>
          <div className="text-xs text-zinc-400">
            Dual-yield Uniswap V4 LP · X Layer testnet
          </div>
        </div>
      </div>
      <ConnectButton chainStatus="icon" accountStatus="address" />
    </header>
  );
}

function Hero() {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
        Concentrated LP capital that never sleeps.
      </h1>
      <p className="mt-3 max-w-3xl text-zinc-400">
        In-range, your tokens earn V4 swap fees as a hook-owned liquidity position.
        Out-of-range, the hook atomically routes capital into an ERC-4626 vault to
        earn lending yield. Re-enters the pool the moment a swap pushes price back
        into range — no keeper, no rebalancing bot.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Pill label="In-range" detail="V4 LP earning swap fees" />
        <Pill label="Out-of-range" detail="ERC-4626 vault earning lending yield" />
        <Pill label="Re-entry" detail="Atomic on first swap that approaches range" />
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
        Contracts not yet deployed on X Layer testnet.
      </div>
      <p className="mt-2 text-sm text-zinc-300">
        Run the deploy script and patch the printed addresses into{" "}
        <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs">
          web/src/lib/contracts.ts
        </code>
        :
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-300">
{`forge script script/testing/02_DeployAllToXLayerTestnet.s.sol \\
  --rpc-url xlayer_testnet --broadcast \\
  --account deployer --sender <YOUR_ADDR>`}
      </pre>
    </section>
  );
}

function Dashboard() {
  const poolId = getPoolId();
  const { address } = useAccount();

  const { data: pool, refetch: refetchPool } = useReadContract({
    address: addresses.idleYieldHook,
    abi: idleYieldHookAbi,
    functionName: "pools",
    args: [poolId],
  });

  const { data: reserves, refetch: refetchReserves } = useReadContracts({
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
    ],
  });

  const reserve0 = (reserves?.[0].result as bigint | undefined) ?? 0n;
  const reserve1 = (reserves?.[1].result as bigint | undefined) ?? 0n;
  const userShares = (reserves?.[2].result as bigint | undefined) ?? 0n;

  const status: Status = pool ? STATUS_LABEL[Number(pool[10])] : "UNSET";
  const liquidityInPool = pool ? pool[4] : 0n;
  const vault0Shares = pool ? pool[7] : 0n;
  const vault1Shares = pool ? pool[8] : 0n;
  const totalShares = pool ? pool[9] : 0n;

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <StatusCard status={status} />
        <ReserveCard
          reserve0={reserve0}
          reserve1={reserve1}
          liquidityInPool={liquidityInPool}
          vault0Shares={vault0Shares}
          vault1Shares={vault1Shares}
        />
      </div>
      <div className="space-y-6">
        <UserPositionCard
          userShares={userShares}
          reserve0={reserve0}
          reserve1={reserve1}
          totalShares={totalShares}
        />
        <DepositCard
          onSuccess={() => {
            void refetchPool();
            void refetchReserves();
          }}
        />
      </div>
    </section>
  );
}

function StatusCard({ status }: { status: Status }) {
  const isActive = status === "ACTIVE_IN_RANGE";
  const isParked = status === "PARKED_OUT_OF_RANGE";
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Pool status
      </div>
      <div className="mt-2 flex items-baseline gap-3">
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
      <p className="mt-3 text-sm text-zinc-400">
        {isActive
          ? "Capital is deployed as V4 LP — earning swap fees on every trade through the range."
          : isParked
            ? "Capital is parked in the ERC-4626 vault earning lending yield. The next swap toward the range will atomically re-deploy it as LP."
            : "Awaiting pool registration."}
      </p>
    </div>
  );
}

function ReserveCard({
  reserve0,
  reserve1,
  liquidityInPool,
  vault0Shares,
  vault1Shares,
}: {
  reserve0: bigint;
  reserve1: bigint;
  liquidityInPool: bigint;
  vault0Shares: bigint;
  vault1Shares: bigint;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Reserves (claimable by depositors)
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <Stat label="Token0" value={formatUnits(reserve0, 18)} />
        <Stat label="Token1" value={formatUnits(reserve1, 18)} />
      </div>
      <div className="mt-6 border-t border-zinc-800 pt-4">
        <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Where the capital lives
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-zinc-400">V4 LP liquidity</div>
            <div className="font-mono text-zinc-200">{liquidityInPool.toString()}</div>
          </div>
          <div>
            <div className="text-zinc-400">Vault shares (t0 / t1)</div>
            <div className="font-mono text-zinc-200">
              {vault0Shares.toString()} / {vault1Shares.toString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-2xl text-zinc-50">
        {Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 })}
      </div>
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
      <div className="mt-2 font-mono text-sm text-zinc-300">
        {userShares > 0n ? userShares.toString() : "0"} shares
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-zinc-400">Claim on token0</div>
          <div className="font-mono text-zinc-200">{formatUnits(claim0, 18)}</div>
        </div>
        <div>
          <div className="text-zinc-400">Claim on token1</div>
          <div className="font-mono text-zinc-200">{formatUnits(claim1, 18)}</div>
        </div>
      </div>
    </div>
  );
}

function DepositCard({ onSuccess }: { onSuccess: () => void }) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("10");
  const [submitting, setSubmitting] = useState(false);
  const { writeContractAsync } = useWriteContract();

  async function onDeposit() {
    if (!address) return;
    setSubmitting(true);
    try {
      const amt = parseUnits(amount || "0", 18);
      await writeContractAsync({
        address: addresses.token0,
        abi: erc20Abi,
        functionName: "approve",
        args: [addresses.idleYieldHook, amt],
      });
      await writeContractAsync({
        address: addresses.token1,
        abi: erc20Abi,
        functionName: "approve",
        args: [addresses.idleYieldHook, amt],
      });
      await writeContractAsync({
        address: addresses.idleYieldHook,
        abi: idleYieldHookAbi,
        functionName: "deposit",
        args: [getPoolKey(), amt, amt],
      });
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
      <p className="mt-2 text-xs text-zinc-500">
        Deposits roughly equal amounts of both tokens. Hook handles ratio routing.
      </p>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-transparent text-sm text-zinc-100 outline-none"
          placeholder="10"
          min="0"
        />
        <span className="text-xs text-zinc-500">each side</span>
      </div>
      <button
        type="button"
        disabled={!address || submitting || !amount || Number(amount) <= 0}
        onClick={onDeposit}
        className="mt-3 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {!address
          ? "Connect wallet first"
          : submitting
            ? "Submitting..."
            : `Deposit ${amount || "0"} of each`}
      </button>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-12 border-t border-zinc-900 pt-6 text-xs text-zinc-500">
      <div>
        Built for the X Layer Build X Hackathon 2026 ·{" "}
        <a
          href="https://github.com/dmetagame/Idle-Range-Yield-Hook"
          target="_blank"
          rel="noreferrer"
          className="text-zinc-300 hover:text-emerald-400"
        >
          source on GitHub
        </a>
      </div>
    </footer>
  );
}
