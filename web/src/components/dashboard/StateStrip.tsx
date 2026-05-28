type Status = "UNSET" | "ACTIVE_IN_RANGE" | "PARKED_OUT_OF_RANGE";
type PoolMode = "active" | "parked";

const cn = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

export function StateStrip({
  status,
  poolMode,
  onSelectMode,
}: {
  status: Status;
  poolMode: PoolMode;
  onSelectMode: (mode: PoolMode) => void;
}) {
  return (
    <section className="mx-auto max-w-3xl px-6">
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-neutral-700/60 md:grid-cols-2">
        <Column
          label="ACTIVE_IN_RANGE"
          body="Capital sits as a hook-owned V4 LP position. Earns swap fees as price moves through the registered range."
          selected={poolMode === "active"}
          live={status === "ACTIVE_IN_RANGE"}
          onClick={() => onSelectMode("active")}
        />
        <Column
          label="PARKED_OUT_OF_RANGE"
          body="Capital sits in ERC-4626 vault shares. Earns lending yield. The hook re-deploys it the moment price returns."
          selected={poolMode === "parked"}
          live={status === "PARKED_OUT_OF_RANGE"}
          onClick={() => onSelectMode("parked")}
        />
      </div>
    </section>
  );
}

function Column({
  label,
  body,
  selected,
  live,
  onClick,
}: {
  label: string;
  body: string;
  selected: boolean;
  live: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group relative bg-neutral-900 px-6 py-8 text-left transition-colors duration-150 md:px-8",
        selected ? "cursor-default" : "cursor-pointer hover:bg-neutral-800",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-px transition-colors",
          selected ? "bg-accent" : "bg-transparent group-hover:bg-neutral-500",
        )}
      />
      <div className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-wide">
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            live ? "bg-accent" : selected ? "bg-neutral-200" : "bg-neutral-500",
          )}
        />
        <span
          className={
            selected ? "text-neutral-0" : "text-neutral-400 group-hover:text-neutral-200"
          }
        >
          {label}
        </span>
        {!selected ? (
          <span
            aria-hidden
            className="ml-auto font-mono text-[11px] text-neutral-500 transition-colors group-hover:text-accent"
          >
            switch →
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-[14px] leading-[1.6] text-neutral-300">{body}</p>
    </button>
  );
}
