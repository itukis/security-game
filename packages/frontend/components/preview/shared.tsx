import type { PreviewKind, PreviewServerStatus } from "@/lib/challengeTypes";

export type Tone = "neutral" | "danger" | "safe";

export const CONTAINER_DOWN_MESSAGE =
  "コンテナが起動していません。docker compose up を確認してください。";

// Each sub-preview talks to the real container via this proxy. The vulnerable
// apps don't set CORS headers, so browser→container calls would otherwise
// fail; the Next route under /api/preview/[problem]/[[...path]] does the
// localhost:300x hop server-side and adds Location sidecar headers for the
// open-redirect preview.
export function previewUrl(problemId: string, ...parts: string[]) {
  const encodedProblemId = encodeURIComponent(problemId);
  // Avoid trailing slash for the no-parts case — the proxy lives at
  // `[problem]/[[...path]]` (optional catch-all), and a trailing slash would
  // get redirected/404'd by Next's routing.
  if (parts.length === 0) {
    return `/api/preview/${encodedProblemId}`;
  }
  const encodedParts = parts.map((part) => encodeURIComponent(part)).join("/");
  return `/api/preview/${encodedProblemId}/${encodedParts}`;
}

export function isPreviewKind(value: unknown): value is PreviewKind {
  return (
    value === "login" ||
    value === "comments" ||
    value === "profile" ||
    value === "download" ||
    value === "ping" ||
    value === "transfer" ||
    value === "dashboard" ||
    value === "redirect" ||
    value === "upload" ||
    value === "supportPortal" ||
    value === "accountWorkflow" ||
    value === "fileWorkbench"
  );
}

export function ResultBanner({
  tone,
  message,
}: {
  tone: Tone;
  message: string;
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-300 bg-rose-50 text-rose-700"
      : tone === "safe"
        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
        : "border-zinc-300 bg-white text-zinc-700";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-3 rounded border px-3 py-2 text-sm font-bold ${toneClass}`}
    >
      {message}
    </div>
  );
}

export function PreviewStatusBadge({
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
