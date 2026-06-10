"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import { PATCH_FILE_PATH } from "@/components/challenge-playground/constants";
import { postXssPreviewPayload, wait } from "@/components/challenge-playground/previewHelpers";
import {
  getCompletedSteps,
  getCurrentStep,
  getQuestUiStatus,
} from "@/components/challenge-playground/status";
import type {
  DefenseState,
  PlaygroundState,
  PreviewApplyState,
} from "@/components/challenge-playground/types";
import { usePreviewApply } from "@/components/challenge-playground/usePreviewApply";
import { usePatchVerification } from "@/components/challenge-playground/usePatchVerification";
import { resetContainer } from "@/lib/api/challenges";
import type { Challenge, PreviewServerStatus, VerifyResult } from "@/lib/challengeTypes";
import {
  DIFFICULTY,
  getAvailableModes,
  getScoreCap,
  type DifficultyMode,
} from "@/lib/difficultyConfig";
import { makePatch } from "@/lib/makePatch";

export function useChallengePlaygroundState(challenge: Challenge): PlaygroundState {
  const toast = useToast();
  const availableModes = useMemo(
    () => getAvailableModes(challenge.difficulty),
    [challenge.difficulty],
  );
  const [mode, setMode] = useState<DifficultyMode>(
    availableModes.includes("editPreview") ? "editPreview" : availableModes[0],
  );
  const difficulty = DIFFICULTY[mode];
  const scoreCap = getScoreCap(mode, challenge.difficulty);
  const [attackState, setAttackState] = useState<"idle" | "running" | "success" | "failure">("idle");
  const [codeReviewed, setCodeReviewed] = useState(false);
  const [defenseState, setDefenseState] = useState<DefenseState>("idle");
  const [selectedPatchId, setSelectedPatchId] = useState<string | null>(null);
  const [editorCode, setEditorCode] = useState<string>(challenge.initialCode);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [, setCompletedAt] = useState<number | null>(null);
  const [previewReloadKey, setPreviewReloadKey] = useState(0);
  const [previewReloading, setPreviewReloading] = useState(false);
  const [previewAutoTestNonce, setPreviewAutoTestNonce] = useState(0);
  const [previewStatus, setPreviewStatus] = useState<PreviewServerStatus>("baseline");
  const [previewApplyState, setPreviewApplyState] = useState<PreviewApplyState>("idle");
  const [previewApplyError, setPreviewApplyError] = useState<string | null>(null);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [step1Confirmed, setStep1Confirmed] = useState(false);

  const selectedPatch = challenge.patchOptions.find((patch) => patch.id === selectedPatchId);
  const hasAttacked = attackState === "success";
  const isEditorMode = difficulty.patchInput === "editor";
  const hasEditedCode = isEditorMode ? editorCode !== challenge.initialCode : false;
  const hasSelectedPatch = isEditorMode ? hasEditedCode : selectedPatchId !== null;
  const canSelectPatch = hasAttacked && codeReviewed;
  const canRetest = canSelectPatch && hasSelectedPatch;
  const uiStatus = getQuestUiStatus({ attackState, codeReviewed, defenseState, hasSelectedPatch });
  const currentStep = getCurrentStep(uiStatus, step1Confirmed);
  const completedSteps = getCompletedSteps({ attackState, codeReviewed, defenseState, hasSelectedPatch });
  const visibleHints = useMemo(() => {
    if (difficulty.hints === "all") return challenge.hints;
    if (difficulty.hints === "none") return [];
    return challenge.hints.slice(0, hintsRevealed);
  }, [challenge.hints, difficulty.hints, hintsRevealed]);
  const retestDisabledReason = !hasAttacked
    ? "攻撃テストを実行すると、検証に進めます。"
    : !codeReviewed
      ? "原因コードを確認すると、修正に進めます。"
      : !hasSelectedPatch
        ? isEditorMode
          ? "コードを編集すると検証できます。"
          : "修正案を1つ選ぶと検証できます。"
        : null;

  function resetPreviewApplyState() {
    setPreviewStatus("baseline");
    setPreviewApplyState("idle");
    setPreviewApplyError(null);
    setPreviewReloading(false);
  }

  function makeCurrentPatch() {
    if (!isEditorMode) {
      return selectedPatch?.patch;
    }
    return makePatch(PATCH_FILE_PATH, challenge.initialCode, editorCode);
  }

  function handleModeChange(next: DifficultyMode) {
    if (next === mode) return;
    setMode(next);
    handleResetMission();
    setEditorCode(challenge.initialCode);
    setHintsRevealed(0);
    resetPreviewApplyState();
  }

  function handleRunAttack() {
    setAttackState("success");
    setCodeReviewed(false);
    setSelectedPatchId(null);
    setDefenseState("idle");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(null);
    resetPreviewApplyState();
    setScore((prev) => Math.max(prev, Math.min(scoreCap, 25)));
  }

  function handleProceedToStep2() {
    if (attackState !== "success") return;
    setStep1Confirmed(true);
  }

  function handleConfirmCodeReviewed() {
    setCodeReviewed(true);
    setSelectedPatchId(null);
    setDefenseState("idle");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(null);
    resetPreviewApplyState();
  }

  function handleSelectPatch(patchId: string) {
    setSelectedPatchId(patchId);
    setDefenseState("idle");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(null);
    resetPreviewApplyState();
  }

  function handleEditorChange(next: string) {
    setEditorCode(next);
    resetPreviewApplyState();
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
    resetPreviewApplyState();
    setScore(hasAttacked ? Math.min(scoreCap, 25) : 0);
  }

  function handleBackToEditor() {
    setDefenseState("idle");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(null);
    resetPreviewApplyState();
  }

  function handleResetMission() {
    setAttackState("idle");
    setStep1Confirmed(false);
    setCodeReviewed(false);
    setSelectedPatchId(null);
    setEditorCode(challenge.initialCode);
    setDefenseState("idle");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(null);
    setScore(0);
    setCompletedAt(null);
    resetPreviewApplyState();
    setPreviewAutoTestNonce(0);
    void resetContainer(challenge.id);
  }

  function handleRevealHint() {
    setHintsRevealed((n) => Math.min(challenge.hints.length, n + 1));
  }

  async function refreshPreviewAfterPatch(
    nextStatus: PreviewServerStatus,
    delayMs = 0,
  ) {
    if (!difficulty.showSite) return;
    setPreviewReloading(true);
    try {
      if (delayMs > 0) await wait(delayMs);
      if (challenge.id === "xss-comments") {
        await postXssPreviewPayload(challenge.id);
      }
      setPreviewReloadKey((k) => k + 1);
      setPreviewAutoTestNonce((n) => n + 1);
      setPreviewStatus(nextStatus);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `プレビュー自動テストに失敗しました: ${err.message}`
          : "プレビュー自動テストに失敗しました",
      );
    } finally {
      setPreviewReloading(false);
    }
  }

  const handlePreviewApply = usePreviewApply({
    challengeId: challenge.id,
    makeCurrentPatch,
    refreshPreviewAfterPatch,
    setPreviewApplyError,
    setPreviewApplyState,
    setPreviewReloading,
    setPreviewStatus,
    toast,
  });

  const handleSubmitPatch = usePatchVerification({
    challengeId: challenge.id,
    difficulty,
    scoreCap,
    makeCurrentPatch,
    refreshPreviewAfterPatch,
    handleRevealHint,
    setCompletedAt,
    setDefenseState,
    setLoadingStep,
    setPreviewStatus,
    setScore,
    setVerifyError,
    setVerifyResult,
    toast,
  });

  const showLivePreview = isEditorMode && difficulty.showSite;
  const liveViewMode = challenge.liveViewMode ?? "iframe";
  const selectedPatchTitle = isEditorMode
    ? hasEditedCode
      ? "編集済みコード"
      : undefined
    : selectedPatch?.title;

  return {
    model: {
      challenge,
      mode,
      availableModes,
      difficulty,
      scoreCap,
      attackState,
      codeReviewed,
      defenseState,
      selectedPatchId,
      editorCode,
      verifyResult,
      verifyError,
      loadingStep,
      score,
      previewReloadKey,
      previewReloading,
      previewAutoTestNonce,
      previewStatus,
      previewApplyState,
      previewApplyError,
      hintsRevealed,
      selectedPatch,
      hasAttacked,
      isEditorMode,
      hasEditedCode,
      hasSelectedPatch,
      canSelectPatch,
      canRetest,
      uiStatus,
      currentStep,
      completedSteps,
      visibleHints,
      retestDisabledReason,
      showLivePreview,
      liveViewMode,
      selectedPatchTitle,
    },
    actions: {
      handleModeChange,
      handleRunAttack,
      handleProceedToStep2,
      handleConfirmCodeReviewed,
      handleSelectPatch,
      handleEditorChange,
      handleTryAnotherPatch,
      handleBackToEditor,
      handleResetMission,
      handleRevealHint,
      handlePreviewApply,
      handleSubmitPatch,
    },
  };
}
