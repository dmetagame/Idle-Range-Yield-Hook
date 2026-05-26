"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Bell } from "lucide-react";

import { NetworkBadge } from "@/components/ui/NetworkBadge";

const NAV_ITEMS = [
  { label: "Pools", href: "#pools", active: true },
  { label: "Swap", href: "#swap", active: false },
  { label: "Vaults", href: "#vaults", active: false },
  {
    label: "Docs",
    href: "https://github.com/dmetagame/Idle-Range-Yield-Hook",
    active: false,
    external: true,
  },
] as const;

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border-subtle bg-bg-base/80 px-4 py-3 backdrop-blur-md sm:gap-6 sm:px-6 sm:py-4">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg bg-gradient-to-br from-accent-mint to-accent-teal shadow-[0_0_24px_var(--accent-mint-glow)]" />
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-text-primary">
          IdleYield
        </div>
      </div>

      <nav className="hidden items-center gap-1 rounded-full border border-border-subtle bg-white/[0.02] p-1 md:flex">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            target={"external" in item && item.external ? "_blank" : undefined}
            rel={"external" in item && item.external ? "noreferrer" : undefined}
            className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition-colors ${
              item.active
                ? "bg-accent-mint text-bg-base"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <NetworkBadge />
        <button
          type="button"
          aria-label="Notifications"
          className="hidden size-9 items-center justify-center rounded-full border border-border-subtle bg-white/[0.02] text-text-muted transition-colors hover:text-text-primary md:inline-flex"
        >
          <Bell className="size-4" strokeWidth={1.5} />
        </button>
        <ConnectButton chainStatus="icon" accountStatus="address" />
      </div>
    </header>
  );
}
