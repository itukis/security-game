import Link from "next/link";
import { Header } from "@/components/Header";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="min-h-screen bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(250,204,21,0.06)_1px,transparent_1px)] bg-[size:34px_34px]">
        <Header />

        <section className="mx-auto flex min-h-[calc(100vh-76px)] w-full max-w-6xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
              <div className="flex flex-wrap gap-3">
                <span className="rounded border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-cyan-100">
                  Cyber Security Training
                </span>
              </div>

            <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-6xl">
              SecurePatch Quest
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
                AIが生成したアプリ画面を新人ホワイトハッカーとして診断し、SQL Injection・XSS・IDOR・Path Traversal・Command Injection の5カテゴリの弱点を攻撃テストで確認し、原因コードを読んで、安全な修正案を選ぶセキュリティ学習ゲームです。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/challenges"
                className="inline-flex h-12 items-center justify-center rounded border border-cyan-300/70 bg-cyan-300 px-5 text-sm font-black text-zinc-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-zinc-950"
              >
                問題を始める
              </Link>
              <div className="inline-flex h-12 items-center justify-center rounded border border-zinc-700 bg-zinc-900/80 px-5 text-sm font-semibold text-zinc-300">
                  SQLi / XSS / IDOR / Path Traversal / Command Injection の5問
              </div>
            </div>
          </div>

          <div className="mt-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
              How to play
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              このゲームでやること
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {[
                [
                  "01",
                  "攻撃テストで弱点を確認",
                    "学習用の隔離された環境で、その脆弱性が刺さる動きを確認します。",
                ],
                [
                  "02",
                  "コードを読んで原因を探す",
                  "ユーザー入力をそのまま処理に渡している箇所を見つけます。",
                ],
                [
                  "03",
                  "修正して再テスト",
                  "原因に対する正しい修正案を選び、防御できたかを確認します。",
                ],
              ].map(([step, title, body]) => (
                <div
                  key={step}
                  className="rounded-lg border border-zinc-700 bg-zinc-900/90 p-4 shadow-xl shadow-black/30"
                >
                  <p className="text-sm font-black text-amber-200">{step}</p>
                  <h3 className="mt-2 text-lg font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
