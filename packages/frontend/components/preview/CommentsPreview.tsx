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

const XSS_EXPLOIT_TEXT = "<script>alert('xss')</script>";

export function CommentsPreview({
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

  const containsScript = (s: string) => /<script\b/i.test(s);

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
            setResult({ tone: "neutral", message: CONTAINER_DOWN_MESSAGE });
            return;
          }
          if (!res.ok) {
            setResult({
              tone: "neutral",
              message: `投稿失敗 (HTTP ${res.status})`,
            });
            return;
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
