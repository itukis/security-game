"use client";

import type { Dispatch, SetStateAction } from "react";
import type { PreviewApplyState } from "@/components/challenge-playground/types";
import { previewApplyPatch } from "@/lib/api/challenges";
import type { PreviewServerStatus } from "@/lib/challengeTypes";

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
};

type UsePreviewApplyArgs = {
  challengeId: string;
  makeCurrentPatch: () => string | undefined;
  refreshPreviewAfterPatch: (
    nextStatus: PreviewServerStatus,
    delayMs?: number,
  ) => Promise<void>;
  setPreviewApplyError: Dispatch<SetStateAction<string | null>>;
  setPreviewApplyState: Dispatch<SetStateAction<PreviewApplyState>>;
  setPreviewReloading: Dispatch<SetStateAction<boolean>>;
  setPreviewStatus: Dispatch<SetStateAction<PreviewServerStatus>>;
  toast: ToastApi;
};

export function usePreviewApply({
  challengeId,
  makeCurrentPatch,
  refreshPreviewAfterPatch,
  setPreviewApplyError,
  setPreviewApplyState,
  setPreviewReloading,
  setPreviewStatus,
  toast,
}: UsePreviewApplyArgs) {
  return async function handlePreviewApply() {
    const patchString = makeCurrentPatch();
    if (!patchString) return;
    setPreviewApplyState("applying");
    setPreviewApplyError(null);
    setPreviewReloading(true);

    try {
      await previewApplyPatch(challengeId, patchString);
      setPreviewApplyState("applied");
      await refreshPreviewAfterPatch("applied");
      toast.success("プレビューに反映しました");
    } catch (error) {
      setPreviewApplyState("error");
      setPreviewStatus("baseline");
      setPreviewApplyError(
        error instanceof Error ? error.message : "パッチ適用失敗",
      );
      setPreviewReloading(false);
      toast.error("パッチ適用失敗");
    }
  };
}
