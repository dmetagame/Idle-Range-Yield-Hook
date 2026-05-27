"use client";

import {
  Check,
  Copy,
  ExternalLink,
  Route,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { Address, Hex } from "viem";

import { ButtonLink } from "@/components/ui/Button";
import { addresses } from "@/lib/contracts";
import { oklinkAddressUrl, oklinkTxUrl, shortHex } from "@/lib/explorer";
import {
  buildOkxDexSwapApiUrl,
  integrationLinks,
  OKX_DEX_CHAIN_INDEX,
} from "@/lib/integrations";

export type TransactionReceipt = {
  label: string;
  hash: Hex;
  at: number;
};

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
  const okxApiUrl = useMemo(
    () => (account ? buildOkxDexSwapApiUrl({ user: account }) : undefined),
    [account],
  );

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
          body="Wallet entry, X Layer gas, and mainnet account flow."
        >
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
          body={`Swap API scaffold set for chainIndex ${OKX_DEX_CHAIN_INDEX}.`}
        >
          <ButtonLink
            href={integrationLinks.okxDexApiDocs}
            target="_blank"
            rel="noreferrer"
            className="gap-2 px-3 py-2 text-[13px]"
          >
            API <ExternalLink className="size-3.5" />
          </ButtonLink>
          {okxApiUrl ? <CopyButton value={okxApiUrl} label="Quote URL" /> : null}
        </IntegrationBlock>
      </div>

      <div className="border-t border-neutral-700 py-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[17px] font-medium text-neutral-0 md:text-[18px]">
            Recent receipts
          </h2>
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
        <div className="mt-3 divide-y divide-neutral-700">
          {receipts.length > 0 ? (
            receipts.map((receipt) => (
              <a
                key={`${receipt.hash}-${receipt.label}`}
                href={oklinkTxUrl(receipt.hash)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-4 py-2 text-[13px] transition-colors hover:text-accent"
              >
                <span className="text-neutral-300">{receipt.label}</span>
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
    </section>
  );
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
