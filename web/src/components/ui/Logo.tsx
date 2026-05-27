import type { SVGProps } from "react";

export function Logo({
  accent = "#3DFF8E",
  ...props
}: SVGProps<SVGSVGElement> & { accent?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="IdleYield"
      role="img"
      {...props}
    >
      <path
        d="M10 4 H6 V20 H10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
      <path
        d="M14 4 H18 V20 H14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
      <circle cx="12" cy="12" r="2.25" fill={accent} />
    </svg>
  );
}
