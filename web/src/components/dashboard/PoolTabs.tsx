"use client";

import type { ReactNode } from "react";

export type PoolMode = "active" | "parked";

const cn = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

type TabSpec = {
  id: PoolMode;
  label: string;
  caption: string;
  badge?: ReactNode;
};

const TABS: TabSpec[] = [
  {
    id: "active",
    label: "Fee pool",
    caption: "Live V4 liquidity collecting swap fees on X Layer mainnet.",
  },
  {
    id: "parked",
    label: "Vault demo",
    caption: "Out-of-range pool that routes deposits into ERC-4626 vault shares.",
  },
];

export function PoolTabs({
  mode,
  onChange,
}: {
  mode: PoolMode;
  onChange: (next: PoolMode) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="tablist" aria-label="Pool mode">
      {TABS.map((tab) => {
        const active = tab.id === mode;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "group relative rounded-2xl border p-5 text-left transition-all",
              active
                ? "border-accent-mint/40 bg-accent-mint/[0.08] shadow-[0_0_0_1px_var(--accent-mint-glow),0_12px_36px_-12px_var(--accent-mint-glow)]"
                : "border-border-subtle bg-bg-card hover:border-border-strong hover:bg-bg-card-hover",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "inline-block size-2 rounded-full",
                  tab.id === "active" ? "bg-accent-mint" : "bg-warning",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium uppercase tracking-[0.16em]",
                  active ? "text-accent-mint" : "text-text-muted",
                )}
              >
                {tab.id === "active" ? "Active range" : "Parked range"}
              </span>
            </div>
            <div className="mt-2 text-base font-semibold text-text-primary">
              {tab.label}
            </div>
            <div className="mt-1 text-[12px] text-text-muted">{tab.caption}</div>
          </button>
        );
      })}
    </div>
  );
}
