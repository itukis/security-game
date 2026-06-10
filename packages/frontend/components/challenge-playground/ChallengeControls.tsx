"use client";

import type { PreviewApplyState } from "@/components/challenge-playground/types";

export function PreviewApplyControl({
  disabledReason,
  error,
  onApply,
  state,
}: {
  disabledReason: string | null;
  error: string | null;
  onApply: () => void;
  state: PreviewApplyState;
}) {
  const applying = state === "applying";
  const applied = state === "applied";
  const disabled = applying || applied || Boolean(disabledReason);

  return (
    <div className="rounded-lg border border-emerald-300/20 bg-zinc-950 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
          Preview Apply
        </p>
        {applied ? (
          <span className="rounded border border-emerald-300/40 bg-emerald-300/10 px-2 py-1 text-xs font-bold text-emerald-100">
            ✅ 反映完了
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onApply}
        disabled={disabled}
        className="mt-3 inline-flex h-11 w-full items-center justify-center rounded border border-emerald-300/60 bg-emerald-300 px-4 text-sm font-black text-zinc-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
      >
        {applying ? "サーバーに反映中..." : "プレビューに反映"}
      </button>
      {disabledReason ? (
        <p className="mt-2 text-xs leading-5 text-zinc-500">{disabledReason}</p>
      ) : null}
      {state === "error" && error ? (
        <div
          role="alert"
          className="mt-3 rounded border border-rose-300/40 bg-rose-300/10 p-3 text-xs leading-5 text-rose-100"
        >
          <p className="font-bold">パッチ適用失敗</p>
          <p className="mt-1 break-words">{error}</p>
        </div>
      ) : null}
    </div>
  );
}

export function VerifyTrigger({
  canRetest,
  disabledReason,
  onSubmit,
}: {
  canRetest: boolean;
  disabledReason: string | null;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-lg border border-cyan-300/20 bg-zinc-950 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
            Verify
          </p>
          <p className="mt-1 text-sm text-zinc-300">
            コードを修正したら、ここから実際の攻撃テストで検証します。
          </p>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canRetest}
          className="inline-flex h-11 items-center justify-center rounded border border-cyan-300/60 bg-cyan-300 px-5 text-sm font-black text-zinc-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
        >
          修正を検証する
        </button>
      </div>
      {disabledReason ? (
        <p className="mt-3 text-xs leading-5 text-zinc-400">{disabledReason}</p>
      ) : null}
    </div>
  );
}

export function ProceedToStep2({ onProceed }: { onProceed: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-4">
      <div>
        <p className="text-sm font-black text-emerald-100">
          ✓ 脆弱性を確認できました
        </p>
        <p className="mt-1 text-xs leading-5 text-emerald-50/80">
          満足するまでプレビューで攻撃を試せます。準備ができたら次のステップへ。
        </p>
      </div>
      <button
        type="button"
        onClick={onProceed}
        className="inline-flex h-11 items-center justify-center rounded border border-cyan-300/60 bg-cyan-300 px-5 text-sm font-black text-zinc-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-zinc-950"
      >
        次へ：脆弱なコードを確認する →
      </button>
    </div>
  );
}

export function HintPanel({
  hints,
  hintsRevealed,
  onRevealHint,
}: {
  hints: string[];
  hintsRevealed: number;
  onRevealHint: () => void;
}) {
  if (hints.length === 0) return null;

  const allRevealed = hintsRevealed === hints.length;
  const remaining = hints.length - hintsRevealed;

  return (
    <div className="relative min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <p className="text-xs font-black uppercase tracking-[0.15em] text-zinc-500">
        ヒント
      </p>
      {hintsRevealed > 0 ? (
        <div className="mt-3 grid gap-2">
          {hints.slice(0, hintsRevealed).map((hint, i) => (
            <div key={i} className="rounded border border-zinc-700 bg-zinc-950 p-3">
              <p className="mb-1 text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                ヒント {i + 1}
              </p>
              <p className="text-sm leading-6 text-zinc-300">{hint}</p>
            </div>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        onClick={onRevealHint}
        disabled={allRevealed}
        className="mt-3 inline-flex h-10 w-full items-center justify-center rounded border border-zinc-600 bg-zinc-800 px-4 text-sm font-bold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-600"
      >
        {allRevealed ? "ヒントは全て表示済み" : `ヒントを見る (残り${remaining})`}
      </button>
    </div>
  );
}
