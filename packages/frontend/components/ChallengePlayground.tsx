"use client";

import { useMemo, useState } from "react";
import { AttackPanel } from "@/components/AttackPanel";
import { CodeEditor } from "@/components/CodeEditor";
import { CodeViewer } from "@/components/CodeViewer";
import { LiveAppIframe } from "@/components/LiveAppIframe";
import { NextActionCard, type QuestUiStatus } from "@/components/NextActionCard";
import { PatchSelector } from "@/components/PatchSelector";
import { ProgressStepper } from "@/components/ProgressStepper";
import { ResultPanel } from "@/components/ResultPanel";
import { ScoreSummary } from "@/components/ScoreSummary";
import { VulnerableAppPreview } from "@/components/VulnerableAppPreview";
import { verifyPatch } from "@/lib/api/challenges";
import type { Challenge, VerifyResult } from "@/lib/challengeTypes";
import {
  DIFFICULTY,
  DIFFICULTY_LABELS,
  type DifficultyMode,
} from "@/lib/difficultyConfig";
import { makePatch } from "@/lib/makePatch";
import { useToast } from "@/components/Toast";

type AttackState = "idle" | "running" | "success" | "failure";
type DefenseState = "idle" | "checking" | "success" | "failure" | "error";

const VERIFY_LOADING_STEPS = [
  "検証中",
  "攻撃前テスト中",
  "パッチ適用中",
  "再攻撃中",
];

const PATCH_FILE_PATH = "src/server.js";

const MODE_ORDER: DifficultyMode[] = ["select", "editPreview", "editOnly"];

