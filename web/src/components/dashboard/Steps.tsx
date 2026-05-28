"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { parseUnits, type Hex } from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";

import { Button } from "@/components/ui/Button";
import {
  erc20Abi,
  idleYieldHookAbi,
  mockYieldVaultAbi,
  poolManagerAbi,
  v4RouterAbi,
} from "@/lib/abi";
import { xLayer } from "@/lib/chains";
import { addresses, parkedDemoPoolConfig } from "@/lib/contracts";
import type { PoolKey } from "@/lib/pool-id";

type Status = "UNSET" | "ACTIVE_IN_RANGE" | "PARKED_OUT_OF_RANGE";

function useChainGuard() {
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const onCorrectChain = chainId === xLayer.id;
  async function ensureCorrectChain() {
    if (onCorrectChain) return;
    await switchChainAsync({ chainId: xLayer.id });
  }
  return { onCorrectChain, ensureCorrectChain };
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const short = (err as { shortMessage?: string }).shortMessage;
    if (typeof short === "string" && short.length > 0) return short;
    return err.message.split("\n")[0];
  }
  return String(err);
}

export function Steps({
  poolMode,
  poolKey,
  status,
  yieldEnabled,
  onSuccess,
  onReceipt,
}: {
  poolMode: "active" | "parked";
  poolKey: PoolKey;
  status: Status;
  yieldEnabled: boolean;
  onSuccess: () => void;
  onReceipt: (receipt: { label: string; hash: Hex }) => void;
}) {
  const needsInit = poolMode === "parked" && status === "UNSET";

  return (
    <section id="steps" className="mx-auto max-w-3xl px-6 pt-20 md:pt-32">
      <div className="font-mono text-[12px] uppercase tracking-wide text-neutral-500">
        How to try it
      </div>

      <div className="mt-6 border-t border-neutral-700">
        {needsInit ? (
          <InitializeStep
            n={1}
            poolKey={poolKey}
            onSuccess={onSuccess}
            onReceipt={onReceipt}
          />
        ) : null}
        <MintStep n={needsInit ? 2 : 1} onReceipt={onReceipt} />
        <DepositStep
          n={needsInit ? 3 : 2}
          poolKey={poolKey}
          status={status}
          onSuccess={onSuccess}
          onReceipt={onReceipt}
        />
        {poolMode === "active" ? (
          <SwapStep
            n={needsInit ? 4 : 3}
            poolKey={poolKey}
            onSuccess={onSuccess}
            onReceipt={onReceipt}
          />
        ) : (
          <YieldStep
            n={needsInit ? 4 : 3}
            enabled={yieldEnabled}
            onSuccess={onSuccess}
            onReceipt={onReceipt}
          />
        )}
      </div>
    </section>
  );
}

