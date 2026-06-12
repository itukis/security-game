import type { AttackOutcome, VerifyValue } from "@/lib/challengeTypes";

type DefenseState = "idle" | "checking" | "success" | "failure" | "error";

export function PatchErrorAlert({ message }: { message: string }) {
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

export function RetestSummary({
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
      className="animate-attack-flash mt-5 min-w-0 overflow-hidden rounded-lg border border-rose-300/50 bg-rose-300/10 p-4"
    >
      <p className="text-lg font-black text-rose-100">✗ まだ脆弱性が残っています。</p>
      <p className="mt-2 text-sm leading-6 text-zinc-200">
        まだ攻撃が成立する可能性があります。
      </p>
      {stillPayload ? (
        <p className="mt-2 min-w-0 text-xs leading-5 text-rose-100">
          再現できたペイロード:{" "}
          <code className="inline-block max-w-full whitespace-pre-wrap break-all rounded bg-black/30 px-2 py-0.5 align-top font-mono text-rose-100">
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

export function AttackOutcomeCard({
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
      className={`min-w-0 overflow-hidden rounded-lg border p-3 ${
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
        <dl className="mt-3 grid min-w-0 gap-2 text-sm">
          {payload ? (
            <KV label="payload" value={payload} mono />
          ) : null}
          {evidence ? <KV label="evidence" value={evidence} /> : null}
          {duration !== undefined ? (
            <KV label="durationMs" value={`${duration} ms`} />
          ) : null}
        </dl>
      ) : (
        <p className="mt-3 min-w-0 whitespace-pre-wrap break-all text-sm text-zinc-300">
          {formatVerifyValue(outcome)}
        </p>
      )}
    </div>
  );
}

export function DefenseBadge({ defenseState }: { defenseState: DefenseState }) {
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
    <div className="grid min-w-0 gap-1">
      <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </dt>
      <dd
        className={`min-w-0 max-w-full whitespace-pre-wrap break-all text-sm leading-5 text-zinc-100 ${
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
