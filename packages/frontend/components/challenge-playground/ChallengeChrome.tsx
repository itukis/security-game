"use client";

import type { QuestUiStatus } from "@/components/NextActionCard";
import {
  getNextActionLabel,
  getStatusLabel,
} from "@/components/challenge-playground/status";
import type { Difficulty } from "@/lib/challengeTypes";
import {
  DIFFICULTY_LABELS,
  getScoreCap,
  type DifficultyMode,
} from "@/lib/difficultyConfig";

export function DifficultySwitcher({
  mode,
  availableModes,
  problemDifficulty,
  onChange,
}: {
  mode: DifficultyMode;
  availableModes: DifficultyMode[];
  problemDifficulty: Difficulty;
  onChange: (next: DifficultyMode) => void;
}) {
  return (
    <div className="rounded-lg border border-cyan-300/20 bg-zinc-900/95 p-3 shadow-xl shadow-black/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
            Difficulty
          </p>
          <p className="mt-1 text-sm leading-5 text-zinc-300">
            出題モードを選ぶと、プレビュー有無・ヒント・スコア上限が変わります。
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Difficulty mode"
          className="flex flex-wrap gap-2"
        >
          {availableModes.map((m) => {
            const cap = getScoreCap(m, problemDifficulty);
            const active = m === mode;
            return (
              <button
                key={m}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => onChange(m)}
                className={`rounded border px-3 py-2 text-left text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                  active
                    ? "border-cyan-300 bg-cyan-300/10 text-cyan-100 shadow-lg shadow-cyan-950/30"
                    : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 hover:text-white"
                }`}
              >
                <span className="block text-sm font-black">
                  {DIFFICULTY_LABELS[m]}
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  cap {cap}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function StickyMissionBar({
  currentStep,
  selectedPatchTitle,
  status,
}: {
  currentStep: number;
  selectedPatchTitle?: string;
  status: QuestUiStatus;
}) {
  return (
    <div className="sticky top-0 z-20 rounded-lg border border-cyan-300/20 bg-zinc-950/95 p-3 shadow-xl shadow-black/40 backdrop-blur">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-cyan-300/40 bg-cyan-300/10 px-2 py-1 text-xs font-black text-cyan-100">
            現在ステップ: Step {currentStep}
          </span>
          <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-bold text-zinc-300">
            状態: {getStatusLabel(status)}
          </span>
          {selectedPatchTitle ? (
            <span className="rounded border border-emerald-300/30 bg-emerald-300/10 px-2 py-1 text-xs font-bold text-emerald-100">
              編集中: {selectedPatchTitle}
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-6 text-zinc-300">
          次にやること: {getNextActionLabel(status)}
        </p>
      </div>
    </div>
  );
}

export function ActiveStepHeader({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-zinc-800 pb-4">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-black text-white">{title}</h2>
      <p className="max-w-3xl text-sm leading-6 text-zinc-400">
        {description}
      </p>
    </div>
  );
}