function StepRow({
  n,
  title,
  caption,
  children,
  isLast,
}: {
  n: number;
  title: string;
  caption: ReactNode;
  children: ReactNode;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between md:gap-8 ${
        isLast ? "" : "border-b border-neutral-700"
      }`}
    >
      <div className="flex items-start gap-5">
        <span className="mt-1 font-mono text-[12px] text-neutral-500 tabular-nums">
          0{n}
        </span>
        <div>
          <h2 className="text-[17px] font-medium text-neutral-0 md:text-[18px]">
            {title}
          </h2>
          <p className="mt-1 text-[14px] text-neutral-300">{caption}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 self-stretch md:self-auto">
        {children}
      </div>
    </div>
  );
}

function MintStep({
  n,
  onReceipt,
}: {
  n: number;
  onReceipt: (receipt: { label: string; hash: Hex }) => void;
}) {
  const { address } = useAccount();
  const { onCorrectChain, ensureCorrectChain } = useChainGuard();
  const [amount, setAmount] = useState("25");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  async function onMint() {
    if (!address) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await ensureCorrectChain();
      const amt = parseUnits(amount || "0", 18);
      const h0 = await writeContractAsync({
        address: addresses.token0,
        abi: erc20Abi,
        functionName: "mint",
        args: [address, amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: h0 });
      onReceipt({ label: "Mint Token0", hash: h0 });
      const h1 = await writeContractAsync({
        address: addresses.token1,
        abi: erc20Abi,
        functionName: "mint",
        args: [address, amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: h1 });
      onReceipt({ label: "Mint Token1", hash: h1 });
    } catch (err) {
      setErrorMsg(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StepRow
      n={n}
      title="Mint test tokens"
      caption="Public mint on the mock Token0 / Token1 pair so you can interact freely."
    >
      <AmountInput value={amount} onChange={setAmount} suffix="each" width="6rem" />
      <Button
        tier="primary"
        disabled={!address || submitting || !amount || Number(amount) <= 0}
        onClick={onMint}
      >
        {!address
          ? "Connect"
          : !onCorrectChain
            ? "Switch network"
            : submitting
              ? "Minting…"
              : "Mint"}
      </Button>
      {errorMsg ? (
        <p className="basis-full text-[12px] text-negative">{errorMsg}</p>
      ) : null}
    </StepRow>
  );
}

function DepositStep({
  n,
  poolKey,
  status,
  onSuccess,
  onReceipt,
}: {
  n: number;
  poolKey: PoolKey;
  status: Status;
  onSuccess: () => void;
  onReceipt: (receipt: { label: string; hash: Hex }) => void;
}) {
  const { address } = useAccount();
  const { onCorrectChain, ensureCorrectChain } = useChainGuard();
  const [amount, setAmount] = useState("10");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  async function onDeposit() {
    if (!address) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await ensureCorrectChain();
      const amt = parseUnits(amount || "0", 18);
      const a0 = await writeContractAsync({
        address: addresses.token0,
        abi: erc20Abi,
        functionName: "approve",
        args: [addresses.idleYieldHook, amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: a0 });
      const a1 = await writeContractAsync({
        address: addresses.token1,
        abi: erc20Abi,
        functionName: "approve",
        args: [addresses.idleYieldHook, amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: a1 });
      const d = await writeContractAsync({
        address: addresses.idleYieldHook,
        abi: idleYieldHookAbi,
        functionName: "deposit",
        args: [poolKey, amt, amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: d });
      onReceipt({ label: "Deposit", hash: d });
      onSuccess();
    } catch (err) {
      setErrorMsg(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const caption =
    status === "ACTIVE_IN_RANGE"
      ? "Mints a V4 LP position owned by the hook. You hold ERC-6909 shares against it."
      : status === "PARKED_OUT_OF_RANGE"
        ? "Routes straight into the ERC-4626 vaults — capital starts earning yield immediately."
        : "Pool not registered yet.";

  return (
    <StepRow n={n} title="Deposit into the hook" caption={caption}>
      <AmountInput value={amount} onChange={setAmount} suffix="each" width="6rem" />
      <Button
        tier="primary"
        disabled={
          !address || status === "UNSET" || submitting || !amount || Number(amount) <= 0
        }
        onClick={onDeposit}
      >
        {!address
          ? "Connect"
          : status === "UNSET"
            ? "Not registered"
            : !onCorrectChain
              ? "Switch network"
              : submitting
                ? "Submitting…"
                : "Deposit"}
      </Button>
      {errorMsg ? (
        <p className="basis-full text-[12px] text-negative">{errorMsg}</p>
      ) : null}
    </StepRow>
  );
}

function SwapStep({
  n,
  poolKey,
  onSuccess,
  onReceipt,
}: {
  n: number;
  poolKey: PoolKey;
  onSuccess: () => void;
  onReceipt: (receipt: { label: string; hash: Hex }) => void;
}) {
  const { address } = useAccount();
  const { onCorrectChain, ensureCorrectChain } = useChainGuard();
  const [amount, setAmount] = useState("0.5");
  const [zeroForOne, setZeroForOne] = useState(true);
  const [slippageBps, setSlippageBps] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  async function onSwap() {
    if (!address) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await ensureCorrectChain();
      const amt = parseUnits(amount || "0", 18);
      const minOut = (amt * BigInt(10_000 - slippageBps)) / 10_000n;
      const input = zeroForOne ? addresses.token0 : addresses.token1;
      const a = await writeContractAsync({
        address: input,
        abi: erc20Abi,
        functionName: "approve",
        args: [addresses.v4Router, amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: a });
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
      const s = await writeContractAsync({
        address: addresses.v4Router,
        abi: v4RouterAbi,
        functionName: "swapExactTokensForTokens",
        args: [amt, minOut, zeroForOne, poolKey, "0x", address, deadline],
      });
      await publicClient?.waitForTransactionReceipt({ hash: s });
      onReceipt({ label: zeroForOne ? "Swap Token0 -> Token1" : "Swap Token1 -> Token0", hash: s });
      onSuccess();
    } catch (err) {
      setErrorMsg(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StepRow
      n={n}
      title="Trigger a swap"
      caption="Routes through the hook's LP — the 0.30% fee compounds into reserves."
      isLast
    >
      <AmountInput value={amount} onChange={setAmount} width="6rem" />
      <button
        type="button"
        onClick={() => setZeroForOne((v) => !v)}
        className="h-10 shrink-0 rounded-xl border border-neutral-700 bg-neutral-900 px-3 font-mono text-[12px] text-neutral-200 transition-colors hover:border-neutral-50/40 hover:text-neutral-0"
        aria-label="Swap direction"
      >
        {zeroForOne ? "Token0 → Token1" : "Token1 → Token0"}
      </button>
      <select
        value={slippageBps}
        onChange={(e) => setSlippageBps(Number(e.target.value))}
        className="h-10 rounded-xl border border-neutral-700 bg-neutral-900 px-3 font-mono text-[12px] text-neutral-200 outline-none transition-colors focus:border-neutral-50/40"
        aria-label="Swap slippage tolerance"
      >
        <option value={100}>1%</option>
        <option value={300}>3%</option>
        <option value={500}>5%</option>
      </select>
      <Button
        tier="primary"
        disabled={!address || submitting || !amount || Number(amount) <= 0}
        onClick={onSwap}
      >
        {!address
          ? "Connect"
          : !onCorrectChain
            ? "Switch network"
            : submitting
              ? "Swapping…"
              : "Swap"}
      </Button>
      {errorMsg ? (
        <p className="basis-full text-[12px] text-negative">{errorMsg}</p>
      ) : null}
    </StepRow>
  );
}

function YieldStep({
  n,
  enabled,
  onSuccess,
  onReceipt,
}: {
  n: number;
  enabled: boolean;
  onSuccess: () => void;
  onReceipt: (receipt: { label: string; hash: Hex }) => void;
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
      const a0 = await writeContractAsync({
        address: addresses.token0,
        abi: erc20Abi,
        functionName: "approve",
        args: [addresses.vault0, amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: a0 });
      const ac0 = await writeContractAsync({
        address: addresses.vault0,
        abi: mockYieldVaultAbi,
        functionName: "accrueYield",
        args: [amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: ac0 });
      onReceipt({ label: "Accrue Vault0", hash: ac0 });
      const a1 = await writeContractAsync({
        address: addresses.token1,
        abi: erc20Abi,
        functionName: "approve",
        args: [addresses.vault1, amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: a1 });
      const ac1 = await writeContractAsync({
        address: addresses.vault1,
        abi: mockYieldVaultAbi,
        functionName: "accrueYield",
        args: [amt],
      });
      await publicClient?.waitForTransactionReceipt({ hash: ac1 });
      onReceipt({ label: "Accrue Vault1", hash: ac1 });
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StepRow
      n={n}
      title="Accrue vault yield"
      caption="Adds underlying to both vaults — share price rises for parked depositors."
      isLast
    >
      <AmountInput value={amount} onChange={setAmount} suffix="each" width="6rem" />
      <Button
        tier="primary"
        disabled={!address || !enabled || submitting || !amount || Number(amount) <= 0}
        onClick={onAccrue}
      >
        {!address
          ? "Connect"
          : !enabled
            ? "Deposit first"
            : submitting
              ? "Accruing…"
              : "Accrue"}
      </Button>
    </StepRow>
  );
}

function InitializeStep({
  n,
  poolKey,
  onSuccess,
  onReceipt,
}: {
  n: number;
  poolKey: PoolKey;
  onSuccess: () => void;
  onReceipt: (receipt: { label: string; hash: Hex }) => void;
}) {
  const { address } = useAccount();
  const [submitting, setSubmitting] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  async function onInit() {
    if (!address) return;
    setSubmitting(true);
    try {
      const init = await writeContractAsync({
        address: addresses.poolManager,
        abi: poolManagerAbi,
        functionName: "initialize",
        args: [poolKey, parkedDemoPoolConfig.initialSqrtPriceX96],
      });
      await publicClient?.waitForTransactionReceipt({ hash: init });
      onReceipt({ label: "Initialize parked pool", hash: init });
      const reg = await writeContractAsync({
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
      await publicClient?.waitForTransactionReceipt({ hash: reg });
      onReceipt({ label: "Register parked pool", hash: reg });
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StepRow
      n={n}
      title="Initialise the parked-pool demo"
      caption="Creates a second V4 pool out of range and registers it if the exact config was pre-approved."
    >
      <Button
        tier="primary"
        disabled={!address || submitting}
        onClick={onInit}
      >
        {!address ? "Connect" : submitting ? "Initialising…" : "Initialise"}
      </Button>
    </StepRow>
  );
}

function AmountInput({
  value,
  onChange,
  suffix,
  width = "6rem",
}: {
  value: string;
  onChange: (v: string) => void;
  suffix?: ReactNode;
  width?: string;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 transition-colors duration-150 focus-within:border-neutral-50/40"
      style={{ width }}
    >
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent font-mono text-[14px] text-neutral-0 outline-none tabular-nums [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        placeholder="0"
        min="0"
      />
      {suffix ? (
        <span className="shrink-0 text-[12px] text-neutral-500">{suffix}</span>
      ) : null}
    </div>
  );
}
