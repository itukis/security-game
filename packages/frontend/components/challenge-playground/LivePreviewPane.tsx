"use client";

import { LiveAppIframe } from "@/components/LiveAppIframe";
import { VulnerableAppPreview } from "@/components/VulnerableAppPreview";
import type { PlaygroundModel } from "@/components/challenge-playground/types";

export function LivePreviewPane({ model }: { model: PlaygroundModel }) {
  if (!model.showLivePreview) return null;

  return model.liveViewMode === "iframe" ? (
    <LiveAppIframe
      problemId={model.challenge.id}
      reloadKey={model.previewReloadKey}
      reloading={model.previewReloading}
      previewStatus={model.previewStatus}
    />
  ) : (
    <VulnerableAppPreview
      challenge={model.challenge}
      autoTestNonce={model.previewAutoTestNonce}
      previewStatus={model.previewStatus}
    />
  );
}
