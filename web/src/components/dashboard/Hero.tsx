"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ShieldCheck } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { addresses } from "@/lib/contracts";

export function Hero() {
  return (
    <section className="mx-auto max-w-3xl px-6 pt-20 pb-8 md:pt-32 md:pb-12">
      <div className="mb-6 inline-flex items-center gap-2 rounded-xl border border-accent/35 px-3 py-2 text-[13px] text-accent">
        <ShieldCheck className="size-4" strokeWidth={1.5} />
        Hardened X Layer mainnet deployment
      </div>
      <h1 className="text-balance text-[40px] font-semibold leading-[1.05] tracking-tight text-neutral-0 md:text-[56px]">
        Concentrated LP capital that never sleeps.
      </h1>
      <p className="mt-6 max-w-2xl text-[17px] text-neutral-300 md:text-[19px]">
        A Uniswap V4 hook that earns swap fees while in range and lending yield while out.
        One contract. Two paths. Both live on X Layer mainnet.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-3">
        <ConnectButton.Custom>
          {({ account, openConnectModal, mounted }) => {
            const ready = mounted;
            if (!ready) return null;
            if (!account) {
              return (
                <button
                  type="button"
                  onClick={openConnectModal}
                  className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-3 text-[15px] font-medium text-neutral-900 transition-colors duration-150 hover:bg-accent/90"
                >
                  Connect &amp; deposit →
                </button>
              );
            }
            return (
              <a
                href="#steps"
                className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-3 text-[15px] font-medium text-neutral-900 transition-colors duration-150 hover:bg-accent/90"
              >
                Start the demo →
              </a>
            );
          }}
        </ConnectButton.Custom>
        <ButtonLink
          tier="secondary"
          href={`https://www.oklink.com/xlayer/address/${addresses.idleYieldHook}`}
          target="_blank"
          rel="noreferrer"
          className="px-5 py-3 text-[15px]"
        >
          View hook on explorer
        </ButtonLink>
      </div>
    </section>
  );
}