export function ChallengePlayground({ challenge }: { challenge: Challenge }) {
  const toast = useToast();
  const [mode, setMode] = useState<DifficultyMode>("select");
  const difficulty = DIFFICULTY[mode];

  const [attackState, setAttackState] = useState<AttackState>("idle");
  const [codeReviewed, setCodeReviewed] = useState(false);
  const [defenseState, setDefenseState] = useState<DefenseState>("idle");
  const [selectedPatchId, setSelectedPatchId] = useState<string | null>(null);
  const [editorCode, setEditorCode] = useState<string>(challenge.initialCode);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [previewReloadKey, setPreviewReloadKey] = useState(0);
  const [previewReloading, setPreviewReloading] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(0);

  const selectedPatch = challenge.patchOptions.find(
    (patch) => patch.id === selectedPatchId,
  );
  const hasAttacked = attackState === "success";
  const isEditorMode = difficulty.patchInput === "editor";
  const hasEditedCode = isEditorMode ? editorCode !== challenge.initialCode : false;
  const hasSelectedPatch = isEditorMode ? hasEditedCode : selectedPatchId !== null;
  const canSelectPatch = hasAttacked && codeReviewed;
  const canRetest = canSelectPatch && hasSelectedPatch;
  const uiStatus = getQuestUiStatus({
    attackState,
    codeReviewed,
    defenseState,
    hasSelectedPatch,
  });
  const currentStep = getCurrentStep(uiStatus);
  const completedSteps = getCompletedSteps({
    attackState,
    codeReviewed,
    defenseState,
    hasSelectedPatch,
  });

  const visibleHints = useMemo(() => {
    if (difficulty.hints === "all") return challenge.hints;
    if (difficulty.hints === "none") return [];
    return challenge.hints.slice(0, hintsRevealed);
  }, [challenge.hints, difficulty.hints, hintsRevealed]);

  const retestDisabledReason = !hasAttacked
    ? "攻撃テストを実行すると、再テストに進めます。"
    : !codeReviewed
      ? "原因コードを確認すると、修正案を選べます。"
      : !hasSelectedPatch
        ? isEditorMode
          ? "コードを編集すると再テストできます。"
          : "修正案を選択すると再テストできます。"
        : null;

  function handleModeChange(next: DifficultyMode) {
    if (next === mode) return;
    setMode(next);
    handleResetMission();
    setEditorCode(challenge.initialCode);
    setHintsRevealed(0);
  }

  function handleRunAttack() {
    setAttackState("success");
    setCodeReviewed(false);
    setSelectedPatchId(null);
    setDefenseState("idle");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(null);
    setScore(Math.min(difficulty.scoreCap, 25));
  }

  function handleConfirmCodeReviewed() {
    setCodeReviewed(true);
    setSelectedPatchId(null);
    setDefenseState("idle");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(null);
  }

  function handleSelectPatch(patchId: string) {
    setSelectedPatchId(patchId);
    setDefenseState("idle");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(null);
  }

  function handleEditorChange(next: string) {
    setEditorCode(next);
    if (defenseState !== "idle") {
      setDefenseState("idle");
      setVerifyResult(null);
      setVerifyError(null);
    }
  }

  function handleTryAnotherPatch() {
    setSelectedPatchId(null);
    setDefenseState("idle");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(null);
    setScore(hasAttacked ? Math.min(difficulty.scoreCap, 25) : 0);
  }

  function handleResetMission() {
    setAttackState("idle");
    setCodeReviewed(false);
    setSelectedPatchId(null);
    setDefenseState("idle");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(null);
    setScore(0);
  }

  function handleRevealHint() {
    setHintsRevealed((n) => Math.min(challenge.hints.length, n + 1));
  }

  async function handleSubmitPatch() {
    let patchString: string | null = null;
    if (isEditorMode) {
      if (!hasEditedCode) return;
      patchString = makePatch(
        PATCH_FILE_PATH,
        challenge.initialCode,
        editorCode,
      );
    } else {
      if (!selectedPatch) return;
      patchString = selectedPatch.patch;
    }

    setDefenseState("checking");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(VERIFY_LOADING_STEPS[0]);

    let stepIndex = 0;
    const loadingTimer = window.setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, VERIFY_LOADING_STEPS.length - 1);
      setLoadingStep(VERIFY_LOADING_STEPS[stepIndex]);
    }, 1400);

    try {
      const [result] = await Promise.all([
        verifyPatch(challenge.id, patchString),
        wait(1200),
      ]);

      setVerifyResult(result);
      setDefenseState(result.passed ? "success" : "failure");
      const calculated = result.passed ? 100 : 35;
      setScore(Math.min(difficulty.scoreCap, calculated));
      if (result.passed) {
        toast.success("問題をクリアしました！");
        if (difficulty.showSite) {
          setPreviewReloading(true);
          window.setTimeout(() => {
            setPreviewReloadKey((k) => k + 1);
            setPreviewReloading(false);
          }, 12000);
        }
      } else {
        toast.error("防御失敗");
        if (difficulty.hints === "onDemand") {
          handleRevealHint();
        }
      }
    } catch (error) {
      setDefenseState("error");
      setVerifyError(
        error instanceof Error
          ? error.message
          : "パッチ検証中に不明なエラーが発生しました。",
      );
      toast.error("通信エラーが発生しました");
    } finally {
      window.clearInterval(loadingTimer);
      setLoadingStep(null);
    }
  }

  const showLiveIframe = isEditorMode && difficulty.showSite;
  const selectedPatchTitle = isEditorMode
    ? hasEditedCode
      ? "ユーザー編集コード"
      : undefined
    : selectedPatch?.title;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <DifficultySwitcher mode={mode} onChange={handleModeChange} />

      <StickyMissionBar
        currentStep={currentStep}
        selectedPatchTitle={selectedPatchTitle}
        status={uiStatus}
      />

      <ProgressStepper
        completedSteps={completedSteps}
        currentStep={currentStep}
        step2Subtitle={challenge.stepCopy?.stepperStep2Subtitle}
      />

      <div className="grid gap-4 xl:grid-cols-[0.38fr_0.62fr]">
        <aside className="flex flex-col gap-4 xl:sticky xl:top-20 xl:self-start">
          <NextActionCard
            attackedBody={challenge.stepCopy?.nextActionAttacked}
            codeReviewedBody={challenge.stepCopy?.nextActionCodeReviewed}
            selectedPatchTitle={selectedPatchTitle}
            status={uiStatus}
          />
          <ScoreSummary
            attackComplete={hasAttacked}
            defenseState={defenseState}
            score={score}
          />
          <ScoreCapBadge mode={mode} cap={difficulty.scoreCap} />
          {visibleHints.length > 0 ? (
            <HintsPanel
              hints={visibleHints}
              total={challenge.hints.length}
              mode={difficulty.hints}
              onReveal={difficulty.hints === "onDemand" ? handleRevealHint : undefined}
              canReveal={hintsRevealed < challenge.hints.length}
            />
          ) : difficulty.hints === "onDemand" ? (
            <button
              type="button"
              onClick={handleRevealHint}
              className="rounded-lg border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-left text-sm font-bold text-amber-100 transition hover:bg-amber-300/20"
            >
              💡 ヒントを表示する (1/{challenge.hints.length})
            </button>
          ) : null}
          <StepSummaryList
            attackedSummary={challenge.progress?.attackedSummary}
            codeReviewed={codeReviewed}
            currentStep={currentStep}
            defenseState={defenseState}
            hasAttacked={hasAttacked}
            hasSelectedPatch={hasSelectedPatch}
            selectedPatchTitle={selectedPatchTitle}
          />
        </aside>

        <section className="rounded-lg border border-zinc-700 bg-zinc-900/90 p-4 shadow-xl shadow-black/30 sm:p-5">
          {currentStep === 1 ? (
            <ActiveStepHeader
              eyebrow="Step 1"
              title="攻撃テスト"
              description={
                challenge.stepCopy?.step1Description ??
                "攻撃を実行し、脆弱性が刺さるかを確認しましょう。"
              }
            />
          ) : null}
          {currentStep === 2 ? (
            <ActiveStepHeader
              eyebrow="Step 2"
              title="原因コードを確認"
              description={
                challenge.stepCopy?.step2Description ??
                "脆弱性の原因になっている箇所を探します。確認できたら次のステップへ進みます。"
              }
            />
          ) : null}
          {currentStep === 3 ? (
            <ActiveStepHeader
              eyebrow="Step 3"
              title={isEditorMode ? "コードを修正" : "修正案を選択"}
              description={
                isEditorMode
                  ? "脆弱なコードを直接編集して、原因を取り除きましょう。"
                  : (challenge.stepCopy?.step3Description ??
                    "原因に対する修正案を選びましょう。")
              }
            />
          ) : null}
          {currentStep === 4 ? (
            <ActiveStepHeader
              eyebrow="Step 4"
              title="再テスト結果"
              description={
                challenge.stepCopy?.step4Description ??
                "選んだ修正案で脆弱性を防げるか、実際の攻撃テストで確認します。"
              }
            />
          ) : null}

          <div className="mt-4">
            {currentStep === 1 ? (
              <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                <VulnerableAppPreview challenge={challenge} />
                <AttackPanel
                  attackPayload={challenge.attackPayload}
                  attackState={attackState}
                  attackVerifiedMessage={
                    challenge.attackVerifiedMessage ??
                    "脆弱性が刺さる動きを確認しました"
                  }
                  disclaimer={
                    challenge.attackVerifyDisclaimer ??
                    "実際の脆弱アプリケーションに対して攻撃を実行し、防御を検証します。"
                  }
                  onRunAttack={handleRunAttack}
                />
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="grid gap-4">
                <CodeViewer
                  code={challenge.initialCode}
                  language="typescript"
                  title="Step 2：原因コードを確認"
                />
                <div className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-4">
                  <p className="text-sm font-bold text-amber-100">
                    {challenge.stepCopy?.focusBoxTitle ?? "見るポイント"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-200">
                    {challenge.stepCopy?.focusBoxBody ??
                      "ユーザー入力をそのまま処理に渡している箇所を探してください。"}
                  </p>
                  <button
                    type="button"
                    onClick={handleConfirmCodeReviewed}
                    className="mt-4 inline-flex h-11 w-full items-center justify-center rounded border border-cyan-300/60 bg-cyan-300 px-4 text-sm font-black text-zinc-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-zinc-950 sm:w-auto"
                  >
                    原因コードを確認した
                  </button>
                </div>
              </div>
            ) : null}

            {currentStep === 3 ? (
              isEditorMode ? (
                <div
                  className={
                    showLiveIframe
                      ? "grid gap-4 xl:grid-cols-2"
                      : "grid gap-4"
                  }
                >
                  <CodeEditor
                    value={editorCode}
                    language="javascript"
                    onChange={handleEditorChange}
                    onReset={() => handleEditorChange(challenge.initialCode)}
                  />
                  {showLiveIframe ? (
                    <LiveAppIframe
                      problemId={challenge.id}
                      reloadKey={previewReloadKey}
                      reloading={previewReloading}
                    />
                  ) : null}
                </div>
              ) : (
                <PatchSelector
                  disabled={!canSelectPatch}
                  disabledReason={
                    canSelectPatch ? null : "まず攻撃テストを実行してください。"
                  }
                  patchOptions={challenge.patchOptions}
                  selectedPatchId={selectedPatchId}
                  onSelectPatch={handleSelectPatch}
                />
              )
            ) : null}

            {currentStep === 4 ? (
              <>
                {showLiveIframe ? (
                  <div className="mb-4">
                    <LiveAppIframe
                      problemId={challenge.id}
                      reloadKey={previewReloadKey}
                      reloading={previewReloading}
                    />
                  </div>
                ) : null}
                <ResultPanel
                  canRetest={canRetest}
                  challenge={challenge}
                  defenseState={defenseState}
                  disabledReason={retestDisabledReason}
                  errorMessage={verifyError}
                  loadingStep={loadingStep}
                  onReset={handleResetMission}
                  onRetest={handleSubmitPatch}
                  onTryAnotherPatch={handleTryAnotherPatch}
                  selectedPatchTitle={selectedPatchTitle}
                  verifyResult={verifyResult}
                  onRevealHint={
                    difficulty.hints === "onDemand" &&
                    hintsRevealed < challenge.hints.length
                      ? handleRevealHint
                      : undefined
                  }
                  hintRevealLabel={`次のヒントを見る (${hintsRevealed + 1}/${challenge.hints.length})`}
                />
              </>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function DifficultySwitcher({
  mode,
  onChange,
}: {
  mode: DifficultyMode;
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
            出題モードを選ぶと、Step 3 の修正方法とヒント・スコア上限が変わります。
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Difficulty mode"
          className="flex flex-wrap gap-2"
        >
          {MODE_ORDER.map((m) => {
            const settings = DIFFICULTY[m];
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
                  cap {settings.scoreCap}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
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
    <div className="rounded border border-zinc-700 bg-black p-3 text-xs text-zinc-300">
      <p className="font-bold uppercase tracking-[0.18em] text-zinc-500">
        Score Cap
      </p>
      <p className="mt-1 text-sm text-zinc-100">
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
    <aside className="rounded-lg border border-amber-300/30 bg-amber-300/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100">
          ヒント ({hints.length}/{total})
        </p>
        {mode === "onDemand" && onReveal && canReveal ? (
          <button
            type="button"
            onClick={onReveal}
            className="rounded border border-amber-300/50 bg-amber-300/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-100 transition hover:bg-amber-300/20"
          >
            次を開く
          </button>
        ) : null}
      </div>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-200">
        {hints.map((hint, i) => (
          <li key={`${i}:${hint.slice(0, 12)}`}>- {hint}</li>
        ))}
      </ul>
    </aside>
  );
}

function StickyMissionBar({
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
              選択中: {selectedPatchTitle}
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

function ActiveStepHeader({
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
  defenseState: DefenseState;
  hasAttacked: boolean;
  hasSelectedPatch: boolean;
  selectedPatchTitle?: string;
}) {
  const resultDone =
    defenseState === "success" ||
    defenseState === "failure" ||
    defenseState === "error";

  return (
    <div className="grid gap-2">
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
        description={selectedPatchTitle ?? "修正案を選択してください"}
        locked={!codeReviewed}
        title="Step 3：修正案"
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
      className={`rounded border p-3 ${
        active
          ? "border-cyan-300/50 bg-cyan-300/10"
          : complete
            ? "border-emerald-300/30 bg-emerald-300/10"
            : locked
              ? "border-zinc-800 bg-zinc-950/50 opacity-60"
              : "border-zinc-700 bg-zinc-950"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <span
          className={`text-xs font-black ${
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
      <p className="mt-1 text-xs leading-5 text-zinc-400">{description}</p>
    </div>
  );
}

function getQuestUiStatus({
  attackState,
  codeReviewed,
  defenseState,
  hasSelectedPatch,
}: {
  attackState: AttackState;
  codeReviewed: boolean;
  defenseState: DefenseState;
  hasSelectedPatch: boolean;
}): QuestUiStatus {
  if (defenseState === "checking") {
    return "verifying";
  }

  if (defenseState === "success") {
    return "passed";
  }

  if (defenseState === "failure" || defenseState === "error") {
    return "failed";
  }

  if (hasSelectedPatch) {
    return "patchSelected";
  }

  if (codeReviewed) {
    return "codeReviewed";
  }

  if (attackState === "success") {
    return "attacked";
  }

  return "idle";
}

function getCurrentStep(status: QuestUiStatus) {
  if (status === "idle") {
    return 1;
  }

  if (status === "attacked") {
    return 2;
  }

  if (status === "codeReviewed") {
    return 3;
  }

  return 4;
}

function getCompletedSteps({
  attackState,
  codeReviewed,
  defenseState,
  hasSelectedPatch,
}: {
  attackState: AttackState;
  codeReviewed: boolean;
  defenseState: DefenseState;
  hasSelectedPatch: boolean;
}) {
  const completedSteps: number[] = [];

  if (attackState === "success") {
    completedSteps.push(1);
  }

  if (codeReviewed) {
    completedSteps.push(2);
  }

  if (hasSelectedPatch) {
    completedSteps.push(3);
  }

  if (defenseState === "success" || defenseState === "failure") {
    completedSteps.push(4);
  }

  return completedSteps;
}

function getStatusLabel(status: QuestUiStatus) {
  const labels: Record<QuestUiStatus, string> = {
    idle: "未開始",
    attacked: "攻撃済み",
    codeReviewed: "原因確認済み",
    patchSelected: "修正案選択済み",
    verifying: "検証中",
    passed: "防御成功",
    failed: "防御失敗",
  };

  return labels[status];
}

function getNextActionLabel(status: QuestUiStatus) {
  const labels: Record<QuestUiStatus, string> = {
    idle: "攻撃テストを実行",
    attacked: "原因コードを確認する",
    codeReviewed: "修正案を選択",
    patchSelected: "修正後に再テストする",
    verifying: "検証完了を待つ",
    passed: "結果と解説を確認",
    failed: "別の修正案を試す",
  };

  return labels[status];
}

function getResultSummary(defenseState: DefenseState) {
  if (defenseState === "success") {
    return "防御成功";
  }

  if (defenseState === "failure") {
    return "防御失敗";
  }

  if (defenseState === "error") {
    return "APIエラー";
  }

  if (defenseState === "checking") {
    return "検証中";
  }

  return "修正案選択後に実行";
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
