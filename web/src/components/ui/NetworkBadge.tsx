"use client";

import { useAccount } from "wagmi";

import { xLayer } from "@/lib/chains";

export function NetworkBadge() {
  const { isConnected, chainId } = useAccount();
  const onCorrect = chainId === xLayer.id;
  const live = isConnected && onCorrect;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-text-secondary">
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${
          live ? "bg-accent-mint shadow-[0_0_8px_var(--accent-mint)]" : "bg-text-muted"
        }`}
      />
      X Layer
      <span className="hidden text-text-muted sm:inline">· chain {xLayer.id}</span>
    </div>
  );
}
