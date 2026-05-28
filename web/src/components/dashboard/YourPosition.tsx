import { formatUnits } from "viem";

const fmt = (v: bigint, max = 4) =>
  Number(formatUnits(v, 18)).toLocaleString(undefined, { maximumFractionDigits: max });

export function YourPosition({
  userShares,
  claim0,
  claim1,
}: {
  userShares: bigint;
  claim0: bigint;
  claim1: bigint;
}) {
  return (
    <section id="position" className="mx-auto max-w-3xl px-6 pt-20 md:pt-32">
      <div className="font-mono text-[12px] uppercase tracking-wide text-neutral-500">
        Your position
      </div>
      <div className="mt-6 grid gap-x-12 gap-y-6 md:grid-cols-3">
        <Field label="Shares" value={userShares > 0n ? fmt(userShares, 0) : "0"} />
        <Field label="Claim · Token0" value={fmt(claim0)} />
        <Field label="Claim · Token1" value={fmt(claim1)} />
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[13px] text-neutral-300">{label}</div>
      <div className="mt-1 font-mono text-[26px] font-medium tracking-tight text-neutral-0 tabular-nums md:text-[32px]">
        {value}
      </div>
    </div>
  );
}
