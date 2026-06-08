import { GLOSSARY } from "@/lib/glossary";

export function GlossaryPanel() {
  const entries = Object.values(GLOSSARY);

  return (
    <section className="mt-8 rounded-lg border border-zinc-700 bg-zinc-900/90 p-4 sm:p-5">
      <h2 className="mb-3 text-xs font-black tracking-[0.15em] text-zinc-500">
        用語
      </h2>
      <div className="grid gap-1">
        {entries.map((entry) => (
          <details
            key={entry.term}
            className="group rounded border border-zinc-800 bg-zinc-950/50"
          >
            <summary className="flex cursor-pointer select-none list-none items-center gap-2 p-3 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1 focus:ring-offset-zinc-900 [&::-webkit-details-marker]:hidden">
              <span
                aria-hidden="true"
                className="shrink-0 text-[10px] text-zinc-500 transition-transform duration-150 group-open:rotate-90"
              >
                ▶
              </span>
              <span className="text-sm font-bold text-zinc-200 group-open:text-white">
                {entry.term}
              </span>
              {entry.reading ? (
                <span className="text-xs text-zinc-500">{entry.reading}</span>
              ) : null}
            </summary>
            <div className="border-t border-zinc-800 px-4 pb-4 pt-3">
              <p className="text-sm font-semibold leading-6 text-zinc-200">
                {entry.short}
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {entry.detail}
              </p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
