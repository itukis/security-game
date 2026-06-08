"use client";

import dynamic from "next/dynamic";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[460px] items-center justify-center rounded border border-zinc-700 bg-zinc-950 text-sm text-zinc-500">
        エディタを読み込み中...
      </div>
    ),
  },
);

interface CodeEditorProps {
  value: string;
  language?: string;
  onChange: (code: string) => void;
  onReset: () => void;
  readOnly?: boolean;
  height?: number;
}

// Controlled Monaco wrapper. The parent owns the editor buffer in
// `value`. To reset, the parent calls `onReset` and sets `value` back
// to the seed; we forward the new value to Monaco via the `value` prop.
export function CodeEditor({
  value,
  language = "javascript",
  onChange,
  onReset,
  readOnly = false,
  height = 460,
}: CodeEditorProps) {
  function handleChange(next: string | undefined) {
    onChange(next ?? "");
  }

  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-900/95 p-3 shadow-xl shadow-black/30 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
            Code Editor
          </p>
          <h3 className="mt-1 text-base font-bold text-white">
            脆弱なコードを直接編集
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-cyan-100">
            {language}
          </span>
          <button
            type="button"
            onClick={onReset}
            disabled={readOnly}
            className="rounded border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs font-bold text-zinc-200 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            初期コードに戻す
          </button>
        </div>
      </div>

      <div
        className="overflow-hidden rounded border border-zinc-800"
        style={{ height }}
      >
        <MonacoEditor
          height="100%"
          language={language}
          value={value}
          onChange={handleChange}
          theme="vs-dark"
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            renderWhitespace: "selection",
          }}
        />
      </div>
    </section>
  );
}
