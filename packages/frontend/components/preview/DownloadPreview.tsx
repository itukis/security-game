"use client";

import { useId, useState, type FormEvent } from "react";
import type { PreviewServerStatus } from "@/lib/challengeTypes";
import { ResultBanner, type Tone } from "./shared";

export function DownloadPreview({
  onExploitDetected,
  previewStatus = "baseline",
}: {
  onExploitDetected?: () => void;
  previewStatus?: PreviewServerStatus;
}) {
  const fieldId = useId();
  const [filename, setFilename] = useState("");
  const [result, setResult] = useState<{
    tone: Tone;
    message: string;
    detail?: string;
  } | null>(null);

  // No backing container exists for this challenge — the patched state is
  // reflected by trusting previewStatus. When the patch has been applied,
  // ../ traversal is reported as blocked rather than as a successful exploit.
  const isPatched = previewStatus === "applied" || previewStatus === "verified";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const isTraversal = filename.includes("../");
    if (isTraversal) {
      if (isPatched) {
        setResult({
          tone: "safe",
          message: "../ を含むファイル名は弾かれました (400 Bad Request)",
          detail: "公開ディレクトリ外への脱出を防いでいます。",
        });
        return;
      }
      setResult({
        tone: "danger",
        message: "非公開ファイルにアクセスできました",
        detail: "FLAG{demo_path_traversal}",
      });
      onExploitDetected?.();
      return;
    }

    setResult({
      tone: "neutral",
      message: filename.trim()
        ? "公開ファイルを取得しました"
        : "ファイル名を入力してください",
      detail: filename.trim() ? "public/readme.txt のような通常ファイルです。" : undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative min-w-0 rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-zinc-950 text-sm font-black text-emerald-200">
          DL
        </div>
        <div>
          <p className="text-sm font-bold">File Downloader</p>
          <p className="text-xs text-zinc-500">internal build / review needed</p>
        </div>
      </div>

      <div className="grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-2 rounded border border-zinc-300 bg-white px-3 py-2">
          <span className="text-zinc-500">public/</span>
          <span className="font-semibold">readme.txt</span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded border border-zinc-300 bg-white px-3 py-2">
          <span className="text-zinc-500">public/</span>
          <span className="font-semibold">terms.txt</span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded border border-rose-300 bg-rose-50 px-3 py-2">
          <span className="text-rose-500">secret/</span>
          <span className="font-semibold text-rose-700">flag.txt</span>
          <span className="rounded border border-rose-300 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-600">
            非公開
          </span>
        </div>
      </div>

      <label className="mt-4 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
        ファイル名
        <input
          className="mt-2 h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm font-mono text-zinc-800"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder="ここにペイロードを入力してみよう"
          autoComplete="one-time-code"
          name={`field-${fieldId}-filename`}
          spellCheck={false}
        />
      </label>

      <button
        type="submit"
        className="mt-3 h-11 w-full rounded bg-zinc-950 text-sm font-bold text-white transition hover:bg-zinc-800"
      >
        GET /download
      </button>

      {result ? (
        <>
          <ResultBanner tone={result.tone} message={result.message} />
          {result.detail ? (
            <p className="mt-2 break-all font-mono text-xs text-zinc-600">
              {result.detail}
            </p>
          ) : null}
        </>
      ) : null}
    </form>
  );
}
