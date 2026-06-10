"use client";

import { useEffect, useRef, useState } from "react";
import {
  CONTAINER_DOWN_MESSAGE,
  ResultBanner,
  previewUrl,
  type Tone,
} from "./shared";

const SECRET_MARKER_RE = /(sk-[A-Za-z0-9-]+|API_KEY\s*=\s*['"][^'"]+['"])/;

export function DashboardPreview({
  problemId,
  onExploitDetected,
  autoTestNonce = 0,
}: {
  problemId: string;
  onExploitDetected?: () => void;
  autoTestNonce?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [result, setResult] = useState<{
    tone: Tone;
    message: string;
    detail?: string;
  } | null>(null);
  const triggeredRef = useRef(false);

  async function fetchSource() {
    setLoading(true);
    setResult(null);
    setHtml(null);
    try {
      const res = await fetch(previewUrl(problemId));
      if (res.status === 502) {
        setResult({ tone: "neutral", message: CONTAINER_DOWN_MESSAGE });
        return { detected: false };
      }
      const body = await res.text();
      setHtml(body);

      const match = body.match(SECRET_MARKER_RE);
      if (match) {
        setResult({
          tone: "danger",
          message: "HTMLソースにAPIキーが埋め込まれています — DevToolsで誰でも読めます",
          detail: `露出している文字列: ${match[0]}`,
        });
        return { detected: true };
      }
      setResult({
        tone: "safe",
        message: "HTMLソースから API_KEY らしき文字列は見当たりません",
      });
      return { detected: false };
    } catch (err) {
      setResult({
        tone: "neutral",
        message: CONTAINER_DOWN_MESSAGE,
        detail: err instanceof Error ? err.message : undefined,
      });
      return { detected: false };
    } finally {
      setLoading(false);
    }
  }

  async function handleClick() {
    const out = await fetchSource();
    if (out.detected && !triggeredRef.current) {
      triggeredRef.current = true;
      onExploitDetected?.();
    }
  }

  useEffect(() => {
    if (autoTestNonce <= 0) return;
    queueMicrotask(() => {
      void fetchSource();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTestNonce]);

  return (
    <div className="relative min-w-0 rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-zinc-950 text-sm font-black text-amber-200">
          K
        </div>
        <div>
          <p className="text-sm font-bold">Admin Dashboard</p>
          <p className="text-xs text-zinc-500">mvp build / review needed</p>
        </div>
      </div>

      <p className="text-xs text-zinc-600">
        GET / を叩いて、返ってきた HTML ソースの中に管理者APIキーが含まれていないかを確認します。
      </p>

      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="mt-3 h-11 w-full rounded bg-zinc-950 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "取得中..." : "View Source (GET /)"}
      </button>

      {result ? (
        <>
          <ResultBanner tone={result.tone} message={result.message} />
          {result.detail ? (
            <p className="mt-2 break-all font-mono text-xs text-zinc-600">
              {result.detail}
            </p>
          ) : null}
        </>
      ) : null}

      {html ? (
        <pre className="mt-3 max-h-56 overflow-auto rounded border border-zinc-300 bg-white p-3 font-mono text-[11px] leading-5 text-zinc-800">
          {html}
        </pre>
      ) : null}
    </div>
  );
}
