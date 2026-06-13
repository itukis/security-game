"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GLOSSARY_TERMS, type GlossaryTerm } from "@/lib/glossaryData";

const QUESTION_COUNT = 10;
const OPTION_COUNT = 4;

type QuizQuestion = {
  id: string;
  term: GlossaryTerm;
  options: string[];
};

type AnswerRecord = {
  question: QuizQuestion;
  selected: string | null;
  isCorrect: boolean;
  skipped: boolean;
};

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function cleanSummary(term: GlossaryTerm) {
  return term.summary.trim();
}

function quizCandidates() {
  return GLOSSARY_TERMS.filter((term) => cleanSummary(term).length > 0);
}

function buildQuestion(term: GlossaryTerm, candidates: GlossaryTerm[]): QuizQuestion {
  const correctSummary = cleanSummary(term);
  const usedSummaries = new Set([correctSummary]);
  const wrongOptions = shuffle(candidates)
    .filter((candidate) => candidate.no !== term.no)
    .map(cleanSummary)
    .filter((summary) => {
      if (!summary || usedSummaries.has(summary)) return false;
      usedSummaries.add(summary);
      return true;
    })
    .slice(0, OPTION_COUNT - 1);

  return {
    id: `${term.no}-${term.term}`,
    term,
    options: shuffle([correctSummary, ...wrongOptions]),
  };
}

function buildQuiz(): QuizQuestion[] {
  const candidates = quizCandidates();
  return shuffle(candidates)
    .map((term) => buildQuestion(term, candidates))
    .filter((question) => question.options.length === OPTION_COUNT)
    .slice(0, QUESTION_COUNT);
}

function correctSummary(question: QuizQuestion) {
  return cleanSummary(question.term);
}

