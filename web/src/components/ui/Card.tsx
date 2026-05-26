import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  interactive?: boolean;
  /** Adds a small mint accent strip along the top edge. */
  accent?: boolean;
};

const cn = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

export function Card({ children, interactive, accent, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border-subtle bg-bg-card",
        "transition-all duration-200",
        interactive &&
          "hover:border-accent-mint/30 hover:shadow-[0_0_0_1px_var(--accent-mint-glow),0_8px_32px_-12px_var(--accent-mint-glow)]",
        accent && "before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-accent-mint/50",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  eyebrow,
  title,
  right,
  className,
}: {
  eyebrow?: string;
  title?: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-6 pt-6", className)}>
      <div>
        {eyebrow && (
          <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-muted">
            {eyebrow}
          </div>
        )}
        {title && <div className="mt-1 text-sm font-medium text-text-primary">{title}</div>}
      </div>
      {right}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-6", className)}>{children}</div>;
}

export function CardDivider() {
  return <div className="mx-6 h-px bg-border-subtle" />;
}
