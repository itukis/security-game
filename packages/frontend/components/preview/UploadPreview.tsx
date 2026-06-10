"use client";

import { useEffect, useRef, useState } from "react";
import {
  CONTAINER_DOWN_MESSAGE,
  ResultBanner,
  previewUrl,
  type Tone,
} from "./shared";

const UPLOAD_FILENAME = "malicious.html";
const UPLOAD_PAYLOAD = "<script>document.title='pwned'</script>";

export function UploadPreview({
  problemId,
  onExploitDetected,
  autoTestNonce = 0,
}: {
  problemId: string;
  onExploitDetected?: () => void;
  autoTestNonce?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [result, setResult] = useState<{
    tone: Tone;
    message: string;
    detail?: string;
  } | null>(null);
  const triggeredRef = useRef(false);

  const refreshFiles = async () => {
    try {
      const res = await fetch(previewUrl(problemId, "uploads"));
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.files)) setFiles(data.files);
    } catch {
      // best-effort
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void refreshFiles();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId]);

  async function performAttack() {
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append(
        "file",
        new Blob([UPLOAD_PAYLOAD], { type: "text/html" }),
        UPLOAD_FILENAME,
      );

      const upload = await fetch(previewUrl(problemId, "upload"), {
        method: "POST",
        body: form,
      });

      if (upload.status === 502) {
        setResult({ tone: "neutral", message: CONTAINER_DOWN_MESSAGE });
        return { detected: false };
      }
      if (upload.status >= 400) {
        const data = await upload.json().catch(() => ({}));
        setResult({
          tone: "safe",
          message: `${UPLOAD_FILENAME} のアップロードが ${upload.status} で弾かれました`,
          detail: data?.error ? String(data.error) : undefined,
        });
        await refreshFiles();
        return { detected: false };
      }

      await refreshFiles();

      const fetched = await fetch(previewUrl(problemId, "files", UPLOAD_FILENAME));
      const contentType = fetched.headers.get("content-type") || "";
      if (fetched.ok && /text\/html/i.test(contentType)) {
        setResult({
          tone: "danger",
          message: "悪意のあるHTMLファイルがアップロード・配信可能な状態です",
          detail: `GET /files/${UPLOAD_FILENAME} → Content-Type: ${contentType}`,
        });
        return { detected: true };
      }

      setResult({
        tone: "neutral",
        message: `GET /files/${UPLOAD_FILENAME} → ${fetched.status}`,
        detail: `Content-Type: ${contentType || "(none)"}`,
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
    const out = await performAttack();
    if (out.detected && !triggeredRef.current) {
      triggeredRef.current = true;
      onExploitDetected?.();
    }
  }

  useEffect(() => {
    if (autoTestNonce <= 0) return;
    queueMicrotask(() => {
      void performAttack();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTestNonce]);

  return (
    <div className="relative min-w-0 rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-zinc-950 text-sm font-black text-cyan-200">
          UP
        </div>
        <div>
          <p className="text-sm font-bold">File Share</p>
          <p className="text-xs text-zinc-500">mvp build / review needed</p>
        </div>
      </div>

      <p className="text-xs text-zinc-600">
        <code>{UPLOAD_FILENAME}</code> (中身は <code>{UPLOAD_PAYLOAD}</code>) をアップロードし、
        <code>GET /files/{UPLOAD_FILENAME}</code> の Content-Type を確認します。
      </p>

      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="mt-3 h-11 w-full rounded bg-zinc-950 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "アップロード中..." : `悪意のある ${UPLOAD_FILENAME} をアップロードしてみる`}
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

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-600">
          /uploads
        </p>
        {files.length === 0 ? (
          <p className="mt-1 text-[11px] text-zinc-500">(空)</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {files.map((f) => (
              <li
                key={f}
                className="rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-xs text-zinc-800"
              >
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
