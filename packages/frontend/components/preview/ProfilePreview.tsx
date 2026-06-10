"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  CONTAINER_DOWN_MESSAGE,
  ResultBanner,
  previewUrl,
  type Tone,
} from "./shared";

export function ProfilePreview({
  problemId,
  onExploitDetected,
  autoTestNonce = 0,
}: {
  problemId: string;
  onExploitDetected?: () => void;
  autoTestNonce?: number;
}) {
  const fieldId = useId();
  const [targetId, setTargetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    tone: Tone;
    message: string;
    body?: string;
  } | null>(null);
  const triggeredRef = useRef(false);

  // The "logged-in" user is fixed in this demo. The vulnerability is that
  // the server doesn't check this against the URL :id.
  const ACTING_USER = "user-1";

  async function performFetch(probeId: string) {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(previewUrl(problemId, "profile", probeId), {
        method: "GET",
        headers: { "X-User-Id": ACTING_USER },
      });

      const text = await res.text();

      if (res.status === 502) {
        setResult({ tone: "neutral", message: CONTAINER_DOWN_MESSAGE });
        return { detected: false };
      }

      let body: unknown = text;

      try {
        body = JSON.parse(text);
      } catch {
        // keep as text
      }

      const prettyBody =
        typeof body === "string" ? body : JSON.stringify(body, null, 2);

      if (res.status === 403) {
        setResult({
          tone: "safe",
          message: "アクセスが拒否されました (403 Forbidden)",
          body: prettyBody,
        });
        return { detected: false };
      }

      const hasSecret =
        typeof body === "object" &&
        body !== null &&
        "secret" in (body as Record<string, unknown>);
      const isOtherUser = probeId !== ACTING_USER;

      if (res.ok && hasSecret && isOtherUser) {
        setResult({
          tone: "danger",
          message: "他のユーザーの機密情報にアクセスできました",
          body: prettyBody,
        });
        return { detected: true };
      }

      setResult({
        tone: "neutral",
        message: res.ok
          ? "自分のプロフィールが返されました (正常な動作)"
          : `応答 HTTP ${res.status}`,
        body: prettyBody,
      });
      return { detected: false };
    } catch (err) {
      setResult({
        tone: "neutral",
        message: CONTAINER_DOWN_MESSAGE,
        body: err instanceof Error ? err.message : undefined,
      });
      return { detected: false };
    } finally {
      setLoading(false);
    }
  }

  async function handleFetch() {
    if (!targetId.trim()) {
      setResult({
        tone: "neutral",
        message: "ユーザーIDを入力してください",
      });
      return;
    }
    const out = await performFetch(targetId);
    if (out.detected && !triggeredRef.current) {
      triggeredRef.current = true;
      onExploitDetected?.();
    }
  }

  useEffect(() => {
    triggeredRef.current = false;
  }, [targetId]);

  // After a successful verify, replay the cross-user fetch so the user
  // sees the 403 returned by their fix. Deferred to keep setState out of
  // the effect body (React 19 lint rule).
  useEffect(() => {
    if (autoTestNonce <= 0) return;
    queueMicrotask(() => {
      setTargetId("user-2");
      void performFetch("user-2");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTestNonce]);

  return (
    <div className="relative min-w-0 rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-zinc-950 text-sm font-black text-cyan-200">
            U1
          </div>
          <div>
            <p className="text-sm font-bold">Profile API</p>
            <p className="text-xs text-zinc-500">
              ログイン中: {ACTING_USER} (X-User-Id ヘッダで送信)
            </p>
          </div>
        </div>
        <span className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-rose-700">
          IDOR
        </span>
      </div>

      <label className="block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
        Target user ID <span className="text-rose-700">← URL の :id</span>
        <input
          className="mt-2 h-10 w-full rounded border border-zinc-300 bg-white px-3 font-mono text-sm text-zinc-800"
          value={targetId}
          onChange={(e) => {
            const v = e.target.value;
            const inputType = (e.nativeEvent as InputEvent).inputType;
            if (inputType !== "insertFromPaste" && v.includes("(Header:")) return;
            setTargetId(v);
          }}
          placeholder="ここにユーザーIDを入力してみよう"
          autoComplete="one-time-code"
          name={`field-${fieldId}-target`}
          spellCheck={false}
        />
      </label>

      <button
        type="button"
        onClick={handleFetch}
        disabled={loading || !targetId.trim()}
        className="mt-3 h-11 w-full rounded bg-zinc-950 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "取得中..." : "プロフィール取得"}
      </button>

      {result ? (
        <>
          <ResultBanner tone={result.tone} message={result.message} />
          {result.body ? (
            <pre className="mt-2 max-h-44 overflow-auto rounded border border-zinc-300 bg-white p-3 font-mono text-xs leading-5 text-zinc-800">
              {result.body}
            </pre>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
