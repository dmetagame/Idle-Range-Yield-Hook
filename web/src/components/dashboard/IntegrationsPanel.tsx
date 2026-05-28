"use client";

import {
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  Route,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { formatUnits } from "viem";
import type { Address, Hex } from "viem";
import { usePublicClient } from "wagmi";

import { Button, ButtonLink } from "@/components/ui/Button";
import { idleYieldHookAbi } from "@/lib/abi";
import { addresses } from "@/lib/contracts";
import { oklinkAddressUrl, oklinkTxUrl, shortHex } from "@/lib/explorer";
import {
  buildOkxDexProxySwapUrl,
  buildOkxDexSwapApiUrl,
  integrationLinks,
  OKX_DEX_CHAIN_INDEX,
  proofTransactions,
} from "@/lib/integrations";
import { switchToXLayer } from "@/lib/wallet";

export type TransactionReceipt = {
  label: string;
  hash: Hex;
  at: number;
};

type HookEventName =
  | "PoolRegistered"
  | "Deposited"
  | "Withdrawn"
  | "V4LiquidityMinted"
  | "V4LiquidityBurned"
  | "Parked"
  | "Unparked";

type HookEventRow = {
  eventName: HookEventName;
  hash: Hex;
  blockNumber: bigint;
  logIndex: number;
  detail: string;
};

const HOOK_EVENT_NAMES = [
  "PoolRegistered",
  "Deposited",
  "Withdrawn",
  "V4LiquidityMinted",
  "V4LiquidityBurned",
  "Parked",
  "Unparked",
] as const satisfies readonly HookEventName[];

const EVENT_SCAN_BLOCKS = 100n;

export function IntegrationsPanel({
  poolMode,
  poolId,
  account,
  receipts,
}: {
  poolMode: "active" | "parked";
  poolId: Hex;
  account: Address | undefined;
  receipts: TransactionReceipt[];
}) {
  const publicClient = usePublicClient();
  const [hookEvents, setHookEvents] = useState<HookEventRow[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventError, setEventError] = useState<string | undefined>();
  const [switchingChain, setSwitchingChain] = useState(false);
  const [walletMessage, setWalletMessage] = useState<string | undefined>();
  const [checkingOkxRoute, setCheckingOkxRoute] = useState(false);
  const [okxRouteMessage, setOkxRouteMessage] = useState<string | undefined>();
  const okxApiUrl = useMemo(
    () => (account ? buildOkxDexSwapApiUrl({ user: account }) : undefined),
    [account],
  );
  const okxProxyUrl = useMemo(
    () => (account ? buildOkxDexProxySwapUrl({ user: account }) : undefined),
    [account],
  );

  async function onSwitchXLayer() {
    setSwitchingChain(true);
    setWalletMessage(undefined);
    try {
      await switchToXLayer();
      setWalletMessage("X Layer request sent to wallet.");
    } catch (error) {
      setWalletMessage(error instanceof Error ? error.message : "Wallet request failed");
    } finally {
      setSwitchingChain(false);
    }
  }

  async function onLoadEvents() {
    if (!publicClient) return;
    setLoadingEvents(true);
    setEventError(undefined);
    try {
      const latest = await publicClient.getBlockNumber();
      const fromBlock = latest > EVENT_SCAN_BLOCKS ? latest - EVENT_SCAN_BLOCKS : 0n;
      const results = await Promise.all(
        HOOK_EVENT_NAMES.map((eventName) =>
          publicClient.getContractEvents({
            address: addresses.idleYieldHook,
            abi: idleYieldHookAbi,
            eventName,
            args: { poolId },
            fromBlock,
            toBlock: latest,
            strict: true,
          }),
        ),
      );
      const rows = results
        .flat()
        .map((event) => {
          if (!event.transactionHash || event.blockNumber === null) return undefined;
          const eventName = event.eventName as HookEventName;
          return {
            eventName,
            hash: event.transactionHash,
            blockNumber: event.blockNumber,
            logIndex: event.logIndex,
            detail: formatHookEvent(eventName, event.args as Record<string, unknown>),
          };
        })
        .filter((event): event is HookEventRow => Boolean(event))
        .sort((a, b) => {
          if (a.blockNumber === b.blockNumber) return b.logIndex - a.logIndex;
          return b.blockNumber > a.blockNumber ? 1 : -1;
        })
        .slice(0, 12);
      setHookEvents(rows);
    } catch (error) {
      setEventError(error instanceof Error ? error.message : "Unable to load events");
    } finally {
      setLoadingEvents(false);
    }
  }

  async function onCheckOkxRoute() {
    if (!okxProxyUrl) return;
    setCheckingOkxRoute(true);
    setOkxRouteMessage(undefined);
    try {
      const response = await fetch(okxProxyUrl);
      const body = await response.json();
      if (response.ok) {
        setOkxRouteMessage("Signed route returned by OKX DEX.");
      } else if (body?.configured === false) {
        setOkxRouteMessage("Server route is ready. Add OKX API env keys to enable live quotes.");
      } else {
        const upstreamMessage =
          body?.data?.msg ?? body?.data?.message ?? body?.error ?? "OKX route unavailable.";
        setOkxRouteMessage(String(upstreamMessage));
      }
    } catch (error) {
      setOkxRouteMessage(error instanceof Error ? error.message : "OKX route check failed.");
    } finally {
      setCheckingOkxRoute(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-6 pt-20 md:pt-32">
      <div className="font-mono text-[12px] uppercase tracking-wide text-neutral-500">
        Integrations
      </div>

      <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-8 border-t border-neutral-700 py-6 md:grid-cols-3">
        <IntegrationBlock
          icon={<ShieldCheck className="size-4" strokeWidth={1.5} />}
          title="OKLink"
          body={`${poolMode === "active" ? "Fee pool" : "Vault demo"} ${shortHex(poolId, 8, 6)}`}
        >
          <ButtonLink
            href={oklinkAddressUrl(addresses.idleYieldHook)}
            target="_blank"
            rel="noreferrer"
            className="gap-2 px-3 py-2 text-[13px]"
          >
            Hook <ExternalLink className="size-3.5" />
          </ButtonLink>
          <CopyButton value={poolId} label="Pool id" />
        </IntegrationBlock>

        <IntegrationBlock
          icon={<WalletCards className="size-4" strokeWidth={1.5} />}
          title="OKX Wallet"
          body={walletMessage ?? "Wallet entry, X Layer gas, and mainnet account flow."}
        >
          <Button
            tier="secondary"
            onClick={onSwitchXLayer}
            disabled={switchingChain}
            className="gap-2 px-3 py-2 text-[13px]"
          >
            {switchingChain ? "Switching" : "X Layer"}
          </Button>
          <ButtonLink
            href={integrationLinks.okxWalletDownload}
            target="_blank"
            rel="noreferrer"
            className="gap-2 px-3 py-2 text-[13px]"
          >
            Wallet <ExternalLink className="size-3.5" />
          </ButtonLink>
          <ButtonLink
            tier="tertiary"
            href={integrationLinks.okxDexSwap}
            target="_blank"
            rel="noreferrer"
            className="text-[13px]"
          >
            DEX
          </ButtonLink>
        </IntegrationBlock>

        <IntegrationBlock
          icon={<Route className="size-4" strokeWidth={1.5} />}
          title="OKX DEX"
          body={
            okxRouteMessage ??
            `Server-signed V6 route wired for chainIndex ${OKX_DEX_CHAIN_INDEX}.`
          }
        >
          <ButtonLink
            href={integrationLinks.okxDexApiDocs}
            target="_blank"
            rel="noreferrer"
            className="gap-2 px-3 py-2 text-[13px]"
          >
            API <ExternalLink className="size-3.5" />
          </ButtonLink>
          <Button
            tier="secondary"
            onClick={onCheckOkxRoute}
            disabled={!account || checkingOkxRoute}
            className="gap-2 px-3 py-2 text-[13px]"
          >
            {checkingOkxRoute ? "Checking" : "Route"}
          </Button>
          {okxApiUrl ? <CopyButton value={okxApiUrl} label="Quote URL" /> : null}
        </IntegrationBlock>
      </div>

      <div className="border-t border-neutral-700 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[17px] font-medium text-neutral-0 md:text-[18px]">
            Verification feed
          </h2>
          <div className="flex items-center gap-4">
            <Button
              tier="secondary"
              onClick={onLoadEvents}
              disabled={loadingEvents}
              className="gap-2 px-3 py-2 text-[13px]"
            >
              <RefreshCw className={`size-3.5 ${loadingEvents ? "animate-spin" : ""}`} />
              Events
            </Button>
            <ButtonLink
              tier="tertiary"
              href={integrationLinks.aaveAdapterSource}
              target="_blank"
              rel="noreferrer"
              className="text-[13px]"
            >
              Aave adapter
            </ButtonLink>
          </div>
        </div>

        <div className="mt-5">
          <div className="font-mono text-[12px] uppercase tracking-wide text-neutral-500">
            On-chain hook events
          </div>
          <div className="mt-2 divide-y divide-neutral-700">
            {hookEvents.length > 0 ? (
              hookEvents.map((event) => (
                <a
                  key={`${event.hash}-${event.logIndex}`}
                  href={oklinkTxUrl(event.hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-4 py-2 text-[13px] transition-colors hover:text-accent"
                >
                  <span className="min-w-0">
                    <span className="text-neutral-50">{event.eventName}</span>
                    <span className="ml-2 text-neutral-500">{event.detail}</span>
                  </span>
                  <span className="flex items-center gap-2 font-mono text-neutral-50">
                    {shortHex(event.hash)}
                    <ExternalLink className="size-3.5 text-neutral-500" />
                  </span>
                </a>
              ))
            ) : (
              <div className="py-2 text-[13px] text-neutral-500">
                {eventError ??
                  "Click Events to scan the selected pool's latest 100 blocks."}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="font-mono text-[12px] uppercase tracking-wide text-neutral-500">
            Known proof txs
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
                <span className="min-w-0">
                  <span className="text-neutral-50">{tx.label}</span>
                  <span className="ml-2 text-neutral-500">{tx.detail}</span>
                </span>
                <span className="flex items-center gap-2 font-mono text-neutral-50">
                  {shortHex(tx.hash)}
                  <ExternalLink className="size-3.5 text-neutral-500" />
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="font-mono text-[12px] uppercase tracking-wide text-neutral-500">
            Local receipts
          </div>
          <div className="mt-2 divide-y divide-neutral-700">
            {receipts.length > 0 ? (
              receipts.map((receipt) => (
                <a
                  key={`${receipt.hash}-${receipt.label}`}
                  href={oklinkTxUrl(receipt.hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-4 py-2 text-[13px] transition-colors hover:text-accent"
                >
                  <span className="min-w-0 text-neutral-300">{receipt.label}</span>
                  <span className="flex items-center gap-2 font-mono text-neutral-50">
                    {shortHex(receipt.hash)}
                    <ExternalLink className="size-3.5 text-neutral-500" />
                  </span>
                </a>
              ))
            ) : (
              <div className="py-2 text-[13px] text-neutral-500">
                No local transaction receipts in this browser yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function formatHookEvent(eventName: HookEventName, args: Record<string, unknown>) {
  if (eventName === "PoolRegistered") {
    return `range ${String(args.lowerTick)} to ${String(args.upperTick)}`;
  }
  if (eventName === "Deposited" || eventName === "Withdrawn") {
    return `${shortHex(String(args.user))} · ${fmtAmount(args.amount0)} / ${fmtAmount(args.amount1)}`;
  }
  if (eventName === "V4LiquidityMinted") {
    return `LP ${fmtRaw(args.liquidity)} · ${fmtAmount(args.used0)} / ${fmtAmount(args.used1)}`;
  }
  if (eventName === "V4LiquidityBurned") {
    return `LP ${fmtRaw(args.liquidity)} · ${fmtAmount(args.received0)} / ${fmtAmount(args.received1)}`;
  }
  return `${fmtAmount(args.amount0)} / ${fmtAmount(args.amount1)}`;
}

function fmtAmount(value: unknown) {
  if (typeof value !== "bigint") return "0";
  return Number(formatUnits(value, 18)).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function fmtRaw(value: unknown) {
  if (typeof value !== "bigint") return "0";
  return value.toLocaleString();
}

function IntegrationBlock({
  icon,
  title,
  body,
  children,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-neutral-0">
        {icon}
        <h2 className="text-[15px] font-medium">{title}</h2>
      </div>
      <p className="mt-2 min-h-[3.5rem] text-[13px] text-neutral-300">{body}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">{children}</div>
    </div>
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
