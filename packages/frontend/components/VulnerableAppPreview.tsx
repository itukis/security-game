"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { Challenge } from "@/lib/challengeTypes";

type Tone = "neutral" | "danger" | "safe";
type PreviewKind = "login" | "comments" | "profile" | "download" | "ping";

interface VulnerableAppPreviewProps {
  challenge: Challenge;
  onExploitDetected?: () => void;
}

// Each preview talks to the real container via /api/preview/<problem>/<path>,
// which proxies to localhost:300x server-side (vulnerable apps don't set
// CORS headers, so direct browser → container calls would fail).
export function VulnerableAppPreview({
  challenge,
  onExploitDetected,
}: VulnerableAppPreviewProps) {
  const kind = isPreviewKind(challenge.previewKind)
    ? challenge.previewKind
    : "login";

  // Field-targeted reference payload. Per problem we tell the user WHICH
  // input the payload goes into — the static "参考ペイロード" block alone
  // was leading users to paste into the wrong field (e.g. password instead
  // of username for SQLi).
  const referencePayload = REFERENCE_PAYLOAD_BY_KIND[kind];

  return (
    <div className="rounded-lg border border-cyan-300/20 bg-zinc-950 p-4">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Live Preview
          </p>
          <h3 className="mt-1 text-lg font-bold text-white">
            {challenge.vulnerableAppTitle}
          </h3>
          <p className="mt-1 font-mono text-xs text-zinc-500">
            {challenge.targetEndpoint}
          </p>
        </div>
        <span className="h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.85)]" />
      </div>

      {kind === "login" ? (
        <LoginPreview
          problemId={challenge.id}
          onExploitDetected={onExploitDetected}
        />
      ) : null}

      {kind === "comments" ? (
        <CommentsPreview
          problemId={challenge.id}
          onExploitDetected={onExploitDetected}
        />
      ) : null}

      {kind === "profile" ? (
        <ProfilePreview
          problemId={challenge.id}
          onExploitDetected={onExploitDetected}
        />
      ) : null}

      {kind === "download" ? <DownloadPreview /> : null}

      {kind === "ping" ? <PingPreview /> : null}

      <div className="mt-4 rounded border border-rose-300/20 bg-rose-300/10 p-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-100">
          {referencePayload.label}
        </p>
        <p className="mt-2 break-all font-mono text-sm text-rose-100">
          {referencePayload.value}
        </p>
      </div>
    </div>
  );
}

function isPreviewKind(value: unknown): value is PreviewKind {
  return (
    value === "login" ||
    value === "comments" ||
    value === "profile" ||
    value === "download" ||
    value === "ping"
  );
}

const REFERENCE_PAYLOAD_BY_KIND: Record<
  PreviewKind,
  { label: string; value: string }
> = {
  login: {
    label: "参考ペイロード（USERNAME 欄に入力）",
    value: "' OR '1'='1' --",
  },
  comments: {
    label: "参考ペイロード（text 欄に入力）",
    value: "<script>alert('xss')</script>",
  },
  profile: {
    label: "参考の試し方（Target user ID 欄を書き換え）",
    value: "user-2 などの他人 ID を入れる",
  },
  download: {
    label: "参考ペイロード（ファイル名に指定）",
    value: "../../secret/flag.txt",
  },
  ping: {
    label: "参考ペイロード（ホスト欄に入力）",
    value: "127.0.0.1; cat /etc/passwd",
  },
};

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
  return `/api/preview/${problemId}/${parts.join("/")}`;
}

const CONTAINER_DOWN_MESSAGE =
  "コンテナが起動していません。docker compose up を確認してください。";

const SQLI_NORMAL_USERNAME = "rookie@example.test";
const SQLI_NORMAL_PASSWORD = "password123";
// USERNAME-field injection: the `--` comments out the trailing
// `AND password = '...'` clause, so any value passes auth.
const SQLI_EXPLOIT_USERNAME = "' OR '1'='1' --";
const SQLI_EXPLOIT_PASSWORD = "anything";

