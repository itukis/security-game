"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { Challenge, PreviewServerStatus } from "@/lib/challengeTypes";

type Tone = "neutral" | "danger" | "safe";
type PreviewKind = "login" | "comments" | "profile" | "download" | "ping";

const SQLI_PAYLOAD = "' OR 1=1--";

interface VulnerableAppPreviewProps {
  challenge: Challenge;
  onExploitDetected?: () => void;
  // Bumping this nonce triggers the interactive sub-previews to auto-re-run
  // the exploit against the live container.
  autoTestNonce?: number;
  previewStatus?: PreviewServerStatus;
}

// Each preview talks to the real container via /api/preview/<problem>/<path>,
// which proxies to localhost:300x server-side (vulnerable apps don't set
// CORS headers, so direct browser → container calls would fail).
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
          <DownloadPreview onExploitDetected={onExploitDetected} />
        ) : null}

        {kind === "ping" ? (
          <PingPreview onExploitDetected={onExploitDetected} />
        ) : null}
    </div>
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

function isPreviewKind(value: unknown): value is PreviewKind {
  return (
    value === "login" ||
    value === "comments" ||
    value === "profile" ||
    value === "download" ||
    value === "ping"
  );
}

function ResultBanner({ tone, message }: { tone: Tone; message: string }) {
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

function previewUrl(problemId: string, ...parts: string[]) {
  const encodedProblemId = encodeURIComponent(problemId);
  const encodedParts = parts.map((part) => encodeURIComponent(part)).join("/");
  return `/api/preview/${encodedProblemId}/${encodedParts}`;
}

const CONTAINER_DOWN_MESSAGE =
  "コンテナが起動していません。docker compose up を確認してください。";

// USERNAME-field injection: `--` comments out the trailing
// `AND password = '...'` clause, so any value passes auth.
const SQLI_EXPLOIT_USERNAME = SQLI_PAYLOAD;
const SQLI_EXPLOIT_PASSWORD = "anything";
function LoginPreview({
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

const XSS_EXPLOIT_TEXT = "<script>alert('xss')</script>";

function CommentsPreview({
  problemId,
  onExploitDetected,
  autoTestNonce = 0,
}: {
  problemId: string;
  onExploitDetected?: () => void;
  autoTestNonce?: number;
}) {
  const fieldId = useId();
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
      tone: Tone;
    message: string;
    detail?: string;
  } | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const containsScript = useCallback((s: string) => /<script\b/i.test(s), []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(previewUrl(problemId, "comments"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, text }),
      });

      if (res.status === 502) {
        setResult({ tone: "neutral", message: CONTAINER_DOWN_MESSAGE });
        return;
      }

      if (res.ok) {
        if (containsScript(text)) {
          setResult({
            tone: "danger",
            message:
              "投稿成功 — <script> がそのままHTMLへ流し込まれます",
          });
          onExploitDetected?.();
        } else {
          setResult({
            tone: "neutral",
            message: "投稿成功 — 下のプレビューで描画結果を確認してください",
          });
        }

        // Refresh the iframe so the GET /comments view shows the new entry.
        setIframeKey((k) => k + 1);
      } else {
        setResult({
          tone: "neutral",
          message: `投稿失敗 (HTTP ${res.status})`,
        });
      }
    } catch (err) {
      setResult({
        tone: "neutral",
        message: CONTAINER_DOWN_MESSAGE,
        detail: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoTestNonce <= 0) return;
    queueMicrotask(() => {
      setAuthor("attacker");
      setText(XSS_EXPLOIT_TEXT);
      setLoading(true);
      void fetch(previewUrl(problemId, "comments"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: "attacker", text: XSS_EXPLOIT_TEXT }),
      })
        .then((res) => {
          if (res.status === 502) {
            throw new Error(CONTAINER_DOWN_MESSAGE);
          }
          if (!res.ok) {
            throw new Error(`投稿失敗 (HTTP ${res.status})`);
          }
          setResult({
            tone: "safe",
            message: "攻撃文字列はHTMLエスケープされた状態で表示されます",
          });
          setIframeKey((k) => k + 1);
        })
        .catch((err) => {
          setResult({
            tone: "neutral",
            message: CONTAINER_DOWN_MESSAGE,
            detail: err instanceof Error ? err.message : undefined,
          });
        })
        .finally(() => setLoading(false));
    });
  }, [autoTestNonce, problemId]);

  return (
    <div className="relative min-w-0 rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-zinc-950 text-sm font-black text-amber-200">
          CB
        </div>
        <div>
          <p className="text-sm font-bold">Comment Board</p>
          <p className="text-xs text-zinc-500">mvp build / review needed</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
          author
          <input
            className="mt-2 h-10 w-full rounded border border-zinc-300 bg-white px-3 font-mono text-sm text-zinc-800"
            value={author}
            onChange={(e) => {
              const v = e.target.value;
              const inputType = (e.nativeEvent as InputEvent).inputType;
              if (inputType !== "insertFromPaste" && v.includes("(Header:")) return;
              setAuthor(v);
            }}
            placeholder="表示名"
            autoComplete="one-time-code"
            name={`field-${fieldId}-author`}
            spellCheck={false}
          />
        </label>
        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
          text <span className="text-rose-700">← 注入対象</span>
          <textarea
            className="mt-2 h-24 w-full resize-none rounded border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-800"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="HTMLタグを入力してみよう (例: <script>alert('xss')</script>)"
            spellCheck={false}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded bg-zinc-950 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "投稿中..." : "投稿する"}
        </button>
      </form>

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

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-600">
          GET /comments
        </p>
        <p className="mt-1 text-[11px] text-zinc-500">
          サーバーが返す生のHTMLを iframe で描画 (script は実行されます)
        </p>
        <iframe
          key={iframeKey}
          src={previewUrl(problemId, "comments")}
          title="comments-preview"
          sandbox="allow-scripts"
          className="mt-2 h-56 w-full rounded border border-zinc-300 bg-white"
        />
      </div>
    </div>
  );
}

