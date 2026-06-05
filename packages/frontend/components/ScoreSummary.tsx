type ScoreSummaryProps = {
  score: number;
  attackComplete: boolean;
  defenseState: "idle" | "checking" | "success" | "failure" | "error";
};

export function ScoreSummary({
  score,
  attackComplete,
  defenseState,
}: ScoreSummaryProps) {
  const defenseComplete =
    defenseState === "success" ||
    defenseState === "failure" ||
    defenseState === "error";

  return (
    <aside className="grid min-w-64 grid-cols-3 gap-2 rounded border border-zinc-700 bg-black p-3 text-center">
      <Metric label="Score" value={String(score)} tone="emerald" />
      <Metric label="Attack" value={attackComplete ? "Done" : "Ready"} tone="rose" />
      <Metric
        label="Defense"
        value={
          defenseComplete ? (defenseState === "success" ? "OK" : "NG") : "Wait"
        }
        tone="cyan"
      />
    </aside>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "cyan" | "emerald" | "rose";
}) {
  const toneClass = {
    cyan: "text-cyan-200",
    emerald: "text-emerald-200",
    rose: "text-rose-200",
  }[tone];

  return (
    <div className="rounded border border-zinc-800 bg-zinc-950 px-2 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className={`mt-1 text-lg font-black ${toneClass}`}>{value}</p>
    </div>
  );
}
