"use client";

import { useState } from "react";
import type { PreviewServerStatus } from "@/lib/challengeTypes";
import type { ProblemId } from "@/lib/problemContent";

// Note: a component named `VulnerableAppPreview` already exists for the
// Step 1 mock UI. This component is the live <iframe> preview used in the
// editor difficulty modes (Phase 5 of the editor rollout).

const PATH_BY_PROBLEM: Record<string, string> = {
  // Each vulnerable app exposes a different "viewable" path. sqli-login has
  // no GET root, so we point at /health to at least render something; the
  // app primarily takes POSTs.
  "sqli-login": "/health",
  "xss-comments": "/comments",
  "idor-profile": "/profile/user-1",
  "path-traversal-files": "/download?name=readme.txt",
  "cmd-injection-ping": "/health",
  "csrf-transfer": "/balance",
  "hardcoded-secrets": "/",
  "open-redirect": "/dashboard",
  "file-upload": "/uploads",
  "review-support-portal": "/tickets/ticket-1",
  "review-account-workflow": "/",
  "review-file-workbench": "/uploads",
};

interface LiveAppIframeProps {
  problemId: string;
  reloadKey: number;
  reloading?: boolean;
  reloadingMessage?: string;
  height?: number;
  previewStatus?: PreviewServerStatus;
}

export function LiveAppIframe({
  problemId,
  reloadKey,
  reloading = false,
  reloadingMessage = "サイトを再読み込み中...",
  height = 360,
  previewStatus = "baseline",
}: LiveAppIframeProps) {
  const [loaded, setLoaded] = useState(false);
  const path = PATH_BY_PROBLEM[problemId];

  if (!path) {
    return (
      <div className="rounded border border-zinc-700 bg-zinc-950 p-4 text-sm text-zinc-400">
        この問題のライブプレビューURLは未設定です ({problemId})
      </div>
    );
  }

  // Always use the same-origin Next.js proxy. A browser-side localhost URL
  // points at the learner's own machine after deployment, not at the VPS.
  const url = `/api/preview/${encodeURIComponent(problemId)}${path}`;

  return (
    <section className="relative min-w-0 rounded-lg border border-cyan-300/20 bg-zinc-950 p-3 shadow-xl shadow-black/30 sm:p-4">
      <PreviewStatusBadge status={previewStatus} />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
            Live App
          </p>
          <h3 className="mt-1 text-base font-bold text-white">
            脆弱アプリのライブプレビュー
          </h3>
          <p className="mt-1 font-mono text-xs text-zinc-500">{url}</p>
        </div>
        <span
          className={`rounded border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
            reloading
              ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
              : "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
          }`}
        >
          {reloading ? "再読み込み中" : "Live"}
        </span>
      </div>

      <div
        className="relative overflow-hidden rounded border border-zinc-800 bg-white"
        style={{ height }}
      >
        {(!loaded || reloading) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/90 text-sm text-zinc-300">
            {reloading ? reloadingMessage : "読み込み中..."}
          </div>
        )}
        {/* Deliberately vulnerable HTML must not share the frontend's origin.
            Scripts still run for the XSS lesson, but cannot read the parent
            page or its Supabase session from localStorage. */}
        <iframe
          key={reloadKey}
          src={url}
          title={`live-${problemId}`}
          sandbox="allow-forms allow-scripts"
          onLoad={() => setLoaded(true)}
          style={{
            width: "100%",
            height: "100%",
            border: "0",
          }}
        />
      </div>

      <p className="mt-3 text-xs leading-5 text-zinc-500">
        修正検証後はコンテナがパッチ適用状態になり、約15秒後に元の脆弱状態へ自動リセットされます。
      </p>
    </section>
  );
}

function PreviewStatusBadge({
  status,
}: {
  status: PreviewServerStatus;
}) {
  const copy = PREVIEW_STATUS_COPY[status];
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-xs font-bold ${copy.className}`}
    >
      <span>{copy.label}</span>
      {copy.badge ? (
        <span className="rounded border border-current/30 bg-black/20 px-2 py-1">
          {copy.badge}
        </span>
      ) : null}
    </div>
  );
}

const PREVIEW_STATUS_COPY: Record<
  PreviewServerStatus,
  { label: string; badge?: string; className: string }
> = {
  baseline: {
    label: "現在のサーバー状態（未修正）",
    className: "border-zinc-700 bg-zinc-900 text-zinc-300",
  },
  applied: {
    label: "修正後のサーバー状態",
    badge: "✅ 反映完了",
    className: "border-emerald-300/50 bg-emerald-300/10 text-emerald-100",
  },
  verified: {
    label: "✅ 防御成功 — 攻撃が無効化されました",
    badge: "✅ 修正が反映されました — 攻撃が防御されています",
    className: "border-emerald-300/50 bg-emerald-300/10 text-emerald-100",
  },
  reset: {
    label: "サーバーがリセットされました（再挑戦できます）",
    className: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  },
};

export const liveAppProblemPaths = PATH_BY_PROBLEM;
export type LiveAppProblemId = ProblemId;
