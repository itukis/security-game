import Link from "next/link";
import {
  AttackOutcomeCard,
  DefenseBadge,
  PatchErrorAlert,
  RetestSummary,
} from "@/components/result-panel/ResultPanelDetails";
import type { Challenge, VerifyResult } from "@/lib/challengeTypes";

type DefenseState = "idle" | "checking" | "success" | "failure" | "error";

type ResultPanelProps = {
  canRetest: boolean;
  challenge: Challenge;
  defenseState: DefenseState;
  disabledReason: string | null;
  errorMessage: string | null;
  isEditorMode: boolean;
  loadingStep: string | null;
  selectedPatchTitle?: string;
  verifyResult: VerifyResult | null;
  onBackToEditor: () => void;
  onReset: () => void;
  onRetest: () => void;
  onTryAnotherPatch: () => void;
  onRevealHint?: () => void;
  hintRevealLabel?: string;
};

export function ResultPanel({
  canRetest,
  challenge,
  defenseState,
  disabledReason,
  errorMessage,
  isEditorMode,
  loadingStep,
  selectedPatchTitle,
  verifyResult,
  onBackToEditor,
  onReset,
  onRetest,
  onTryAnotherPatch,
  onRevealHint,
  hintRevealLabel,
}: ResultPanelProps) {
  const isChecking = defenseState === "checking";
  const isFinalResult =
    defenseState === "success" ||
    defenseState === "failure" ||
    defenseState === "error";
  const showBackToEditor =
    defenseState === "failure" || defenseState === "error";
  const backToEditorLabel = isEditorMode ? "戻って修正する" : "修正案を選び直す";

  const before = verifyResult?.attackBefore ?? null;
  const after = verifyResult?.attackAfter ?? null;

  return (
    <section className="relative min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-xl shadow-black/30 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
            Retest Console
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Step 4：再テスト結果
          </h2>
        </div>
        <DefenseBadge defenseState={defenseState} />
      </div>

      {verifyResult ? (
        <RetestSummary
          passed={verifyResult.passed}
          successFlavor={challenge.defenseSuccessFlavor}
          failureFlavor={challenge.defenseFailureFlavor}
          attackAfter={after}
        />
      ) : null}

      {isChecking ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-5 rounded-lg border border-cyan-300/30 bg-cyan-300/10 p-4"
        >
          <p className="animate-verifying-pulse text-sm font-black text-cyan-100">
            {loadingStep ?? "検証中"}
          </p>
          <div className="mt-3 grid gap-2 text-sm text-zinc-300">
            {["検証中", "攻撃前テスト中", "パッチ適用中", "再攻撃中"].map(
              (step) => (
                <div key={step} className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      loadingStep === step ? "bg-cyan-200" : "bg-zinc-700"
                    }`}
                  />
                  <span>{step}</span>
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <PatchErrorAlert message={errorMessage} />
      ) : null}

      {verifyResult ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <AttackOutcomeCard
            tone="danger"
            label="パッチ適用前"
            outcome={before}
          />
          <AttackOutcomeCard
            tone={verifyResult.passed ? "safe" : "danger"}
            label="パッチ適用後"
            outcome={after}
          />
        </div>
      ) : null}

      <dl className="mt-5 grid gap-3 rounded-lg border border-zinc-800 bg-black p-4 text-sm">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-3">
          <dt className="text-zinc-500">Selected patch</dt>
          <dd className="text-right font-semibold text-zinc-200">
            {selectedPatchTitle ?? "未選択"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Explanation</dt>
          <dd className="mt-2 leading-6 text-zinc-300">{challenge.explanation}</dd>
        </div>
      </dl>

      {disabledReason ? (
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          {disabledReason}
        </p>
      ) : null}

      {isFinalResult ? (
        <div className="mt-5 grid gap-3">
          {showBackToEditor ? (
            <button
              type="button"
              onClick={onBackToEditor}
              className="inline-flex h-11 items-center justify-center rounded border border-amber-300/60 bg-amber-300 px-4 text-sm font-black text-zinc-950 shadow-lg shadow-amber-950/30 transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              {backToEditorLabel}
            </button>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            {!showBackToEditor ? (
              <button
                type="button"
                onClick={onTryAnotherPatch}
                className="inline-flex h-11 items-center justify-center rounded border border-cyan-300/60 bg-cyan-300 px-4 text-sm font-black text-zinc-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-zinc-950"
              >
                別の修正案を試す
              </button>
            ) : null}
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-11 items-center justify-center rounded border border-zinc-700 bg-zinc-950 px-4 text-sm font-bold text-zinc-200 transition hover:border-cyan-300/60 hover:text-cyan-100"
            >
              ミッションをリセット
            </button>
            <Link
              href="/challenges"
              className="inline-flex h-11 items-center justify-center rounded border border-zinc-700 bg-zinc-950 px-4 text-sm font-bold text-zinc-200 transition hover:border-cyan-300/60 hover:text-cyan-100"
            >
              一覧に戻る
            </Link>
          </div>
        </div>
      ) : isChecking ? (
        <button
          type="button"
          disabled
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded border border-zinc-700 bg-zinc-800 px-4 text-sm font-bold text-zinc-500 disabled:cursor-not-allowed"
        >
          検証中
        </button>
      ) : (
        <button
          type="button"
          onClick={onRetest}
          disabled={!canRetest}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded border border-cyan-300/60 bg-cyan-300 px-4 text-sm font-black text-zinc-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
        >
          修正後に再テストする
        </button>
      )}

      {defenseState === "failure" && onRevealHint ? (
        <button
          type="button"
          onClick={onRevealHint}
          className="mt-3 inline-flex h-10 items-center justify-center rounded border border-amber-300/40 bg-amber-300/10 px-4 text-xs font-bold text-amber-100 transition hover:bg-amber-300/20"
        >
          {hintRevealLabel ?? "次のヒントを見る"}
        </button>
      ) : null}
    </section>
  );
}
