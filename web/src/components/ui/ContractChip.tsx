"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

const cn = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

const EXPLORER = "https://www.oklink.com/xlayer/address";

export function ContractChip({
  label,
  address,
  className,
}: {
  label: string;
  address: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* no-op */
    }
  }
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-2 text-[13px]",
        className,
      )}
    >
      <span className="text-neutral-300">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-neutral-50">{short}</span>
        <button
          type="button"
          onClick={onCopy}
          className="text-neutral-500 transition-colors hover:text-neutral-0"
          aria-label={`Copy ${label} address`}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
        <a
          href={`${EXPLORER}/${address}`}
          target="_blank"
          rel="noreferrer"
          className="text-neutral-500 transition-colors hover:text-neutral-0"
          aria-label={`View ${label} on OKLink`}
        >
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
