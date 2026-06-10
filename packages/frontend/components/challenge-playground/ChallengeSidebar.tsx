"use client";

import { useState } from "react";
import { NextActionCard } from "@/components/NextActionCard";
import { ScoreSummary } from "@/components/ScoreSummary";
import { getResultSummary } from "@/components/challenge-playground/status";
import type {
  PlaygroundActions,
  PlaygroundModel,
} from "@/components/challenge-playground/types";
import { DIFFICULTY_LABELS, type DifficultyMode } from "@/lib/difficultyConfig";

export function ChallengeSidebar({
  actions,
  model,
}: {
  actions: PlaygroundActions;
  model: PlaygroundModel;
}) {
  const {
    challenge,
    currentStep,
    defenseState,
    difficulty,
    hasAttacked,
    hasSelectedPatch,
    scoreCap,
  } = model;

  return (
    <aside className="relative z-0 flex min-w-0 flex-col gap-3 self-start">
      <NextActionCard
        attackedBody={challenge.stepCopy?.nextActionAttacked}
        codeReviewedBody={challenge.stepCopy?.nextActionCodeReviewed}
        selectedPatchTitle={model.selectedPatchTitle}
        status={model.uiStatus}
      />
      <ScoreSummary
        attackComplete={hasAttacked}
        defenseState={defenseState}
        score={model.score}
      />
      <ScoreCapBadge mode={model.mode} cap={scoreCap} />
      {model.visibleHints.length > 0 ? (
        <HintsPanel
          hints={model.visibleHints}
          total={challenge.hints.length}
          mode={difficulty.hints}
          onReveal={
            difficulty.hints === "onDemand"
              ? actions.handleRevealHint
              : undefined
          }
          canReveal={model.hintsRevealed < challenge.hints.length}
        />
      ) : difficulty.hints === "onDemand" ? (
        <button
          type="button"
          onClick={actions.handleRevealHint}
          className="rounded border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-left text-xs font-bold text-amber-100 transition hover:bg-amber-300/20"
        >
          💡 ヒントを表示する (1/{challenge.hints.length})
        </button>
      ) : null}
      <StepSummaryList
        attackedSummary={challenge.progress?.attackedSummary}
        codeReviewed={model.codeReviewed}
        currentStep={currentStep}
        defenseState={defenseState}
        hasAttacked={hasAttacked}
        hasSelectedPatch={hasSelectedPatch}
        selectedPatchTitle={model.selectedPatchTitle}
      />
    </aside>
  );
}

function ScoreCapBadge({
  mode,
  cap,
}: {
  mode: DifficultyMode;
  cap: number;
}) {
  return (
    <div className="relative min-w-0 rounded border border-zinc-700 bg-black p-2.5 text-xs text-zinc-300">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
        Score Cap
      </p>
      <p className="mt-1 text-xs leading-5 text-zinc-100">
        {DIFFICULTY_LABELS[mode]} モードのスコア上限は{" "}
        <span className="font-black text-emerald-200">{cap}</span> 点です。
      </p>
    </div>
  );
}

function HintsPanel({
  hints,
  total,
  mode,
  onReveal,
  canReveal,
}: {
  hints: string[];
  total: number;
  mode: "all" | "onDemand" | "none";
  onReveal?: () => void;
  canReveal: boolean;
}) {
  return (
    <aside className="relative min-w-0 rounded border border-amber-300/30 bg-zinc-950 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-100">
          ヒント ({hints.length}/{total})
        </p>
        {mode === "onDemand" && onReveal && canReveal ? (
          <button
            type="button"
            onClick={onReveal}
            className="rounded border border-amber-300/50 bg-amber-300/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-300/20"
          >
            次を開く
          </button>
        ) : null}
      </div>
      <ul className="mt-2 grid gap-1.5">
        {hints.map((hint, i) => (
          <HintItem
            key={`${i}:${hint.slice(0, 12)}`}
            index={i}
            text={hint}
          />
        ))}
      </ul>
    </aside>
  );
}

function HintItem({ index, text }: { index: number; text: string }) {
  const [open, setOpen] = useState(false);
  const bodyId = `hint-body-${index}`;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center gap-2 rounded border border-amber-300/20 bg-black/20 px-2 py-1.5 text-left text-xs leading-5 text-zinc-200 transition hover:border-amber-300/40 hover:bg-amber-300/10"
      >
        <span
          aria-hidden
          className={`text-xs font-bold text-amber-200 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200">
          ヒント {index + 1}
        </span>
      </button>
      {open ? (
        <p id={bodyId} className="mt-1.5 px-1 text-xs leading-5 text-zinc-200">
          {text}
        </p>
      ) : null}
    </li>
  );
}

function StepSummaryList({
  attackedSummary,
  codeReviewed,
  currentStep,
  defenseState,
  hasAttacked,
  hasSelectedPatch,
  selectedPatchTitle,
}: {
  attackedSummary?: string;
  codeReviewed: boolean;
  currentStep: number;
  defenseState: PlaygroundModel["defenseState"];
  hasAttacked: boolean;
  hasSelectedPatch: boolean;
  selectedPatchTitle?: string;
}) {
  const resultDone =
    defenseState === "success" ||
    defenseState === "failure" ||
    defenseState === "error";

  return (
    <div className="grid gap-1.5">
      <StepSummary
        active={currentStep === 1}
        complete={hasAttacked}
        description={
          hasAttacked
            ? (attackedSummary ?? "攻撃が刺さることを確認済み")
            : "未実行"
        }
        locked={false}
        title="Step 1：攻撃テスト"
      />
      <StepSummary
        active={currentStep === 2}
        complete={codeReviewed}
        description={codeReviewed ? "原因コードを確認済み" : "攻撃後に確認"}
        locked={!hasAttacked}
        title="Step 2：原因コード"
      />
      <StepSummary
        active={currentStep === 3}
        complete={hasSelectedPatch}
        description={selectedPatchTitle ?? "コードを修正してください"}
        locked={!codeReviewed}
        title="Step 3：コード修正"
      />
      <StepSummary
        active={currentStep === 4}
        complete={resultDone}
        description={getResultSummary(defenseState)}
        locked={!hasSelectedPatch}
        title="Step 4：再テスト"
      />
    </div>
  );
}

function StepSummary({
  active,
  complete,
  description,
  locked,
  title,
}: {
  active: boolean;
  complete: boolean;
  description: string;
  locked: boolean;
  title: string;
}) {
  return (
    <div
      className={`rounded border p-2.5 ${
        active
          ? "border-cyan-300/50 bg-cyan-300/10"
          : complete
            ? "border-emerald-300/30 bg-emerald-300/10"
            : locked
              ? "border-zinc-800 bg-zinc-950"
              : "border-zinc-700 bg-zinc-950"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-white">{title}</h3>
        <span
          className={`text-[10px] font-black ${
            complete
              ? "text-emerald-200"
              : locked
                ? "text-zinc-600"
                : "text-cyan-200"
          }`}
        >
          {complete ? "✓" : locked ? "LOCK" : active ? "NOW" : "NEXT"}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-4 text-zinc-400">{description}</p>
    </div>
  );
}