export function GlossaryQuiz() {
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<AnswerRecord | null>(null);
  const [hintVisible, setHintVisible] = useState(false);

  const startNewQuiz = useCallback(() => {
    setQuestions(buildQuiz());
    setCurrentIndex(0);
    setAnswers([]);
    setCurrentAnswer(null);
    setHintVisible(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      startNewQuiz();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [startNewQuiz]);

  const currentQuestion = questions?.[currentIndex] ?? null;
  const isFinished =
    questions !== null && questions.length > 0 && currentIndex >= questions.length;

  const score = useMemo(
    () => answers.filter((answer) => answer.isCorrect).length,
    [answers],
  );

  function answerQuestion(selected: string) {
    if (!currentQuestion || currentAnswer) return;
    setCurrentAnswer({
      question: currentQuestion,
      selected,
      isCorrect: selected === correctSummary(currentQuestion),
      skipped: false,
    });
  }

  function skipQuestion() {
    if (!currentQuestion || currentAnswer) return;
    setCurrentAnswer({
      question: currentQuestion,
      selected: null,
      isCorrect: false,
      skipped: true,
    });
  }

  function goNext() {
    if (!currentAnswer) return;
    setAnswers((prev) => [...prev, currentAnswer]);
    setCurrentAnswer(null);
    setHintVisible(false);
    setCurrentIndex((index) => index + 1);
  }

  if (questions === null || questions.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/95 p-6 text-sm text-zinc-300">
        クイズを準備しています...
      </div>
    );
  }

  if (isFinished) {
    return (
      <QuizResult
        answers={answers}
        score={score}
        total={questions.length}
        onRestart={startNewQuiz}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/95 p-6 text-sm text-zinc-300">
        クイズを準備しています...
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-cyan-300/20 bg-zinc-900/95 p-4 shadow-2xl shadow-cyan-950/20 sm:p-5">
      <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">
            Question {currentIndex + 1} / {questions.length}
          </p>
          <h1 className="mt-2 break-words text-3xl font-black tracking-tight text-white sm:text-4xl">
            {currentQuestion.term.term}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            この用語の一言説明として正しいものを選んでください。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <div className="rounded border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100">
            {score} correct
            <span className="mt-1 block text-xs font-medium text-emerald-200/80">
              現在の正解数
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
        <div className="min-w-0">
          <div className="grid gap-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = currentAnswer?.selected === option;
              const isCorrect = option === correctSummary(currentQuestion);
              const showCorrect = currentAnswer && isCorrect;
              const showWrong = currentAnswer && isSelected && !isCorrect;
              return (
                <button
                  key={`${index}-${option}`}
                  type="button"
                  disabled={Boolean(currentAnswer)}
                  onClick={() => answerQuestion(option)}
                  className={`min-w-0 rounded-lg border p-4 text-left text-sm leading-6 transition focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-default ${
                    showCorrect
                      ? "border-emerald-300/70 bg-emerald-300/10 text-emerald-100"
                      : showWrong
                        ? "border-rose-300/70 bg-rose-300/10 text-rose-100"
                        : "border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-cyan-300/60 hover:text-cyan-100 disabled:hover:border-zinc-700 disabled:hover:text-zinc-200"
                  }`}
                >
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Choice {index + 1}
                  </span>
                  <span className="block whitespace-pre-wrap break-words">
                    {option}
                  </span>
                </button>
              );
            })}
          </div>

          {currentAnswer ? (
            <FeedbackPanel answer={currentAnswer} />
          ) : null}
        </div>

        <aside className="grid min-w-0 gap-3 self-start">
          <div className="rounded-lg border border-amber-300/30 bg-zinc-950 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100">
              Hint
            </p>
            {hintVisible ? (
              <CountermeasureList
                items={currentQuestion.term.countermeasures}
                emptyText="この用語には対策データがありません。"
              />
            ) : (
              <button
                type="button"
                onClick={() => setHintVisible(true)}
                className="mt-3 inline-flex h-10 w-full items-center justify-center rounded border border-amber-300/50 bg-amber-300/10 px-4 text-xs font-bold text-amber-100 transition hover:bg-amber-300/20"
              >
                ヒントを見る
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={skipQuestion}
            disabled={Boolean(currentAnswer)}
            className="inline-flex h-11 items-center justify-center rounded border border-zinc-700 bg-zinc-950 px-4 text-sm font-bold text-zinc-200 transition hover:border-amber-300/60 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            わからないのでスキップ
          </button>

          {currentAnswer ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex h-11 items-center justify-center rounded border border-cyan-300/70 bg-cyan-300 px-4 text-sm font-black text-zinc-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              次の問題へ
            </button>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function FeedbackPanel({
  answer,
}: {
  answer: AnswerRecord;
}) {
  const question = answer.question;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-5 rounded-lg border p-4 ${
        answer.isCorrect
          ? "border-emerald-300/50 bg-emerald-300/10"
          : "border-rose-300/50 bg-rose-300/10"
      }`}
    >
      <p
        className={`text-lg font-black ${
          answer.isCorrect ? "text-emerald-100" : "text-rose-100"
        }`}
      >
        {answer.isCorrect
          ? "正解"
          : answer.skipped
            ? "スキップしました"
            : "不正解"}
      </p>
      {!answer.isCorrect && answer.selected ? (
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          選んだ説明:{" "}
          <span className="whitespace-pre-wrap break-words text-zinc-100">
            {answer.selected}
          </span>
        </p>
      ) : null}
      <div className="mt-3">
        <DetailBlock label="正しい説明">{correctSummary(question)}</DetailBlock>
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-400">
        詳細解説と対策は結果画面の復習カードで確認できます。
      </p>
    </div>
  );
}

function LearningDetails({ term }: { term: GlossaryTerm }) {
  return (
    <div className="mt-4 grid min-w-0 gap-3">
      <DetailBlock label="正しい説明">{term.summary}</DetailBlock>
      <DetailBlock label="詳細解説">{term.detail}</DetailBlock>
      <div className="rounded border border-amber-300/30 bg-amber-950/10 p-3 shadow-inner shadow-black/20">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
          対策
        </p>
        <CountermeasureList
          items={term.countermeasures}
          emptyText="対策データはありません。"
        />
      </div>
    </div>
  );
}

function DetailBlock({
  children,
  label,
}: {
  children: string;
  label: string;
}) {
  return (
    <div className="rounded border border-cyan-300/20 bg-cyan-950/10 p-3 shadow-inner shadow-black/20">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-100">
        {children}
      </p>
    </div>
  );
}

function CountermeasureList({
  emptyText,
  items,
}: {
  emptyText: string;
  items: string[];
}) {
  if (items.length === 0) {
    return <p className="mt-2 text-sm leading-6 text-zinc-300">{emptyText}</p>;
  }

  return (
    <ul className="mt-2 grid list-disc gap-1 pl-5 text-sm leading-6 text-zinc-100 marker:text-amber-200">
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="whitespace-pre-wrap break-words">
          {item}
        </li>
      ))}
    </ul>
  );
}

function QuizResult({
  answers,
  onRestart,
  score,
  total,
}: {
  answers: AnswerRecord[];
  onRestart: () => void;
  score: number;
  total: number;
}) {
  const [reviewIndex, setReviewIndex] = useState(0);
  const missed = answers.filter((answer) => !answer.isCorrect && !answer.skipped);
  const skipped = answers.filter((answer) => answer.skipped);
  const reviewItems = answers.filter((answer) => !answer.isCorrect);
  const activeReview = reviewItems[reviewIndex];

  function moveReview(delta: number) {
    if (reviewItems.length <= 1) return;
    setReviewIndex((index) => {
      const next = index + delta;
      if (next < 0) return reviewItems.length - 1;
      if (next >= reviewItems.length) return 0;
      return next;
    });
  }

  return (
    <section className="rounded-lg border border-cyan-300/20 bg-zinc-900/95 p-4 shadow-2xl shadow-cyan-950/20 sm:p-5">
      <div className="border-b border-zinc-800 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">
              QUIZ RESULT
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              {total}問中 {score}問正解
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
              間違えた問題とスキップした問題を1問ずつ復習できます。
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <ResultMetric label="正解数" tone="success" value={String(score)} />
        <ResultMetric label="間違えた問題" tone="danger" value={String(missed.length)} />
        <ResultMetric label="スキップ" tone="warning" value={String(skipped.length)} />
      </div>

      <ResultActions onRestart={onRestart} />

      <section className="mt-6 rounded-lg border border-cyan-300/30 bg-zinc-950/80 p-4 shadow-xl shadow-black/40">
        <div className="flex flex-col gap-3 border-b border-cyan-300/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
              Review
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              復習対象
            </h2>
          </div>
          {reviewItems.length > 0 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveReview(-1)}
                disabled={reviewItems.length <= 1}
                aria-label="前の復習問題"
                className="inline-flex h-10 w-10 items-center justify-center rounded border border-cyan-300/40 bg-cyan-950/20 text-lg font-black text-cyan-50 transition hover:border-cyan-200 hover:bg-cyan-300/15 hover:text-white disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-black disabled:text-zinc-500 disabled:opacity-50"
              >
                ←
              </button>
              <span className="min-w-16 rounded border border-zinc-700 bg-black/60 px-2 py-1 text-center text-sm font-black text-zinc-100">
                {reviewIndex + 1} / {reviewItems.length}
              </span>
              <button
                type="button"
                onClick={() => moveReview(1)}
                disabled={reviewItems.length <= 1}
                aria-label="次の復習問題"
                className="inline-flex h-10 w-10 items-center justify-center rounded border border-cyan-300/40 bg-cyan-950/20 text-lg font-black text-cyan-50 transition hover:border-cyan-200 hover:bg-cyan-300/15 hover:text-white disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-black disabled:text-zinc-500 disabled:opacity-50"
              >
                →
              </button>
            </div>
          ) : null}
        </div>

        {activeReview ? (
          <ReviewCard answer={activeReview} />
        ) : (
          <div className="mt-4 rounded border border-emerald-300/50 bg-emerald-950/20 p-4 shadow-inner shadow-black/20">
            <p className="text-base font-black text-emerald-100">
              全問正解です
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              復習対象はありません。もう一度クイズを続けると新しい10問に挑戦できます。
            </p>
          </div>
        )}
      </section>
    </section>
  );
}

function ResultActions({
  onRestart,
}: {
  onRestart: () => void;
}) {
  return (
    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={onRestart}
        className="inline-flex h-11 items-center justify-center rounded border border-cyan-300/70 bg-cyan-300 px-5 text-sm font-black text-zinc-950 transition hover:bg-cyan-200"
      >
        もう一度クイズを続ける
      </button>
      <Link
        href="/glossary"
        className="inline-flex h-11 items-center justify-center rounded border border-zinc-700 bg-zinc-950 px-5 text-sm font-bold text-zinc-200 transition hover:border-cyan-300/60 hover:text-cyan-100"
      >
        Wordsに戻る
      </Link>
    </div>
  );
}

type ResultMetricTone = "success" | "danger" | "warning";

const RESULT_METRIC_STYLE: Record<
  ResultMetricTone,
  { container: string; label: string; value: string }
> = {
  success: {
    container: "border-emerald-300/45 bg-emerald-950/25 shadow-emerald-950/20",
    label: "text-emerald-100",
    value: "text-emerald-200",
  },
  danger: {
    container: "border-rose-300/45 bg-rose-950/25 shadow-rose-950/20",
    label: "text-rose-100",
    value: "text-rose-200",
  },
  warning: {
    container: "border-amber-300/45 bg-amber-950/25 shadow-amber-950/20",
    label: "text-amber-100",
    value: "text-amber-200",
  },
};

function ResultMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: ResultMetricTone;
  value: string;
}) {
  const style = RESULT_METRIC_STYLE[tone];
  return (
    <div
      className={`rounded-lg border bg-black p-4 shadow-lg ${style.container}`}
    >
      <p className={`text-xs font-black uppercase tracking-[0.18em] ${style.label}`}>
        {label}
      </p>
      <p className={`mt-2 text-4xl font-black leading-none ${style.value}`}>
        {value}
      </p>
    </div>
  );
}

function ReviewCard({ answer }: { answer: AnswerRecord }) {
  const term = answer.question.term;
  return (
    <article className="mt-4 min-w-0 rounded-lg border border-zinc-700 bg-black/45 p-4 shadow-inner shadow-black/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="break-words text-2xl font-black text-white drop-shadow">
          {term.term}
        </h3>
        <span
          className={`rounded border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] shadow-sm ${
            answer.skipped
              ? "border-amber-300/70 bg-amber-300/15 text-amber-100 shadow-amber-950/30"
              : "border-rose-300/70 bg-rose-300/15 text-rose-100 shadow-rose-950/30"
          }`}
        >
          {answer.skipped ? "skipped" : "incorrect"}
        </span>
      </div>
      {!answer.skipped && answer.selected ? (
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          選んだ説明:{" "}
          <span className="whitespace-pre-wrap break-words text-zinc-200">
            {answer.selected}
          </span>
        </p>
      ) : null}
      <LearningDetails term={term} />
    </article>
  );
}
