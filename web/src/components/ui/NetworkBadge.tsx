"use client";

import { useAccount } from "wagmi";

import { xLayer } from "@/lib/chains";

/**
 * Only renders when the user is connected to the wrong chain.
 * On the correct chain we say nothing — the connect button is already authoritative.
 */
export function NetworkBadge() {
  const { isConnected, chainId } = useAccount();
  if (!isConnected || chainId === xLayer.id) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-negative/40 bg-negative/5 px-3 py-1.5 text-[13px] text-negative">
      <span aria-hidden className="size-1.5 rounded-full bg-negative" />
      Switch to X Layer
    </div>
  );
}
