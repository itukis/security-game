"use client";

import { useState } from "react";
import { AttackPanel } from "@/components/AttackPanel";
import { CodeViewer } from "@/components/CodeViewer";
import { NextActionCard, type QuestUiStatus } from "@/components/NextActionCard";
import { PatchSelector } from "@/components/PatchSelector";
import { ProgressStepper } from "@/components/ProgressStepper";
import { ResultPanel } from "@/components/ResultPanel";
import { ScoreSummary } from "@/components/ScoreSummary";
import { VulnerableAppPreview } from "@/components/VulnerableAppPreview";
import { verifyPatch } from "@/lib/api/challenges";
import type { Challenge, VerifyResult } from "@/lib/challengeTypes";
import { useToast } from "@/components/Toast";

type AttackState = "idle" | "running" | "success" | "failure";
type DefenseState = "idle" | "checking" | "success" | "failure" | "error";

const VERIFY_LOADING_STEPS = [
  "検証中",
  "攻撃前テスト中",
  "パッチ適用中",
  "再攻撃中",
];

export function ChallengePlayground({ challenge }: { challenge: Challenge }) {
  const toast = useToast();
  const [attackState, setAttackState] = useState<AttackState>("idle");
  const [codeReviewed, setCodeReviewed] = useState(false);
  const [defenseState, setDefenseState] = useState<DefenseState>("idle");
  const [selectedPatchId, setSelectedPatchId] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const selectedPatch = challenge.patchOptions.find(
    (patch) => patch.id === selectedPatchId,
  );
  const hasAttacked = attackState === "success";
  const hasSelectedPatch = selectedPatchId !== null;
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
  const retestDisabledReason =
    !hasAttacked
      ? "攻撃テストを実行すると、再テストに進めます。"
      : !codeReviewed
        ? "原因コードを確認すると、修正案を選べます。"
        : selectedPatchId === null
          ? "修正案を選択すると再テストできます。"
          : null;

  function handleRunAttack() {
    setAttackState("success");
    setCodeReviewed(false);
    setSelectedPatchId(null);
    setDefenseState("idle");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(null);
    setScore(25);
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

  function handleTryAnotherPatch() {
    setSelectedPatchId(null);
    setDefenseState("idle");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(null);
    setScore(hasAttacked ? 25 : 0);
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

  async function handleSubmitPatch() {
    if (!selectedPatch) {
      return;
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
        verifyPatch(challenge.id, selectedPatch.patch),
        wait(1200),
      ]);

      setVerifyResult(result);
      setDefenseState(result.passed ? "success" : "failure");
      setScore(result.passed ? 100 : 35);
      if (result.passed) {
        toast.success("問題をクリアしました！");
      } else {
        toast.error("防御失敗");
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

  return (
    <div className="mt-4 flex flex-col gap-4">
      <StickyMissionBar
        currentStep={currentStep}
        selectedPatchTitle={selectedPatch?.title}
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
            selectedPatchTitle={selectedPatch?.title}
            status={uiStatus}
          />
          <ScoreSummary
            attackComplete={hasAttacked}
            defenseState={defenseState}
            score={score}
          />
          <StepSummaryList
            attackedSummary={challenge.progress?.attackedSummary}
            codeReviewed={codeReviewed}
            currentStep={currentStep}
            defenseState={defenseState}
            hasAttacked={hasAttacked}
            hasSelectedPatch={hasSelectedPatch}
            selectedPatchTitle={selectedPatch?.title}
          />
        </aside>

        <section className="rounded-lg border border-zinc-700 bg-zinc-900/90 p-4 shadow-xl shadow-black/30 sm:p-5">
          {currentStep === 1 ? (
            <ActiveStepHeader
              eyebrow="Step 1"
              title="攻撃テスト"
              description={
                challenge.stepCopy?.step1Description ??
                "疑似攻撃を実行し、脆弱性が刺さるかを確認しましょう。"
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
              title="修正案を選択"
              description={
                challenge.stepCopy?.step3Description ??
                "原因に対する修正案を選びましょう。"
              }
            />
          ) : null}
          {currentStep === 4 ? (
            <ActiveStepHeader
              eyebrow="Step 4"
              title="再テスト結果"
              description={
                challenge.stepCopy?.step4Description ??
                "選んだ修正案で脆弱性を防げるか、学習用の疑似判定で確認します。"
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
                    "実際の攻撃処理は行わず、学習用の疑似判定だけを表示します。"
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
              <PatchSelector
                disabled={!canSelectPatch}
                disabledReason={
                  canSelectPatch ? null : "まず攻撃テストを実行してください。"
                }
                patchOptions={challenge.patchOptions}
                selectedPatchId={selectedPatchId}
                onSelectPatch={handleSelectPatch}
              />
            ) : null}

            {currentStep === 4 ? (
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
                selectedPatchTitle={selectedPatch?.title}
                verifyResult={verifyResult}
              />
            ) : null}
          </div>
        </section>
      </div>
    </div>
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
