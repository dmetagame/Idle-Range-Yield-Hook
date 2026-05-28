"use client";

import { Check, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { formatUnits, type Address, type Hex } from "viem";

import { ButtonLink } from "@/components/ui/Button";
import { addresses } from "@/lib/contracts";
import { oklinkAddressUrl, oklinkTxUrl, shortHex } from "@/lib/explorer";
import { proofTransactions } from "@/lib/integrations";

type Status = "UNSET" | "ACTIVE_IN_RANGE" | "PARKED_OUT_OF_RANGE";

const fmt = (v: bigint, max = 4) =>
  Number(formatUnits(v, 18)).toLocaleString(undefined, { maximumFractionDigits: max });

const cn = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

export function ProofPanel({
  poolMode,
  poolId,
  status,
  owner,
  latestBlock,
  reserve0,
  reserve1,
  currentTick,
  lowerTick,
  upperTick,
  liquidityInPool,
  totalShares,
}: {
  poolMode: "active" | "parked";
  poolId: Hex;
  status: Status;
  owner: Address | undefined;
  latestBlock: bigint | undefined;
  reserve0: bigint;
  reserve1: bigint;
  currentTick: number | undefined;
  lowerTick: number;
  upperTick: number;
  liquidityInPool: bigint;
  totalShares: bigint;
}) {
  const modeLabel = poolMode === "active" ? "Fee pool" : "Vault demo";
  const total = reserve0 + reserve1;

  return (
    <section className="mx-auto max-w-3xl px-6 pt-20 md:pt-32">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-mono text-[12px] uppercase tracking-wide text-neutral-500">
            Live proof
          </div>
          <h2 className="mt-2 text-[24px] font-medium leading-tight text-neutral-0 md:text-[28px]">
            Hardened deployment, readable on-chain.
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-accent/35 px-3 py-2 text-[13px] text-accent">
          <ShieldCheck className="size-4" strokeWidth={1.5} />
          Hardened mainnet
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-8 border-y border-neutral-700 py-6 md:grid-cols-2">
        <div className="divide-y divide-neutral-700">
          <ProofRow label="Selected pool" value={modeLabel} />
          <ProofRow
            label="Status"
            value={
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    status === "ACTIVE_IN_RANGE"
                      ? "bg-accent"
                      : status === "PARKED_OUT_OF_RANGE"
                        ? "bg-neutral-300"
                        : "bg-neutral-500",
                  )}
                />
                {status.replace(/_/g, " ")}
              </span>
            }
          />
          <ProofRow label="Latest block" value={latestBlock?.toString() ?? "syncing"} />
          <ProofRow label="Current tick" value={currentTick?.toString() ?? "unread"} />
          <ProofRow label="Managed range" value={`${lowerTick} to ${upperTick}`} />
        </div>

        <div className="divide-y divide-neutral-700">
          <ProofRow label="Total reserves" value={`${fmt(total)} tokens`} />
          <ProofRow label="Reserve Token0" value={fmt(reserve0)} />
          <ProofRow label="Reserve Token1" value={fmt(reserve1)} />
          <ProofRow label="V4 LP liquidity" value={liquidityInPool.toString()} />
          <ProofRow label="ERC-6909 shares" value={fmt(totalShares)} />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2">
        <div>
          <div className="font-mono text-[12px] uppercase tracking-wide text-neutral-500">
            Contracts
          </div>
          <div className="mt-2 divide-y divide-neutral-700">
            <ProofAddress label="Hook" address={addresses.idleYieldHook} />
            {owner ? <ProofAddress label="Owner" address={owner} /> : null}
            <ProofAddress label="Token0" address={addresses.token0} />
            <ProofAddress label="Token1" address={addresses.token1} />
            <ProofAddress label="Vault0" address={addresses.vault0} />
            <ProofAddress label="Vault1" address={addresses.vault1} />
          </div>
        </div>

        <div>
          <div className="font-mono text-[12px] uppercase tracking-wide text-neutral-500">
            Proof txs
          </div>
          <div className="mt-2 divide-y divide-neutral-700">
            {proofTransactions.map((tx) => (
              <a
                key={tx.hash}
                href={oklinkTxUrl(tx.hash)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-4 py-2 text-[13px] transition-colors hover:text-accent"
              >
                <span className="min-w-0 text-neutral-300">{tx.label}</span>
                <span className="flex items-center gap-2 font-mono text-neutral-50">
                  {shortHex(tx.hash)}
                  <ExternalLink className="size-3.5 text-neutral-500" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <ButtonLink
          href={oklinkAddressUrl(addresses.idleYieldHook)}
          target="_blank"
          rel="noreferrer"
          className="gap-2 px-3 py-2 text-[13px]"
        >
          Hook <ExternalLink className="size-3.5" />
        </ButtonLink>
        <CopyButton value={poolId} label="Pool id" />
      </div>
    </section>
  );
}

function ProofRow({ label, value }: { label: string; value: string | ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-[13px]">
      <span className="text-neutral-500">{label}</span>
      <span className="min-w-0 text-right font-mono text-neutral-50 tabular-nums">
        {value}
      </span>
    </div>
  );
}

function ProofAddress({ label, address }: { label: string; address: Address }) {
  return (
    <a
      href={oklinkAddressUrl(address)}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-4 py-2 text-[13px] transition-colors hover:text-accent"
    >
      <span className="text-neutral-500">{label}</span>
      <span className="flex items-center gap-2 font-mono text-neutral-50">
        {shortHex(address)}
        <ExternalLink className="size-3.5 text-neutral-500" />
      </span>
    </a>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* no-op */
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-2 text-[13px] text-neutral-300 transition-colors hover:text-neutral-0"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {label}
    </button>
  );
}
