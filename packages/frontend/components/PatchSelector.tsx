"use client";

import { useMemo } from "react";
import type { PatchOption } from "@/lib/challengeTypes";

interface PatchSelectorProps {
  options: PatchOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// Fisher–Yates shuffle in-place on a copy. We re-shuffle whenever the options
// array reference changes, which happens on a fresh mount (e.g., the user
// re-entered Step 3 after switching modes or re-trying), so the display
// order is randomized each time but stable across clicks within one attempt.
function shuffle<T>(input: T[]): T[] {
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function PatchSelector({ options, selectedId, onSelect }: PatchSelectorProps) {
  const shuffledOptions = useMemo(() => shuffle(options), [options]);
  return (
    <div className="grid min-w-0 gap-3">
      <div className="rounded border border-zinc-700 bg-zinc-950 p-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
          Step 3：修正案を選ぶ
        </p>
        <p className="mt-1 text-xs leading-5 text-zinc-400">
          脆弱性を直すと考えられる修正案を1つ選んで「再テスト」を実行してください。
        </p>
      </div>
      <ul role="radiogroup" aria-label="修正案" className="grid gap-2">
        {shuffledOptions.map((option, index) => {
          const selected = option.id === selectedId;
          return (
            <li key={option.id}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(option.id)}
                className={`flex w-full flex-col gap-1 rounded border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                  selected
                    ? "border-cyan-300 bg-cyan-300/10 shadow-lg shadow-cyan-950/30"
                    : "border-zinc-700 bg-zinc-950 hover:border-zinc-500 hover:bg-zinc-900"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${
                      selected
                        ? "border-cyan-200 bg-cyan-300 text-zinc-950"
                        : "border-zinc-600 bg-zinc-950 text-zinc-400"
                    }`}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span
                    className={`text-sm font-bold ${selected ? "text-cyan-100" : "text-white"}`}
                  >
                    {option.title}
                  </span>
                </span>
                <span className="pl-7 text-xs leading-5 text-zinc-300">
                  {option.description}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
