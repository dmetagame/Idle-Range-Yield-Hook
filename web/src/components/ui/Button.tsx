import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

const cn = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

type Tier = "primary" | "secondary" | "tertiary";

const TIERS: Record<Tier, string> = {
  primary:
    "bg-accent text-neutral-900 hover:bg-accent/90 disabled:opacity-40 disabled:hover:bg-accent",
  secondary:
    "border border-neutral-700 text-neutral-50 hover:border-neutral-50/40 hover:text-neutral-0",
  tertiary:
    "text-neutral-300 hover:text-neutral-0 underline-offset-4 hover:underline",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tier?: Tier;
  children: ReactNode;
};

export function Button({
  tier = "primary",
  className,
  children,
  type = "button",
  disabled,
  ...rest
}: ButtonProps) {
  const sizing =
    tier === "tertiary" ? "" : "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium";
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        sizing,
        "transition-colors duration-150 disabled:cursor-not-allowed",
        TIERS[tier],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  tier?: Tier;
  children: ReactNode;
};

export function ButtonLink({
  tier = "secondary",
  className,
  children,
  ...rest
}: LinkProps) {
  const sizing =
    tier === "tertiary" ? "" : "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium";
  return (
    <a
      className={cn(
        sizing,
        "transition-colors duration-150",
        TIERS[tier],
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  );
}
