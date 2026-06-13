import { GlossaryQuiz } from "@/components/GlossaryQuiz";
import { Header } from "@/components/Header";

export default function GlossaryQuizPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="min-h-screen bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(250,204,21,0.05)_1px,transparent_1px)] bg-[size:34px_34px]">
        <Header />

        <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <GlossaryQuiz />
        </section>
      </div>
    </main>
  );
}
