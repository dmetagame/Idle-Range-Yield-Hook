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
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border-subtle bg-white/[0.02] px-3 py-1 text-[11px]",
        className,
      )}
    >
      <span className="text-text-muted">{label}</span>
      <span className="font-mono text-text-secondary">{short}</span>
      <button
        type="button"
        onClick={onCopy}
        className="text-text-muted transition-colors hover:text-accent-mint"
        aria-label={`Copy ${label} address`}
      >
        {copied ? (
          <Check className="size-3.5" strokeWidth={2} />
        ) : (
          <Copy className="size-3.5" strokeWidth={1.5} />
        )}
      </button>
      <a
        href={`${EXPLORER}/${address}`}
        target="_blank"
        rel="noreferrer"
        className="text-text-muted transition-colors hover:text-accent-mint"
        aria-label={`View ${label} on OKLink`}
      >
        <ExternalLink className="size-3.5" strokeWidth={1.5} />
      </a>
    </span>
  );
}
