import type { HTMLAttributes, ReactNode } from "react";

const cn = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

type CardProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode };

/**
 * A flat surface card. No border, no shadow, no hover effects — relies on a subtle
 * background wash to separate from the page. Use sparingly; most sections sit
 * directly on the page background.
 */
export function Card({ children, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white/[0.025] p-6 md:p-8",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
