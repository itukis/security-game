type CodeViewerProps = {
  code: string;
  language: string;
  title: string;
};

// Monaco Editor can replace this component later without touching page logic.
export function CodeViewer({ code, language, title }: CodeViewerProps) {
  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-900/95 p-4 shadow-xl shadow-black/30 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
            Code Viewer
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">{title}</h2>
        </div>
        <span className="rounded border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-100">
          {language}
        </span>
      </div>

      <pre className="mt-5 overflow-x-auto rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-7 text-zinc-100">
        <code>{code}</code>
      </pre>
    </section>
  );
}
