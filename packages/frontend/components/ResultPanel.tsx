import Link from "next/link";
import type { Challenge, VerifyResult, VerifyValue } from "@/lib/challengeTypes";

type DefenseState = "idle" | "checking" | "success" | "failure" | "error";

type ResultPanelProps = {
  canRetest: boolean;
  challenge: Challenge;
  defenseState: DefenseState;
  disabledReason: string | null;
  errorMessage: string | null;
  loadingStep: string | null;
  selectedPatchTitle?: string;
  verifyResult: VerifyResult | null;
  onReset: () => void;
  onRetest: () => void;
  onTryAnotherPatch: () => void;
};

export function ResultPanel({
  canRetest,
  challenge,
  defenseState,
  disabledReason,
  errorMessage,
  loadingStep,
  selectedPatchTitle,
  verifyResult,
  onReset,
  onRetest,
  onTryAnotherPatch,
}: ResultPanelProps) {
  const isChecking = defenseState === "checking";
  const isFinalResult =
    defenseState === "success" ||
    defenseState === "failure" ||
    defenseState === "error";

  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-900/95 p-4 shadow-xl shadow-black/30 sm:p-5">
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
        <div
          role="alert"
          aria-live="assertive"
          className="mt-5 rounded-lg border border-rose-300/40 bg-rose-300/10 p-4 text-sm leading-6 text-rose-100"
        >
          <p className="text-base font-black">通信エラー</p>
          <p className="mt-2">{errorMessage}</p>
        </div>
      ) : null}

      <dl className="mt-5 grid gap-3 rounded-lg border border-zinc-800 bg-black p-4 text-sm">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-3">
          <dt className="text-zinc-500">Selected patch</dt>
          <dd className="text-right font-semibold text-zinc-200">
            {selectedPatchTitle ?? "未選択"}
          </dd>
        </div>
        <ResultRow
          label="attackBefore"
          value={verifyResult?.attackBefore ?? "未検証"}
        />
        <ResultRow
          label="attackAfter"
          value={verifyResult?.attackAfter ?? "未検証"}
        />
        <ResultRow label="passed" value={verifyResult?.passed ?? "未検証"} />
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
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={onTryAnotherPatch}
            className="inline-flex h-11 items-center justify-center rounded border border-cyan-300/60 bg-cyan-300 px-4 text-sm font-black text-zinc-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            別の修正案を試す
          </button>
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
      ) : (
        <button
          type="button"
          onClick={onRetest}
          disabled={!canRetest || isChecking}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded border border-cyan-300/60 bg-cyan-300 px-4 text-sm font-black text-zinc-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
        >
          {isChecking ? "検証中" : "修正後に再テストする"}
        </button>
      )}
    </section>
  );
}

function RetestSummary({
  passed,
  successFlavor,
  failureFlavor,
}: {
  passed: boolean;
  successFlavor?: string;
  failureFlavor?: string;
}) {
  if (passed) {
    return (
      <div
        // `key` flips on outcome so the one-shot defense-flash keyframe
        // fires every time we transition INTO the success state.
        key="passed"
        role="status"
        aria-live="polite"
        className="animate-defense-flash mt-5 rounded-lg border border-emerald-300/50 bg-emerald-300/10 p-4"
      >
        <p className="text-lg font-black text-emerald-100">✓ 防御成功</p>
        <p className="mt-2 text-sm leading-6 text-zinc-200">
          パッチ適用後の疑似攻撃はブロックされました。
        </p>
        {successFlavor ? (
          <p className="mt-1 text-sm leading-6 text-zinc-300">{successFlavor}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      key="failed"
      role="status"
      aria-live="polite"
      className="animate-attack-flash mt-5 rounded-lg border border-rose-300/50 bg-rose-300/10 p-4"
    >
      <p className="text-lg font-black text-rose-100">✗ 防御失敗</p>
      <p className="mt-2 text-sm leading-6 text-zinc-200">
        まだ攻撃が成立する可能性があります。
      </p>
      {failureFlavor ? (
        <p className="mt-1 text-sm leading-6 text-zinc-300">{failureFlavor}</p>
      ) : (
        <p className="mt-1 text-sm leading-6 text-zinc-300">
          別の修正案を選んで再テストしてください。
        </p>
      )}
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: VerifyValue }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-3">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="max-w-[65%] text-right font-semibold text-zinc-200">
        {formatVerifyValue(value)}
      </dd>
    </div>
  );
}

function formatVerifyValue(value: VerifyValue) {
  if (value === null) {
    return "未取得";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function DefenseBadge({ defenseState }: { defenseState: DefenseState }) {
  const stateMap = {
    idle: {
      label: "待機中",
      className: "border-zinc-600 bg-zinc-800 text-zinc-300",
    },
    checking: {
      label: "検証中",
      className: "border-cyan-300/40 bg-cyan-300/10 text-cyan-100",
    },
    success: {
      label: "防御成功",
      className: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
    },
    failure: {
      label: "防御失敗",
      className: "border-rose-300/40 bg-rose-300/10 text-rose-100",
    },
    error: {
      label: "APIエラー",
      className: "border-rose-300/40 bg-rose-300/10 text-rose-100",
    },
  }[defenseState];

  return (
    <span
      className={`rounded border px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${stateMap.className}`}
    >
      {stateMap.label}
    </span>
  );
}
