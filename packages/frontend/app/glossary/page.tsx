"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { GLOSSARY_TERMS, type GlossaryTerm } from "@/lib/glossaryData";

const PAGE_SIZE = 20;

export default function GlossaryPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);

  const trimmedQuery = query.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;

  const filtered = useMemo(() => {
    if (!isSearching) return GLOSSARY_TERMS;
    return GLOSSARY_TERMS.filter((t) => {
      return (
        t.term.toLowerCase().includes(trimmedQuery) ||
        t.reading.toLowerCase().includes(trimmedQuery) ||
        t.summary.toLowerCase().includes(trimmedQuery)
      );
    });
  }, [trimmedQuery, isSearching]);

  // Search mode shows all matches at once (no pagination). Browse mode pages
  // through the full 100-term list 20 at a time.
  const totalPages = Math.max(1, Math.ceil(GLOSSARY_TERMS.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const visibleTerms = isSearching
    ? filtered
    : filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleQueryChange(next: string) {
    setQuery(next);
    setOpenId(null);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="min-h-screen bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(250,204,21,0.05)_1px,transparent_1px)] bg-[size:34px_34px]">
        <Header />

        <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 border-b border-zinc-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">
                Reference
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Words and Quiz
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300 sm:text-base">
                セキュリティ用語 {GLOSSARY_TERMS.length} 選
              </p>
            </div>
            <Link
              href="/glossary/quiz"
              className="inline-flex h-11 items-center justify-center rounded border border-cyan-300/70 bg-cyan-300 px-5 text-sm font-black text-zinc-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              クイズを始める
            </Link>
          </div>

          <div className="mt-6">
            <label className="block">
              <span className="sr-only">用語を検索</span>
              <input
                type="search"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="用語を検索..."
                className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/60 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
              />
            </label>
            <p className="mt-2 text-xs text-zinc-500">
              {isSearching
                ? `検索結果: ${filtered.length} 件`
                : `全 ${GLOSSARY_TERMS.length} 件 / ページ ${safePage} / ${totalPages}`}
            </p>
          </div>

          {visibleTerms.length === 0 ? (
            <p className="mt-8 rounded border border-zinc-800 bg-zinc-900/50 p-6 text-center text-sm text-zinc-400">
              一致する用語が見つかりませんでした。
            </p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {visibleTerms.map((term) => (
                <GlossaryCard
                  key={term.no}
                  term={term}
                  isOpen={openId === term.no}
                  onToggle={() =>
                    setOpenId((current) => (current === term.no ? null : term.no))
                  }
                />
              ))}
            </ul>
          )}

          {!isSearching && totalPages > 1 ? (
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onChange={(next) => {
                setPage(next);
                setOpenId(null);
                // Scroll back to the top of the list so the user lands on the
                // first card of the new page.
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}

function GlossaryCard({
  term,
  isOpen,
  onToggle,
}: {
  term: GlossaryTerm;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="rounded-lg border border-cyan-300/20 bg-zinc-900/90">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-start gap-3 rounded-lg p-4 text-left transition hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
      >
        <span
          aria-hidden
          className={`mt-1 shrink-0 text-xs text-cyan-200 transition-transform duration-150 ${
            isOpen ? "rotate-90" : ""
          }`}
        >
          ▶
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-base font-bold text-white">{term.term}</h2>
            <span className="text-xs text-zinc-500">{term.reading}</span>
          </div>
          <p className="mt-1 text-sm leading-6 text-zinc-300">{term.summary}</p>
        </div>
      </button>

      {isOpen ? (
        <div className="border-t border-zinc-800 px-4 pb-4 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
            詳細解説
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-200">{term.detail}</p>

          {term.countermeasures.length > 0 ? (
            <>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                対策
              </p>
              <ul className="mt-2 grid list-disc gap-1 pl-5 text-sm leading-6 text-zinc-200 marker:text-cyan-200">
                {term.countermeasures.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

// Returns the list of page numbers (and "..." gap markers) to render.
// Up to 7 pages: show all. Beyond that, always show first / last / current ± 1
// with "..." between, so the bar stays single-row at 375px even if the corpus
// grows past ~7 pages.
function getPageWindow(
  currentPage: number,
  totalPages: number,
): Array<number | "gap-left" | "gap-right"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const result: Array<number | "gap-left" | "gap-right"> = [1];
  const left = Math.max(2, currentPage - 1);
  const right = Math.min(totalPages - 1, currentPage + 1);

  if (left > 2) result.push("gap-left");
  for (let p = left; p <= right; p++) result.push(p);
  if (right < totalPages - 1) result.push("gap-right");

  result.push(totalPages);
  return result;
}

function Pagination({
  currentPage,
  totalPages,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  onChange: (next: number) => void;
}) {
  const items = getPageWindow(currentPage, totalPages);

  return (
    <nav
      aria-label="ページ送り"
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
    >
      <button
        type="button"
        onClick={() => onChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="h-11 rounded border border-zinc-700 bg-zinc-950 px-3 text-xs font-bold text-zinc-200 transition hover:border-cyan-300/60 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-700 disabled:hover:text-zinc-200 sm:h-9"
      >
        ← 前へ
      </button>
      {items.map((item) => {
        if (item === "gap-left" || item === "gap-right") {
          return (
            <span
              key={item}
              aria-hidden
              className="px-1 text-xs text-zinc-500"
            >
              …
            </span>
          );
        }
        const active = item === currentPage;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={active ? "page" : undefined}
            className={`h-11 min-w-11 rounded border px-3 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:h-9 sm:min-w-9 ${
              active
                ? "border-cyan-300 bg-cyan-300/10 text-cyan-100 shadow-lg shadow-cyan-950/30"
                : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-cyan-300/60 hover:text-cyan-100"
            }`}
          >
            {item}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="h-11 rounded border border-zinc-700 bg-zinc-950 px-3 text-xs font-bold text-zinc-200 transition hover:border-cyan-300/60 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-700 disabled:hover:text-zinc-200 sm:h-9"
      >
        次へ →
      </button>
    </nav>
  );
}
