import { notFound } from "next/navigation";
import { ChallengePlayground } from "@/components/ChallengePlayground";
import { Header } from "@/components/Header";
import { getProblem, getProblems } from "@/lib/api/challenges";

export async function generateStaticParams() {
  const challenges = await getProblems();

  return challenges.map((challenge) => ({
    id: challenge.id,
  }));
}

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challenge = await getProblem(id);

  if (!challenge) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="min-h-screen bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(250,204,21,0.05)_1px,transparent_1px)] bg-[size:34px_34px]">
        <Header />

        <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-cyan-300/20 bg-zinc-900/95 p-4 shadow-2xl shadow-cyan-950/20 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  Mission
                </p>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {challenge.title}
                </h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-300">
                  {challenge.scenario}
                </p>
                {challenge.causeSummary ? (
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-amber-100">
                    {challenge.causeSummary}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <MissionBadge label="脆弱性" value={challenge.vulnerability} />
                <MissionBadge label="難易度" value={challenge.difficulty} />
                <MissionBadge label="状態" value={challenge.status} />
              </div>
            </div>
          </div>

          <ChallengePlayground challenge={challenge} />
        </section>
      </div>
    </main>
  );
}

function MissionBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-zinc-700 bg-black px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-amber-100">{value}</p>
    </div>
  );
}
