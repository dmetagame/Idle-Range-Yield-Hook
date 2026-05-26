"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

const cn = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

export function ActionCard({
  eyebrow,
  title,
  caption,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  caption?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-border-subtle bg-bg-card p-5 transition-all hover:border-accent-mint/30 hover:shadow-[0_0_0_1px_var(--accent-mint-glow),0_12px_40px_-16px_var(--accent-mint-glow)]",
        className,
      )}
    >
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-muted">
        {eyebrow}
      </div>
      <div className="mt-1 text-sm font-medium text-text-primary">{title}</div>
      {caption && <p className="mt-1 text-[11px] text-text-faint">{caption}</p>}
      <div className="mt-4 flex flex-col gap-3">{children}</div>
    </div>
  );
}

type ButtonTone = "mint" | "teal" | "amber" | "muted";

const BUTTON_TONES: Record<ButtonTone, string> = {
  mint: "bg-accent-mint text-bg-base hover:bg-accent-mint-dim shadow-[0_0_24px_-8px_var(--accent-mint-glow)]",
  teal: "bg-accent-teal text-bg-base hover:bg-accent-teal/85",
  amber: "bg-warning text-bg-base hover:bg-warning/90",
  muted: "bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary",
};

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  children: ReactNode;
};

export function ActionButton({
  tone = "mint",
  className,
  children,
  type = "button",
  disabled,
  ...rest
}: ActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none",
        BUTTON_TONES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

type ActionInputProps = InputHTMLAttributes<HTMLInputElement> & {
  suffix?: ReactNode;
  label?: string;
};

export function ActionInput({ suffix, label, className, ...rest }: ActionInputProps) {
  return (
    <label className="flex flex-col gap-1">
      {label && (
        <span className="text-[10px] uppercase tracking-[0.12em] text-text-faint">{label}</span>
      )}
      <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-base px-3 py-2 transition-colors focus-within:border-accent-mint/40">
        <input
          inputMode="decimal"
          className={cn(
            "w-full bg-transparent font-mono text-sm text-text-primary outline-none placeholder:text-text-faint",
            className,
          )}
          {...rest}
        />
        {suffix && <span className="text-[11px] text-text-muted">{suffix}</span>}
      </div>
    </label>
  );
}
