import Link from "next/link";
import type { ChallengeCardData, Difficulty } from "@/lib/challengeTypes";
import { getAvailableModes, getScoreCap } from "@/lib/difficultyConfig";

const TIME_ESTIMATE: Record<Difficulty, string> = {
  Easy: "5〜10分",
  Medium: "10〜20分",
  // Composite reviews bundle 3 separate vulns + a code read, so a single
  // 5〜10 minute window doesn't survive contact with the workflow.
  Hard: "20〜30分",
};

export function ChallengeCard({
  challenge,
  clearedScore,
}: {
  challenge: ChallengeCardData;
  clearedScore?: number;
}) {
  const isAvailable = challenge.status === "available";
  const timeEstimate = TIME_ESTIMATE[challenge.difficulty];
  const scoreCapsText = getAvailableModes(challenge.difficulty)
    .map((mode) => getScoreCap(mode, challenge.difficulty))
    .join(" / ");

  return (
    <article className="flex min-h-72 flex-col justify-between rounded-lg border border-zinc-700 bg-zinc-900/95 p-5 shadow-xl shadow-black/30">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-xs font-bold text-cyan-100">
            {challenge.vulnerability}
          </span>
          <span className="rounded border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-xs font-bold text-amber-100">
            {challenge.difficulty}
          </span>
          <span className="rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-xs font-bold text-zinc-300">
            {challenge.status}
          </span>
          {clearedScore !== undefined ? (
            <span className="rounded border border-emerald-300/40 bg-emerald-300/10 px-2 py-1 text-xs font-bold text-emerald-100">
              ✓ クリア済み
            </span>
          ) : null}
        </div>

        <h2 className="mt-4 text-xl font-black text-white">{challenge.title}</h2>
        {clearedScore !== undefined ? (
          <p className="mt-1 text-xs font-semibold text-emerald-300">
            ベストスコア {clearedScore} pt
          </p>
        ) : null}
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          {challenge.description}
        </p>

        <div className="mt-4 grid gap-3 rounded border border-zinc-800 bg-black p-3 text-sm">
          <div>
            <p className="font-bold text-cyan-100">所要時間目安</p>
            <p className="mt-1 text-zinc-400">{timeEstimate}</p>
          </div>
          <div>
            <p className="font-bold text-amber-100">学べること</p>
            <p className="mt-1 leading-6 text-zinc-400">
              {challenge.learnSummary ?? challenge.description}
            </p>
          </div>
          <div>
            <p className="font-bold text-emerald-100">獲得可能スコア</p>
            <p className="mt-1 text-zinc-400">{scoreCapsText} pt</p>
          </div>
        </div>
      </div>

      <Link
        href={`/challenges/${challenge.id}`}
        aria-disabled={!isAvailable}
        className={`mt-5 inline-flex h-11 items-center justify-center rounded border px-4 text-sm font-black transition ${
          isAvailable
            ? "border-cyan-300/70 bg-cyan-300 text-zinc-950 hover:bg-cyan-200"
            : "pointer-events-none border-zinc-700 bg-zinc-800 text-zinc-500"
        }`}
      >
        開始する
      </Link>
    </article>
  );
}
