"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  CONTAINER_DOWN_MESSAGE,
  ResultBanner,
  previewUrl,
  type Tone,
} from "./shared";

export function RedirectPreview({
  problemId,
  onExploitDetected,
  autoTestNonce = 0,
}: {
  problemId: string;
  onExploitDetected?: () => void;
  autoTestNonce?: number;
}) {
  const fieldId = useId();
  const [target, setTarget] = useState("https://evil.example.com/phish");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    tone: Tone;
    message: string;
    detail?: string;
  } | null>(null);
  const triggeredRef = useRef(false);

  async function performRedirect(redirectTo: string) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(
        previewUrl(problemId, "login-success") +
          `?redirect=${encodeURIComponent(redirectTo)}`,
      );
      if (res.status === 502) {
        setResult({ tone: "neutral", message: CONTAINER_DOWN_MESSAGE });
        return { detected: false };
      }
      // The proxy rewrites upstream 3xx → 200 with x-upstream-* sidecar
      // headers so we can actually read the Location value from the browser.
      const upstreamStatus = parseInt(
        res.headers.get("x-upstream-status") || String(res.status),
        10,
      );
      const location = res.headers.get("x-upstream-location");

      if (upstreamStatus >= 300 && upstreamStatus < 400 && location) {
        const isExternal =
          /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(location) || location.startsWith("//");
        if (isExternal) {
          setResult({
            tone: "danger",
            message: "外部URLへのリダイレクトが成立しました — フィッシングに悪用できます",
            detail: `Location: ${location}`,
          });
          return { detected: true };
        }
        setResult({
          tone: "safe",
          message: "アプリ内の相対パスへのみリダイレクトされました",
          detail: `Location: ${location}`,
        });
        return { detected: false };
      }
      if (upstreamStatus === 400 || res.status === 400) {
        setResult({
          tone: "safe",
          message: "外部URL指定が 400 Bad Request で弾かれました",
        });
        return { detected: false };
      }
      setResult({
        tone: "neutral",
        message: `応答 HTTP ${upstreamStatus}`,
        detail: location ? `Location: ${location}` : undefined,
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!target.trim()) return;
    const out = await performRedirect(target.trim());
    if (out.detected && !triggeredRef.current) {
      triggeredRef.current = true;
      onExploitDetected?.();
    }
  }

  useEffect(() => {
    triggeredRef.current = false;
  }, [target]);

  useEffect(() => {
    if (autoTestNonce <= 0) return;
    queueMicrotask(() => {
      void performRedirect("https://evil.example.com/phish");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTestNonce]);

  return (
    <form
      onSubmit={handleSubmit}
      className="relative min-w-0 rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-zinc-950 text-sm font-black text-violet-200">
          →
        </div>
        <div>
          <p className="text-sm font-bold">Login Success Page</p>
          <p className="text-xs text-zinc-500">auth service / review needed</p>
        </div>
      </div>

      <label className="block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
        redirect <span className="text-rose-700">← 注入対象</span>
        <input
          className="mt-2 h-10 w-full rounded border border-zinc-300 bg-white px-3 font-mono text-sm text-zinc-800"
          value={target}
          onChange={(e) => {
            const v = e.target.value;
            const inputType = (e.nativeEvent as InputEvent).inputType;
            if (inputType !== "insertFromPaste" && v.includes("(Header:")) return;
            setTarget(v);
          }}
          placeholder="ここに飛ばしたいURLを入力"
          autoComplete="one-time-code"
          name={`field-${fieldId}-redirect`}
          spellCheck={false}
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="mt-3 h-11 w-full rounded bg-zinc-950 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "確認中..." : "GET /login-success?redirect=…"}
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
    </form>
  );
}
