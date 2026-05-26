type Status = "UNSET" | "ACTIVE_IN_RANGE" | "PARKED_OUT_OF_RANGE";

const cn = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

export function StateStrip({ status }: { status: Status }) {
  const isActive = status === "ACTIVE_IN_RANGE";
  const isParked = status === "PARKED_OUT_OF_RANGE";
  return (
    <section className="mx-auto max-w-3xl px-6">
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-neutral-700/60 md:grid-cols-2">
        <Column
          label="ACTIVE_IN_RANGE"
          body="Capital sits as a hook-owned V4 LP position. Earns swap fees as price moves through the registered range."
          active={isActive}
        />
        <Column
          label="PARKED_OUT_OF_RANGE"
          body="Capital sits in ERC-4626 vault shares. Earns lending yield. The hook re-deploys it the moment price returns."
          active={isParked}
        />
      </div>
    </section>
  );
}

function Column({
  label,
  body,
  active,
}: {
  label: string;
  body: string;
  active: boolean;
}) {
  return (
    <div className="relative bg-neutral-900 px-6 py-8 md:px-8">
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-px transition-colors",
          active ? "bg-accent" : "bg-transparent",
        )}
      />
      <div className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-wide">
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            active ? "bg-accent" : "bg-neutral-500",
          )}
        />
        <span className={active ? "text-neutral-0" : "text-neutral-500"}>{label}</span>
      </div>
      <p className="mt-3 text-[14px] leading-[1.6] text-neutral-300">{body}</p>
    </div>
  );
}
