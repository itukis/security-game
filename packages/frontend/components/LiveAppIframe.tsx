"use client";

import { useState } from "react";
import type { ProblemId } from "@/lib/problemContent";

// Note: a component named `VulnerableAppPreview` already exists for the
// Step 1 mock UI. This component is the live <iframe> preview used in the
// editor difficulty modes (Phase 5 of the editor rollout).

const PORT_BY_PROBLEM: Record<string, number> = {
  "sqli-login": 3001,
  "xss-comments": 3002,
  "idor-profile": 3003,
};

const PATH_BY_PROBLEM: Record<string, string> = {
  // Each vulnerable app exposes a different "viewable" path. sqli-login has
  // no GET root, so we point at /health to at least render something; the
  // app primarily takes POSTs.
  "sqli-login": "/health",
  "xss-comments": "/comments",
  "idor-profile": "/profile/user-1",
};

interface LiveAppIframeProps {
  problemId: string;
  reloadKey: number;
  reloading?: boolean;
  reloadingMessage?: string;
  height?: number;
}

export function LiveAppIframe({
  problemId,
  reloadKey,
  reloading = false,
  reloadingMessage = "サイトを再読み込み中...",
  height = 360,
}: LiveAppIframeProps) {
  const [loaded, setLoaded] = useState(false);
  const port = PORT_BY_PROBLEM[problemId];
  const path = PATH_BY_PROBLEM[problemId] ?? "/";

  if (!port) {
    return (
      <div className="rounded border border-zinc-700 bg-zinc-950 p-4 text-sm text-zinc-400">
        この問題のライブプレビューURLは未設定です ({problemId})
      </div>
    );
  }

  const url = `http://localhost:${port}${path}`;

  return (
    <section className="rounded-lg border border-cyan-300/20 bg-zinc-950 p-3 shadow-xl shadow-black/30 sm:p-4">
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
        <iframe
          key={reloadKey}
          src={url}
          title={`live-${problemId}`}
          sandbox="allow-forms allow-scripts allow-same-origin"
          onLoad={() => setLoaded(true)}
          style={{
            width: "100%",
            height: "100%",
            border: "0",
          }}
        />
      </div>

      <p className="mt-3 text-xs leading-5 text-zinc-500">
        パッチ適用後、コンテナ再起動を待ってから再読み込みされます (約12秒)。
      </p>
    </section>
  );
}

export const liveAppPorts = PORT_BY_PROBLEM;
export type LiveAppProblemId = ProblemId;
