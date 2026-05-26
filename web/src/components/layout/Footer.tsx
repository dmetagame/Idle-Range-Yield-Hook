import { ExternalLink } from "lucide-react";

import { ContractChip } from "@/components/ui/ContractChip";
import { addresses } from "@/lib/contracts";

const NAV = [
  {
    label: "Docs",
    href: "https://github.com/dmetagame/Idle-Range-Yield-Hook#readme",
  },
  {
    label: "GitHub",
    href: "https://github.com/dmetagame/Idle-Range-Yield-Hook",
  },
  {
    label: "OKLink",
    href: `https://www.oklink.com/xlayer/address/${addresses.idleYieldHook}`,
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border-subtle bg-bg-base/40 px-4 py-6 sm:mt-16 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap gap-2">
          <ContractChip label="Hook" address={addresses.idleYieldHook} />
          <ContractChip label="Token0" address={addresses.token0} />
          <ContractChip label="Token1" address={addresses.token1} />
          <ContractChip label="Vault0" address={addresses.vault0} />
          <ContractChip label="Vault1" address={addresses.vault1} />
          <ContractChip label="V4Router" address={addresses.v4Router} />
        </div>

        <div className="flex flex-col items-start justify-between gap-4 text-[12px] text-text-muted sm:flex-row sm:items-center">
          <div>Built for the X Layer Build X Hackathon 2026.</div>
          <nav className="flex items-center gap-5">
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 transition-colors hover:text-accent-mint"
              >
                {item.label}
                <ExternalLink className="size-3" strokeWidth={1.5} />
              </a>
            ))}
          </nav>
        </div>

        <p className="max-w-3xl text-[11px] leading-snug text-text-faint">
          Mechanism note: the on-chain demo covers ACTIVE (V4 LP, swap fees) directly and
          PARKED (ERC-4626 vault yield) via the second pool plus the
          {" "}
          <code className="rounded bg-white/[0.04] px-1 font-mono text-text-muted">
            test_yieldAccrues_increasesReservesAndSharePrice
          </code>
          {" "}
          unit test.
        </p>
      </div>
    </footer>
  );
}
