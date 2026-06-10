"use client";

import type { Dispatch, SetStateAction } from "react";
import { VERIFY_LOADING_STEPS } from "@/components/challenge-playground/constants";
import { wait } from "@/components/challenge-playground/previewHelpers";
import type { DefenseState } from "@/components/challenge-playground/types";
import { verifyPatch } from "@/lib/api/challenges";
import type { PreviewServerStatus, VerifyResult } from "@/lib/challengeTypes";
import type { DifficultySettings } from "@/lib/difficultyConfig";

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
};

type UsePatchVerificationArgs = {
  challengeId: string;
  difficulty: DifficultySettings;
  makeCurrentPatch: () => string | undefined;
  refreshPreviewAfterPatch: (
    nextStatus: PreviewServerStatus,
    delayMs?: number,
  ) => Promise<void>;
  handleRevealHint: () => void;
  setCompletedAt: Dispatch<SetStateAction<number | null>>;
  setDefenseState: Dispatch<SetStateAction<DefenseState>>;
  setLoadingStep: Dispatch<SetStateAction<string | null>>;
  setPreviewStatus: Dispatch<SetStateAction<PreviewServerStatus>>;
  setScore: Dispatch<SetStateAction<number>>;
  setVerifyError: Dispatch<SetStateAction<string | null>>;
  setVerifyResult: Dispatch<SetStateAction<VerifyResult | null>>;
  toast: ToastApi;
};

export function usePatchVerification({
  challengeId,
  difficulty,
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
}: UsePatchVerificationArgs) {
  return async function handleSubmitPatch() {
    const patchString = makeCurrentPatch();
    if (!patchString) return;
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
        verifyPatch(challengeId, patchString),
        wait(1200),
      ]);
      setVerifyResult(result);
      setDefenseState(result.passed ? "success" : "failure");
      setScore(Math.min(difficulty.scoreCap, result.passed ? 100 : 35));
      if (result.passed) {
        setCompletedAt(Date.now());
        toast.success("問題をクリアしました！");
        if (difficulty.showSite) {
          void refreshPreviewAfterPatch("verified", 800);
          window.setTimeout(() => setPreviewStatus("reset"), 15000);
        }
      } else {
        toast.error("防御失敗");
        if (difficulty.hints === "onDemand") handleRevealHint();
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
  };
}
