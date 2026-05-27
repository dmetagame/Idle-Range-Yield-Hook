"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

import { Logo } from "@/components/ui/Logo";
import { NetworkBadge } from "@/components/ui/NetworkBadge";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-700 bg-neutral-900/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="size-7 text-neutral-0" />
          <span className="text-[14px] font-medium tracking-[0.12em] text-neutral-0">
            IdleYield
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <NetworkBadge />
          <ConnectButton chainStatus="none" accountStatus="address" showBalance={false} />
        </div>
      </div>
    </header>
  );
}
