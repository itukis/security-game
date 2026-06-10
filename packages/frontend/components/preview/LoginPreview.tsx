"use client";

import {
  useEffect,
  useId,
  useState,
  type FormEvent,
} from "react";
import {
  CONTAINER_DOWN_MESSAGE,
  ResultBanner,
  previewUrl,
  type Tone,
} from "./shared";

// USERNAME-field injection: `--` comments out the trailing
// `AND password = '...'` clause, so any value passes auth.
const SQLI_EXPLOIT_USERNAME = "' OR 1=1--";
const SQLI_EXPLOIT_PASSWORD = "anything";

export function LoginPreview({
  problemId,
  onExploitDetected,
  autoTestNonce = 0,
}: {
  problemId: string;
  onExploitDetected?: () => void;
  autoTestNonce?: number;
}) {
  const fieldId = useId();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    tone: Tone;
    message: string;
    detail?: string;
  } | null>(null);

  async function performLogin(creds: { username: string; password: string }) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(previewUrl(problemId, "login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 502) {
        setResult({ tone: "neutral", message: CONTAINER_DOWN_MESSAGE });
        return { detected: false };
      }

      if (data?.success === true) {
        setResult({
          tone: "danger",
          message: "ログイン成功 — 認証が突破されました",
          detail: data.user
            ? `返却された user: ${JSON.stringify(data.user)}`
            : undefined,
        });
        return { detected: true };
      }
      setResult({
        tone: "safe",
        message: "ログイン失敗 — 認証は正常です",
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
    const out = await performLogin({ username, password });
    if (out.detected) onExploitDetected?.();
  }

  // Auto-re-run the SQLi payload after a successful verify so the user
  // sees the login is now blocked. We replay the explicit values rather
  // than reading state, since the state update would race with the fetch.
  // The setState calls populate the form fields so the user sees what
  // was tested; deferred via queueMicrotask so we're not setting state
  // synchronously inside the effect body (React 19 lint rule).
  useEffect(() => {
    if (autoTestNonce <= 0) return;
    queueMicrotask(() => {
      setUsername(SQLI_EXPLOIT_USERNAME);
      setPassword(SQLI_EXPLOIT_PASSWORD);
      void performLogin({
        username: SQLI_EXPLOIT_USERNAME,
        password: SQLI_EXPLOIT_PASSWORD,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTestNonce]);

  return (
    <form
      onSubmit={handleSubmit}
      className="relative min-w-0 rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-zinc-950 text-sm font-black text-cyan-200">
          AI
        </div>
        <div>
          <p className="text-sm font-bold">Generated Login</p>
          <p className="text-xs text-zinc-500">beta build / review needed</p>
        </div>
      </div>

      <label className="block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
        Username / Email <span className="text-rose-700">← 注入対象</span>
        <input
          className="mt-2 h-11 w-full rounded border border-zinc-300 bg-white px-3 font-mono text-sm text-zinc-800"
          value={username}
          onChange={(e) => {
            const v = e.target.value;
            const inputType = (e.nativeEvent as InputEvent).inputType;
            if (inputType !== "insertFromPaste" && v.includes("(Header:")) return;
            setUsername(v);
          }}
          placeholder="ここにペイロードを入力してみよう"
          autoComplete="one-time-code"
          name={`field-${fieldId}-username`}
          spellCheck={false}
        />
      </label>

      <label className="mt-3 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
        Password
        <input
          className="mt-2 h-11 w-full rounded border border-zinc-300 bg-white px-3 font-mono text-sm text-zinc-800"
          type="text"
          value={password}
          onChange={(e) => {
            const v = e.target.value;
            const inputType = (e.nativeEvent as InputEvent).inputType;
            if (inputType !== "insertFromPaste" && v.includes("(Header:")) return;
            setPassword(v);
          }}
          placeholder="任意の値で OK"
          autoComplete="one-time-code"
          name={`field-${fieldId}-password`}
          spellCheck={false}
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 h-11 w-full rounded bg-zinc-950 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "送信中..." : "Sign in"}
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
