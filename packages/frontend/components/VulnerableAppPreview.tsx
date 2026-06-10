"use client";

import { CommentsPreview } from "@/components/preview/CommentsPreview";
import { DashboardPreview } from "@/components/preview/DashboardPreview";
import { DownloadPreview } from "@/components/preview/DownloadPreview";
import { LoginPreview } from "@/components/preview/LoginPreview";
import { PingPreview } from "@/components/preview/PingPreview";
import { ProfilePreview } from "@/components/preview/ProfilePreview";
import { RedirectPreview } from "@/components/preview/RedirectPreview";
import { TransferPreview } from "@/components/preview/TransferPreview";
import { UploadPreview } from "@/components/preview/UploadPreview";
import {
  isPreviewKind,
  PreviewStatusBadge,
} from "@/components/preview/shared";
import type {
  Challenge,
  PreviewServerStatus,
} from "@/lib/challengeTypes";

interface VulnerableAppPreviewProps {
  challenge: Challenge;
  onExploitDetected?: () => void;
  // Bumping this nonce triggers the interactive sub-previews to auto-re-run
  // the exploit against the live container.
  autoTestNonce?: number;
  previewStatus?: PreviewServerStatus;
}

export function VulnerableAppPreview({
  challenge,
  onExploitDetected,
  autoTestNonce = 0,
  previewStatus = "baseline",
}: VulnerableAppPreviewProps) {
  const kind = isPreviewKind(challenge.previewKind)
    ? challenge.previewKind
    : "login";

  return (
    <div className="relative min-w-0 rounded-lg border border-cyan-300/20 bg-zinc-950 p-4">
      <PreviewStatusBadge status={previewStatus} />
      <div className="mb-4 flex min-w-0 items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Live Preview
          </p>
          <h3 className="mt-1 break-words text-lg font-bold text-white">
            {challenge.vulnerableAppTitle}
          </h3>
          <p className="mt-1 break-all font-mono text-xs text-zinc-500">
            {challenge.targetEndpoint}
          </p>
        </div>
        <span className="h-3 w-3 flex-shrink-0 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.85)]" />
      </div>

      {kind === "login" ? (
        <LoginPreview
          problemId={challenge.id}
          onExploitDetected={onExploitDetected}
          autoTestNonce={autoTestNonce}
        />
      ) : null}

      {kind === "comments" ? (
        <CommentsPreview
          problemId={challenge.id}
          onExploitDetected={onExploitDetected}
          autoTestNonce={autoTestNonce}
        />
      ) : null}

      {kind === "profile" ? (
        <ProfilePreview
          problemId={challenge.id}
          onExploitDetected={onExploitDetected}
          autoTestNonce={autoTestNonce}
        />
      ) : null}

      {kind === "download" ? (
        <DownloadPreview
          onExploitDetected={onExploitDetected}
          previewStatus={previewStatus}
        />
      ) : null}

      {kind === "ping" ? (
        <PingPreview onExploitDetected={onExploitDetected} />
      ) : null}

      {kind === "transfer" ? (
        <TransferPreview
          problemId={challenge.id}
          onExploitDetected={onExploitDetected}
          autoTestNonce={autoTestNonce}
        />
      ) : null}

      {kind === "dashboard" ? (
        <DashboardPreview
          problemId={challenge.id}
          onExploitDetected={onExploitDetected}
          autoTestNonce={autoTestNonce}
        />
      ) : null}

      {kind === "redirect" ? (
        <RedirectPreview
          problemId={challenge.id}
          onExploitDetected={onExploitDetected}
          autoTestNonce={autoTestNonce}
        />
      ) : null}

      {kind === "upload" ? (
        <UploadPreview
          problemId={challenge.id}
          onExploitDetected={onExploitDetected}
          autoTestNonce={autoTestNonce}
        />
      ) : null}
    </div>
  );
}
