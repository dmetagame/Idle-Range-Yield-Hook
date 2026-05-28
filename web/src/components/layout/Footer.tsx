import { addresses } from "@/lib/contracts";

export function Footer() {
  return (
    <footer className="border-t border-neutral-700">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 text-[13px] text-neutral-500 md:flex-row md:items-center">
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/dmetagame/Idle-Range-Yield-Hook"
            target="_blank"
            rel="noreferrer"
            className="transition-colors duration-150 hover:text-neutral-0"
          >
            GitHub
          </a>
          <a
            href="https://github.com/dmetagame/Idle-Range-Yield-Hook#readme"
            target="_blank"
            rel="noreferrer"
            className="transition-colors duration-150 hover:text-neutral-0"
          >
            Docs
          </a>
          <a
            href={`https://www.oklink.com/xlayer/address/${addresses.idleYieldHook}`}
            target="_blank"
            rel="noreferrer"
            className="transition-colors duration-150 hover:text-neutral-0"
          >
            Explorer
          </a>
        </div>
        <div>Built for the X Layer Build X Hackathon 2026.</div>
      </div>
    </footer>
  );
}