function DownloadPreview({
  onExploitDetected,
}: {
  onExploitDetected?: () => void;
}) {
  const fieldId = useId();
  const [filename, setFilename] = useState("");
  const [result, setResult] = useState<{
    tone: Tone;
    message: string;
    detail?: string;
  } | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const isTraversal = filename.includes("../");
    if (isTraversal) {
      setResult({
        tone: "danger",
        message: "非公開ファイルにアクセスできました",
        detail: "FLAG{demo_path_traversal}",
      });
      onExploitDetected?.();
      return;
    }

    setResult({
      tone: "neutral",
      message: filename.trim()
        ? "公開ファイルを取得しました"
        : "ファイル名を入力してください",
      detail: filename.trim() ? "public/readme.txt のような通常ファイルです。" : undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative min-w-0 rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-zinc-950 text-sm font-black text-emerald-200">
          DL
        </div>
        <div>
          <p className="text-sm font-bold">File Downloader</p>
          <p className="text-xs text-zinc-500">internal build / review needed</p>
        </div>
      </div>

      <div className="grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-2 rounded border border-zinc-300 bg-white px-3 py-2">
          <span className="text-zinc-500">public/</span>
          <span className="font-semibold">readme.txt</span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded border border-zinc-300 bg-white px-3 py-2">
          <span className="text-zinc-500">public/</span>
          <span className="font-semibold">terms.txt</span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded border border-rose-300 bg-rose-50 px-3 py-2">
          <span className="text-rose-500">secret/</span>
          <span className="font-semibold text-rose-700">flag.txt</span>
          <span className="rounded border border-rose-300 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-600">
            非公開
          </span>
        </div>
      </div>

      <label className="mt-4 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
        ファイル名
        <input
          className="mt-2 h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm font-mono text-zinc-800"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder="ここにペイロードを入力してみよう"
          autoComplete="one-time-code"
          name={`field-${fieldId}-filename`}
          spellCheck={false}
        />
      </label>

      <button
        type="submit"
        className="mt-3 h-11 w-full rounded bg-zinc-950 text-sm font-bold text-white transition hover:bg-zinc-800"
      >
        GET /download
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

function PingPreview({
  onExploitDetected,
}: {
  onExploitDetected?: () => void;
}) {
  const fieldId = useId();
  const [host, setHost] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const hasCommandSeparator = /[;&|`$()]/.test(host);
    if (hasCommandSeparator) {
      onExploitDetected?.();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative min-w-0 rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-zinc-950 text-sm font-black text-violet-200">
          NET
        </div>
        <div>
          <p className="text-sm font-bold">Network Diagnostics</p>
          <p className="text-xs text-zinc-500">beta build / review needed</p>
        </div>
      </div>

      <div className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-600">
        <span className="text-zinc-400">POST</span>{" "}
        <span className="font-semibold text-zinc-800">/ping</span>
      </div>

      <label className="mt-4 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
        ホスト
        <input
          className="mt-2 h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm font-mono text-zinc-800"
          value={host}
          onChange={(e) => {
            const v = e.target.value;
            const inputType = (e.nativeEvent as InputEvent).inputType;
            if (inputType !== "insertFromPaste" && v.includes("(Header:")) return;
            setHost(v);
          }}
          placeholder="ここにペイロードを入力してみよう"
          autoComplete="one-time-code"
          name={`field-${fieldId}-host`}
          spellCheck={false}
        />
      </label>

      <button
        type="submit"
        className="mt-3 h-11 w-full rounded bg-zinc-950 text-sm font-bold text-white transition hover:bg-zinc-800"
      >
        POST /ping
      </button>

      <div className="mt-3 rounded border border-zinc-200 bg-black px-3 py-2 font-mono text-xs text-zinc-300">
        {host ? (
          <>
            <p className="text-zinc-500">$ ping -c 1 {host}</p>
            <p className="mt-1 text-emerald-400">
              PING {host.split(/[;&|`$()]/)[0].trim() || host} ... 1 packets
              transmitted
            </p>
            {/[;&|`$()]/.test(host) ? (
              <p className="mt-1 text-rose-400">
                root:x:0:0:root:/root:/bin/bash ...
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-zinc-500">$ ping -c 1 {"<host>"}</p>
        )}
        </div>
      </form>
  );
}

function ProfilePreview({
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
