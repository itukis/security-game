import { ChallengeGrid } from "@/components/ChallengeGrid";
import { Header } from "@/components/Header";
import { getProblemCards } from "@/lib/api/challenges";

export default async function ChallengesPage() {
  const challenges = await getProblemCards();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="min-h-screen bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(250,204,21,0.05)_1px,transparent_1px)] bg-[size:34px_34px]">
        <Header />

        <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 border-b border-zinc-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">
                Challenge Board
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                問題一覧
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300 sm:text-base">
                初級9カテゴリに加えて、復習用の応用3問を追加しました。コード+プレビューまたはコードのみで、攻撃→原因確認→修正→再テストを進めます。
              </p>
            </div>
            <div className="rounded border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100">
              {challenges.length} mission available
              <span className="mt-1 block text-xs font-medium text-emerald-200/80">
                現在プレイ可能な問題数
              </span>
            </div>
          </div>

          <ChallengeGrid challenges={challenges} />
        </section>
      </div>
    </main>
  );
}
