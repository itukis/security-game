type AttackPanelProps = {
  attackPayload: string;
  attackState: "idle" | "running" | "success" | "failure";
  attackVerifiedMessage: string;
  disclaimer: string;
  onRunAttack: () => void;
};

export function AttackPanel({
  attackPayload,
  attackState,
  attackVerifiedMessage,
  disclaimer,
  onRunAttack,
}: AttackPanelProps) {
  const isRunning = attackState === "running";
  const hasSucceeded = attackState === "success";
  const buttonClass = hasSucceeded
    ? "mt-5 inline-flex h-11 w-full items-center justify-center rounded border border-zinc-700 bg-zinc-900 px-4 text-sm font-bold text-zinc-200 transition hover:border-rose-300/50 hover:text-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:ring-offset-2 focus:ring-offset-zinc-950"
    : "mt-5 inline-flex h-11 w-full items-center justify-center rounded border border-rose-300/60 bg-rose-500 px-4 text-sm font-black text-white shadow-lg shadow-rose-950/40 transition hover:bg-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none";

  return (
    <div className="relative min-w-0 rounded-lg border border-zinc-700 bg-black p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-white">自動攻撃で検証</h3>
        <StatusBadge
          label={
            isRunning
              ? "実行中"
              : hasSucceeded
                ? "侵入成功"
                : attackState === "failure"
                  ? "失敗"
                  : "未実行"
          }
          tone={hasSucceeded ? "rose" : "zinc"}
        />
      </div>

      <div
        // The result panel acts as the visible "attention" surface.
        // When attack just succeeded, key flips so the one-shot
        // `animate-attack-flash` keyframe re-fires on this remount.
        key={hasSucceeded ? "succeeded" : "idle"}
        role="status"
        aria-live="polite"
        className={`mt-4 min-w-0 overflow-hidden rounded border p-4 font-mono text-sm leading-6 ${
          hasSucceeded
            ? "animate-attack-flash border-rose-300/60 bg-rose-300/10"
            : "border-zinc-800 bg-zinc-950"
        }`}
      >
        {hasSucceeded ? (
          <>
            <p className="font-sans text-base font-black text-rose-100">
              ⚠ 侵入成功
            </p>
            <dl className="mt-3 grid gap-3">
              <ResultLine
                label="攻撃結果"
                tone="rose"
                value={attackVerifiedMessage}
              />
              <ResultLine label="使用ペイロード" value={attackPayload} />
              <ResultLine label="判定" tone="rose" value="脆弱性あり" />
              <ResultLine
                label="次の行動"
                tone="amber"
                value="原因コードを確認してください"
              />
            </dl>
          </>
        ) : (
          <>
            <p className="text-zinc-500">$ automated-attack</p>
            <p className="mt-3 min-w-0 text-zinc-300">
              使用ペイロード:{" "}
              <span className="inline-block max-w-full whitespace-pre-wrap break-all rounded bg-rose-400/10 px-2 py-1 align-top text-rose-200">
                {attackPayload}
              </span>
            </p>
            <p className="mt-3 text-zinc-500">
              ボタンを押すと、左のプレビューを手動で操作しなくても
              脆弱性の有無を即座に判定します。
            </p>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onRunAttack}
        disabled={isRunning}
        className={buttonClass}
      >
        {isRunning
          ? "自動攻撃を実行中"
          : hasSucceeded
            ? "自動攻撃を再実行"
            : "自動攻撃で検証"}
      </button>

      <p className="mt-4 text-sm leading-6 text-zinc-400">{disclaimer}</p>
    </div>
  );
}

function ResultLine({
  label,
  tone = "zinc",
  value,
}: {
  label: string;
  tone?: "amber" | "rose" | "zinc";
  value: string;
}) {
  const toneClass = {
    amber: "text-amber-100",
    rose: "text-rose-100",
    zinc: "text-zinc-200",
  }[tone];

  return (
    <div className="grid min-w-0 gap-1 sm:grid-cols-[9rem_1fr] sm:items-start">
      <dt className="text-zinc-500">{label}</dt>
      <dd
        className={`min-w-0 max-w-full whitespace-pre-wrap break-all font-semibold ${toneClass}`}
      >
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "rose" | "zinc";
}) {
  const toneClass =
    tone === "rose"
      ? "border-rose-300/40 bg-rose-300/10 text-rose-100"
      : "border-zinc-600 bg-zinc-800 text-zinc-300";

  return (
    <span
      className={`rounded border px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${toneClass}`}
    >
      {label}
    </span>
  );
}
