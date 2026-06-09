import Link from "next/link";
import type {
  AttackOutcome,
  Challenge,
  VerifyResult,
  VerifyValue,
} from "@/lib/challengeTypes";

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

function PatchErrorAlert({ message }: { message: string }) {
  const looksLikePatchProblem =
    message.includes("400") ||
    message.includes("apply") ||
    message.includes("Patch failed validation");

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mt-5 rounded-lg border border-rose-300/40 bg-rose-300/10 p-4 text-sm leading-6 text-rose-100"
    >
      <p className="text-base font-black">
        {looksLikePatchProblem
          ? "修正コードが適用できませんでした。コードの構文を確認してください。"
          : "通信エラー"}
      </p>
      <details className="mt-3 rounded border border-rose-300/30 bg-black/30 p-3 text-xs font-mono text-rose-100/90">
        <summary className="cursor-pointer font-sans text-xs font-bold uppercase tracking-[0.16em] text-rose-200">
          詳細
        </summary>
        <pre className="mt-2 whitespace-pre-wrap break-words">{message}</pre>
      </details>
    </div>
  );
}

function RetestSummary({
  passed,
  successFlavor,
  failureFlavor,
  attackAfter,
}: {
  passed: boolean;
  successFlavor?: string;
  failureFlavor?: string;
  attackAfter: VerifyValue;
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
          パッチ適用後の攻撃はブロックされました。
        </p>
        {successFlavor ? (
          <p className="mt-1 text-sm leading-6 text-zinc-300">{successFlavor}</p>
        ) : null}
      </div>
    );
  }

  const stillPayload = extractPayload(attackAfter);

  return (
    <div
      key="failed"
      role="status"
      aria-live="polite"
      className="animate-attack-flash mt-5 rounded-lg border border-rose-300/50 bg-rose-300/10 p-4"
    >
      <p className="text-lg font-black text-rose-100">✗ まだ脆弱性が残っています。</p>
      <p className="mt-2 text-sm leading-6 text-zinc-200">
        まだ攻撃が成立する可能性があります。
      </p>
      {stillPayload ? (
        <p className="mt-2 text-xs leading-5 text-rose-100">
          再現できたペイロード:{" "}
          <code className="rounded bg-black/30 px-2 py-0.5 font-mono text-rose-100">
            {stillPayload}
          </code>
        </p>
      ) : null}
      {failureFlavor ? (
        <p className="mt-1 text-sm leading-6 text-zinc-300">{failureFlavor}</p>
      ) : null}
    </div>
  );
}

function AttackOutcomeCard({
  tone,
  label,
  outcome,
}: {
  tone: "danger" | "safe";
  label: string;
  outcome: VerifyValue;
}) {
  const isSafe = tone === "safe";
  const obj = toAttackOutcome(outcome);
  const exploited = obj?.exploited;
  const payload = obj?.payload;
  const evidence = obj?.evidence;
  const duration = obj?.durationMs;

  const headerClass = isSafe
    ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
    : "border-rose-300/40 bg-rose-300/10 text-rose-100";

  return (
    <div
      className={`rounded-lg border p-3 ${
        isSafe ? "border-emerald-300/30 bg-emerald-300/5" : "border-rose-300/30 bg-rose-300/5"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-300">
          {label}
        </p>
        <span
          className={`rounded border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] ${headerClass}`}
        >
          {exploited === undefined
            ? "—"
            : exploited
              ? "侵入成立"
              : "ブロック"}
        </span>
      </div>
      {obj ? (
        <dl className="mt-3 grid gap-2 text-sm">
          {payload ? (
            <KV label="payload" value={payload} mono />
          ) : null}
          {evidence ? <KV label="evidence" value={evidence} /> : null}
          {duration !== undefined ? (
            <KV label="durationMs" value={`${duration} ms`} />
          ) : null}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-zinc-300">{formatVerifyValue(outcome)}</p>
      )}
    </div>
  );
}

function KV({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </dt>
      <dd
        className={`break-words text-sm leading-5 text-zinc-100 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function toAttackOutcome(value: VerifyValue): AttackOutcome | null {
  if (value && typeof value === "object") {
    return value;
  }
  return null;
}

function extractPayload(value: VerifyValue): string | null {
  const obj = toAttackOutcome(value);
  return obj?.payload ?? null;
}

function formatVerifyValue(value: VerifyValue) {
  if (value === null || value === undefined) {
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
