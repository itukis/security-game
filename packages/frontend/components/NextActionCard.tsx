export type QuestUiStatus =
  | "idle"
  | "attacked"
  | "codeReviewed"
  | "patchSelected"
  | "verifying"
  | "passed"
  | "failed";

type NextActionCardProps = {
  attackedBody?: string;
  codeReviewedBody?: string;
  selectedPatchTitle?: string;
  status: QuestUiStatus;
};

const STATUS_BADGE_LABEL: Record<QuestUiStatus, string> = {
  idle: "未開始",
  attacked: "攻撃済み",
  codeReviewed: "原因確認済み",
  patchSelected: "コード修正済み",
  verifying: "検証中",
  passed: "防御成功",
  failed: "防御失敗",
};

// Status-driven defaults. The `attacked` / `codeReviewed` bodies are
// overridable per-problem via props because they reference the specific
// vulnerability's terminology.
const defaultActionText: Record<QuestUiStatus, { label: string; body: string }> = {
  idle: {
    label: "最初にやること",
    body: "まず攻撃テストを実行して、脆弱性が本当にあるか確認しましょう。",
  },
  attacked: {
    label: "次にやること",
    body: "次にコードを読み、原因になっている箇所を確認しましょう。",
  },
  codeReviewed: {
    label: "次にやること",
    body: "原因を確認できました。次はコードを直接修正しましょう。",
  },
  patchSelected: {
    label: "次にやること",
    body: "編集したコードで再テストし、防御できるか確認しましょう。",
  },
  verifying: {
    label: "検証中",
    body: "攻撃前テスト、パッチ適用、再攻撃の疑似判定を進めています。",
  },
  passed: {
    label: "結果を確認",
    body: "結果と解説を確認しましょう。防御成功なら、この弱点の修正方針はクリアです。",
  },
  failed: {
    label: "結果を確認",
    body: "結果と解説を確認しましょう。防御失敗なら、コードを直して再テストしてください。",
  },
};

export function NextActionCard({
  attackedBody,
  codeReviewedBody,
  selectedPatchTitle,
  status,
}: NextActionCardProps) {
  const base = defaultActionText[status];
  const body =
    status === "attacked" && attackedBody
      ? attackedBody
      : status === "codeReviewed" && codeReviewedBody
        ? codeReviewedBody
        : base.body;

  const toneClass =
    status === "passed"
      ? "border-emerald-300/40 bg-zinc-950 text-emerald-100"
      : status === "failed"
        ? "border-rose-300/40 bg-zinc-950 text-rose-100"
        : "border-amber-300/40 bg-zinc-950 text-amber-100";

  return (
    <aside className={`relative min-w-0 rounded border p-3 shadow-lg shadow-black/25 ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.16em]">
        {base.label}
      </p>
      <p className="mt-1.5 inline-flex rounded border border-white/15 bg-black/25 px-2 py-0.5 text-[10px] font-bold text-zinc-200">
        状態: {STATUS_BADGE_LABEL[status]}
      </p>
      <p className="mt-2 text-sm leading-5 text-zinc-100">{body}</p>
      {selectedPatchTitle ? (
        <p className="mt-2 text-xs leading-5 text-zinc-300">
          編集状態:{" "}
          <span className="font-bold text-white">{selectedPatchTitle}</span>
        </p>
      ) : null}
    </aside>
  );
}
