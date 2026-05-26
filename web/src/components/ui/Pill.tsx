import type { ButtonHTMLAttributes, ReactNode } from "react";

type Tone = "mint" | "amber" | "muted" | "negative" | "ghost";

type PillProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  active?: boolean;
  dot?: boolean;
  children: ReactNode;
};

const cn = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

const TONES: Record<Tone, { base: string; dot: string; active: string }> = {
  mint: {
    base: "border-accent-mint/30 bg-accent-mint/10 text-accent-mint hover:bg-accent-mint/15",
    dot: "bg-accent-mint",
    active: "bg-accent-mint text-bg-base hover:bg-accent-mint",
  },
  amber: {
    base: "border-warning/30 bg-warning/10 text-warning hover:bg-warning/15",
    dot: "bg-warning",
    active: "bg-warning text-bg-base",
  },
  muted: {
    base: "border-border-subtle bg-white/[0.02] text-text-muted hover:text-text-secondary hover:border-border-strong",
    dot: "bg-text-muted",
    active: "bg-text-secondary/15 text-text-primary",
  },
  negative: {
    base: "border-negative/30 bg-negative/10 text-negative",
    dot: "bg-negative",
    active: "bg-negative text-bg-base",
  },
  ghost: {
    base: "border-transparent bg-transparent text-text-muted hover:text-text-primary",
    dot: "bg-text-muted",
    active: "bg-white/5 text-text-primary",
  },
};

export function Pill({
  tone = "mint",
  active,
  dot,
  children,
  className,
  type = "button",
  ...rest
}: PillProps) {
  const palette = TONES[tone];
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide transition-colors",
        active ? palette.active : palette.base,
        className,
      )}
      {...rest}
    >
      {dot && (
        <span
          aria-hidden
          className={cn("inline-block size-1.5 rounded-full", palette.dot)}
        />
      )}
      {children}
    </button>
  );
}
