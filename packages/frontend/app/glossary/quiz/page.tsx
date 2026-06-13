import { GlossaryQuiz } from "@/components/GlossaryQuiz";
import { Header } from "@/components/Header";

export default function GlossaryQuizPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="min-h-screen bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(250,204,21,0.05)_1px,transparent_1px)] bg-[size:34px_34px]">
        <Header />

        <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <header className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">
              Glossary Quiz
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              用語クイズ
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
              10問のセキュリティ用語クイズ。一言説明として正しいものを4択から選びます。
            </p>
          </header>
          <GlossaryQuiz />
        </section>
      </div>
    </main>
  );
}