function LoginPreview({
  problemId,
  onExploitDetected,
}: {
  problemId: string;
  onExploitDetected?: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [exploited, setExploited] = useState(false);
  const [result, setResult] = useState<{
    tone: Tone;
    message: string;
    detail?: string;
  } | null>(null);

  function fillNormal() {
    setUsername(SQLI_NORMAL_USERNAME);
    setPassword(SQLI_NORMAL_PASSWORD);
  }

  function fillExploit() {
    setUsername(SQLI_EXPLOIT_USERNAME);
    setPassword(SQLI_EXPLOIT_PASSWORD);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(previewUrl(problemId, "login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 502) {
        setResult({ tone: "neutral", message: CONTAINER_DOWN_MESSAGE });
        return;
      }

      if (data?.success === true) {
        setResult({
          tone: "danger",
          message: "ログイン成功 — 認証が突破されました",
          detail: data.user
            ? `返却された user: ${JSON.stringify(data.user)}`
            : undefined,
        });
        setExploited(true);
        onExploitDetected?.();
      } else {
        setResult({
          tone: "safe",
          message: "ログイン失敗 — 認証は正常です",
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

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950"
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

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={fillNormal}
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 transition hover:border-zinc-500 hover:bg-zinc-50"
        >
          通常ログインを試す
        </button>
        <button
          type="button"
          onClick={fillExploit}
          className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
        >
          SQLインジェクションを試す
        </button>
      </div>

      <label className="mt-4 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
        Username / Email <span className="text-rose-700">← 注入対象</span>
        <input
          className="mt-2 h-11 w-full rounded border border-zinc-300 bg-white px-3 font-mono text-sm text-zinc-800"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ここにペイロードを入力してみよう"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <label className="mt-3 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
        Password
        <input
          className="mt-2 h-11 w-full rounded border border-zinc-300 bg-white px-3 font-mono text-sm text-zinc-800"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="任意の値で OK"
          autoComplete="off"
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
          {exploited ? (
            <p className="mt-2 rounded border border-rose-300/60 bg-rose-50 p-3 text-xs leading-5 text-rose-800">
              ユーザー名欄に{" "}
              <code className="font-mono">{`' OR '1'='1' --`}</code>{" "}
              を入れると、SQL クエリが{" "}
              <code className="font-mono">
                {`WHERE username = '' OR '1'='1' --' AND password = '...'`}
              </code>{" "}
              に変わります。<code className="font-mono">--</code>{" "}
              以降がコメントアウトされ、パスワード判定をスキップして
              最初のユーザーが返ります。
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          上のクイック試行ボタン、または直接フィールドを編集して「Sign
          in」で送信します。
        </p>
      )}
    </form>
  );
}

const XSS_NORMAL_TEXT = "looks great!";
const XSS_EXPLOIT_TEXT = "<script>alert('xss')</script>";

function CommentsPreview({
  problemId,
  onExploitDetected,
}: {
  problemId: string;
  onExploitDetected?: () => void;
}) {
  const [author, setAuthor] = useState("happy_user");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [exploited, setExploited] = useState(false);
  const [result, setResult] = useState<{
    tone: Tone;
    message: string;
    detail?: string;
  } | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const containsScript = useCallback((s: string) => /<script\b/i.test(s), []);

  function fillNormal() {
    setAuthor("happy_user");
    setText(XSS_NORMAL_TEXT);
  }

  function fillExploit() {
    setAuthor("attacker");
    setText(XSS_EXPLOIT_TEXT);
  }

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
          setExploited(true);
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

  return (
    <div className="rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-zinc-950 text-sm font-black text-amber-200">
          CB
        </div>
        <div>
          <p className="text-sm font-bold">Comment Board</p>
          <p className="text-xs text-zinc-500">mvp build / review needed</p>
        </div>
      </div>

      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={fillNormal}
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 transition hover:border-zinc-500 hover:bg-zinc-50"
        >
          通常コメントを試す
        </button>
        <button
          type="button"
          onClick={fillExploit}
          className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
        >
          XSSスクリプトを試す
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
          author
          <input
            className="mt-2 h-10 w-full rounded border border-zinc-300 bg-white px-3 font-mono text-sm text-zinc-800"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="表示名"
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

      {exploited ? (
        <p className="mt-2 rounded border border-rose-300/60 bg-rose-50 p-3 text-xs leading-5 text-rose-800">
          サーバーは text をエスケープせずに HTML 文字列へ結合しています。
          下の iframe で <code className="font-mono">&lt;script&gt;</code>{" "}
          がそのままレンダリングされ、別ユーザーの閲覧時に JavaScript
          として実行されます。
        </p>
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

function DownloadPreview() {
  return (
    <div className="rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950">
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
          className="mt-2 h-11 w-full rounded border border-rose-300 bg-rose-50 px-3 text-sm font-mono text-rose-800"
          readOnly
          value="../../secret/flag.txt"
        />
      </label>

      <div className="mt-3 rounded border border-rose-300 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
        ../ を含む名前をそのまま path.join に渡すと、public/
        の外に脱出できてしまう状態です。
      </div>
    </div>
  );
}

function PingPreview() {
  return (
    <div className="rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950">
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
          className="mt-2 h-11 w-full rounded border border-rose-300 bg-rose-50 px-3 text-sm font-mono text-rose-800"
          readOnly
          value="127.0.0.1; cat /etc/passwd"
        />
      </label>

      <div className="mt-3 rounded border border-zinc-200 bg-black px-3 py-2 font-mono text-xs text-zinc-300">
        <p className="text-zinc-500">$ ping -c 1 127.0.0.1; cat /etc/passwd</p>
        <p className="mt-1 text-emerald-400">
          PING 127.0.0.1 ... 1 packets transmitted
        </p>
        <p className="mt-1 text-rose-400">
          root:x:0:0:root:/root:/bin/bash ...
        </p>
      </div>

      <div className="mt-3 rounded border border-rose-300 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
        ; の後のコマンドもシェルが実行してしまう状態です。
      </div>
    </div>
  );
}

function ProfilePreview({
  problemId,
  onExploitDetected,
}: {
  problemId: string;
  onExploitDetected?: () => void;
}) {
  const [targetId, setTargetId] = useState("user-1");
  const [loading, setLoading] = useState(false);
  const [exploited, setExploited] = useState(false);
  const [result, setResult] = useState<{
    tone: Tone;
    message: string;
    body?: string;
  } | null>(null);
  const triggeredRef = useRef(false);

  // The "logged-in" user is fixed in this demo. The vulnerability is that
  // the server doesn't check this against the URL :id.
  const ACTING_USER = "user-1";

  function fillSelf() {
    setTargetId("user-1");
  }

  function fillOther() {
    setTargetId("user-2");
  }

  async function handleFetch() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(previewUrl(problemId, "profile", targetId), {
        method: "GET",
        headers: { "X-User-Id": ACTING_USER },
      });

      const text = await res.text();

      if (res.status === 502) {
        setResult({ tone: "neutral", message: CONTAINER_DOWN_MESSAGE });
        return;
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
        return;
      }

      const hasSecret =
        typeof body === "object" &&
        body !== null &&
        "secret" in (body as Record<string, unknown>);
      const isOtherUser = targetId !== ACTING_USER;

      if (res.ok && hasSecret && isOtherUser) {
        setResult({
          tone: "danger",
          message: "他のユーザーの機密情報にアクセスできました",
          body: prettyBody,
        });
        setExploited(true);

        if (!triggeredRef.current) {
          triggeredRef.current = true;
          onExploitDetected?.();
        }

        return;
      }

      setResult({
        tone: "neutral",
        message: res.ok
          ? "自分のプロフィールが返されました (正常な動作)"
          : `応答 HTTP ${res.status}`,
        body: prettyBody,
      });
    } catch (err) {
      setResult({
        tone: "neutral",
        message: CONTAINER_DOWN_MESSAGE,
        body: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    triggeredRef.current = false;
  }, [targetId]);

  return (
    <div className="rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950">
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

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={fillSelf}
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 transition hover:border-zinc-500 hover:bg-zinc-50"
        >
          自分の ID で試す (user-1)
        </button>
        <button
          type="button"
          onClick={fillOther}
          className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
        >
          他人の ID で試す (user-2)
        </button>
      </div>

      <label className="mt-4 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
        Target user ID <span className="text-rose-700">← URL の :id</span>
        <input
          className="mt-2 h-10 w-full rounded border border-zinc-300 bg-white px-3 font-mono text-sm text-zinc-800"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          placeholder="他のユーザーIDを試してみよう (user-2, user-3)"
          spellCheck={false}
        />
      </label>

      <button
        type="button"
        onClick={handleFetch}
        disabled={loading}
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
          {exploited ? (
            <p className="mt-2 rounded border border-rose-300/60 bg-rose-50 p-3 text-xs leading-5 text-rose-800">
              ハンドラは <code className="font-mono">req.userId</code>{" "}
              （ログイン中のユーザー）と{" "}
              <code className="font-mono">req.params.id</code>{" "}
              （URL の対象 ID）を比較していません。{ACTING_USER}{" "}
              としてログインしたまま URL を user-2 に書き換えただけで、他人の機密情報が返ります。
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          ID を変更して「プロフィール取得」を押すと、本人確認のない応答が確認できます。
        </p>
      )}
    </div>
  );
}