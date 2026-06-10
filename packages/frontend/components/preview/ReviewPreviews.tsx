"use client";

import { useEffect, useState } from "react";
import {
  CONTAINER_DOWN_MESSAGE,
  ResultBanner,
  previewUrl,
  type Tone,
} from "./shared";

type PreviewProps = {
  problemId: string;
  onExploitDetected?: () => void;
  autoTestNonce?: number;
};

type Result = {
  tone: Tone;
  message: string;
  detail?: string;
};

const SUPPORT_XSS_PAYLOAD = "<script>window.__pwned__=true</script>";
const EVIL_URL = "https://evil.example.com/phish";
const UPLOAD_FILENAME = "malicious.html";
const UPLOAD_PAYLOAD = "<script>document.title='pwned'</script>";

export function SupportPortalPreview({
  autoTestNonce = 0,
  onExploitDetected,
  problemId,
}: PreviewProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function probeLogin(): Promise<boolean> {
    const res = await fetch(previewUrl(problemId, "agent", "login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "' OR 1=1--", password: "x" }),
    });
    if (res.status === 502) throw new Error(CONTAINER_DOWN_MESSAGE);
    const data = await res.json().catch(() => ({}));
    return res.ok && data?.success === true;
  }

  async function probeXss(): Promise<boolean> {
    await fetch(previewUrl(problemId, "tickets", "100", "comments"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: "attacker", body: SUPPORT_XSS_PAYLOAD }),
    });
    const res = await fetch(previewUrl(problemId, "tickets", "100"));
    if (res.status === 502) throw new Error(CONTAINER_DOWN_MESSAGE);
    const body = await res.text();
    return body.includes(SUPPORT_XSS_PAYLOAD);
  }

  async function probeRedirect(): Promise<boolean> {
    const res = await fetch(
      `${previewUrl(problemId, "handoff")}?next=${encodeURIComponent(EVIL_URL)}`,
    );
    if (res.status === 502) throw new Error(CONTAINER_DOWN_MESSAGE);
    const location = res.headers.get("x-upstream-location") || res.headers.get("location") || "";
    return /^https?:\/\//i.test(location) || location.startsWith("//");
  }

  async function runProbe(label: string, probe: () => Promise<boolean>) {
    setLoading(true);
    setResult(null);
    try {
      const exploited = await probe();
      setResult(
        exploited
          ? { tone: "danger", message: `${label} が成立しました` }
          : { tone: "safe", message: `${label} は防御されています` },
      );
      if (exploited) onExploitDetected?.();
    } catch (err) {
      setResult({
        tone: "neutral",
        message: err instanceof Error ? err.message : CONTAINER_DOWN_MESSAGE,
      });
    } finally {
      setLoading(false);
    }
  }

  async function runAll() {
    setLoading(true);
    setResult(null);
    try {
      const outcomes = [
        ["SQLi", await probeLogin()],
        ["XSS", await probeXss()],
        ["Open Redirect", await probeRedirect()],
      ] as const;
      const failed = outcomes.filter(([, exploited]) => exploited).map(([name]) => name);
      setResult(
        failed.length > 0
          ? {
              tone: "danger",
              message: "まだ攻撃が成立します",
              detail: failed.join(" / "),
            }
          : { tone: "safe", message: "3つの攻撃はすべて防御されています" },
      );
      if (failed.length > 0) onExploitDetected?.();
    } catch (err) {
      setResult({
        tone: "neutral",
        message: err instanceof Error ? err.message : CONTAINER_DOWN_MESSAGE,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoTestNonce <= 0) return;
    queueMicrotask(() => {
      void runAll();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTestNonce]);

  return (
    <ReviewShell
      badge="SQL/XSS/REDIRECT"
      loading={loading}
      result={result}
      subtitle="Support Portal"
      title="3つの入口を個別に再現"
      actions={[
        ["SQLiログイン", () => runProbe("SQLiログイン", probeLogin)],
        ["コメントXSS", () => runProbe("コメントXSS", probeXss)],
        ["外部リダイレクト", () => runProbe("外部リダイレクト", probeRedirect)],
        ["3攻撃まとめて確認", runAll],
      ]}
    />
  );
}

export function AccountWorkflowPreview({
  autoTestNonce = 0,
  onExploitDetected,
  problemId,
}: PreviewProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function probeIdor(): Promise<boolean> {
    const res = await fetch(previewUrl(problemId, "account", "user-2"), {
      headers: { "X-User-Id": "user-1" },
    });
    if (res.status === 502) throw new Error(CONTAINER_DOWN_MESSAGE);
    const data = await res.json().catch(() => ({}));
    return res.ok && (data?.id === "user-2" || "secretNote" in data);
  }

  async function probeCsrf(): Promise<boolean> {
    const res = await fetch(previewUrl(problemId, "transfer"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "user-2", amount: 1000 }),
    });
    if (res.status === 502) throw new Error(CONTAINER_DOWN_MESSAGE);
    const data = await res.json().catch(() => ({}));
    return res.ok && data?.success === true;
  }

  async function probeSecret(): Promise<boolean> {
    const res = await fetch(previewUrl(problemId));
    if (res.status === 502) throw new Error(CONTAINER_DOWN_MESSAGE);
    const body = await res.text();
    return /sk-review-admin|ADMIN_API_KEY/.test(body);
  }

  async function runProbe(label: string, probe: () => Promise<boolean>) {
    setLoading(true);
    setResult(null);
    try {
      const exploited = await probe();
      setResult(
        exploited
          ? { tone: "danger", message: `${label} が成立しました` }
          : { tone: "safe", message: `${label} は防御されています` },
      );
      if (exploited) onExploitDetected?.();
    } catch (err) {
      setResult({
        tone: "neutral",
        message: err instanceof Error ? err.message : CONTAINER_DOWN_MESSAGE,
      });
    } finally {
      setLoading(false);
    }
  }

  async function runAll() {
    setLoading(true);
    setResult(null);
    try {
      const outcomes = [
        ["IDOR", await probeIdor()],
        ["CSRF", await probeCsrf()],
        ["Secret Exposure", await probeSecret()],
      ] as const;
      const failed = outcomes.filter(([, exploited]) => exploited).map(([name]) => name);
      setResult(
        failed.length > 0
          ? {
              tone: "danger",
              message: "まだ攻撃が成立します",
              detail: failed.join(" / "),
            }
          : { tone: "safe", message: "3つの境界はすべて防御されています" },
      );
      if (failed.length > 0) onExploitDetected?.();
    } catch (err) {
      setResult({
        tone: "neutral",
        message: err instanceof Error ? err.message : CONTAINER_DOWN_MESSAGE,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoTestNonce <= 0) return;
    queueMicrotask(() => {
      void runAll();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTestNonce]);

  return (
    <ReviewShell
      badge="IDOR/CSRF/SECRET"
      loading={loading}
      result={result}
      subtitle="Account Center"
      title="権限境界を個別に再現"
      actions={[
        ["他人口座を取得", () => runProbe("IDOR", probeIdor)],
        ["トークンなし送金", () => runProbe("CSRF", probeCsrf)],
        ["HTMLソースの鍵", () => runProbe("秘密情報露出", probeSecret)],
        ["3攻撃まとめて確認", runAll],
      ]}
    />
  );
}

export function FileWorkbenchPreview({
  autoTestNonce = 0,
  onExploitDetected,
  problemId,
}: PreviewProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function probeTraversal(): Promise<boolean> {
    const res = await fetch(
      `${previewUrl(problemId, "download")}?name=${encodeURIComponent("../secret/flag.txt")}`,
    );
    if (res.status === 502) throw new Error(CONTAINER_DOWN_MESSAGE);
    const body = await res.text();
    return res.ok && body.includes("FLAG{");
  }

  async function probeCommand(): Promise<boolean> {
    const res = await fetch(previewUrl(problemId, "ping"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host: "127.0.0.1; echo WORKBENCH_PWNED" }),
    });
    if (res.status === 502) throw new Error(CONTAINER_DOWN_MESSAGE);
    const data = await res.json().catch(() => ({}));
    return res.ok && typeof data?.output === "string" && data.output.includes("WORKBENCH_PWNED");
  }

  async function probeUpload(): Promise<boolean> {
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
    if (upload.status === 502) throw new Error(CONTAINER_DOWN_MESSAGE);
    if (!upload.ok) return false;
    const data = await upload.json().catch(() => ({}));
    const storedPath =
      typeof data?.path === "string" ? data.path : `/files/${UPLOAD_FILENAME}`;
    const parts = storedPath.replace(/^\//, "").split("/").filter(Boolean);
    const fetched = await fetch(previewUrl(problemId, ...parts));
    const contentType = fetched.headers.get("content-type") || "";
    return fetched.ok && /text\/html/i.test(contentType);
  }

  async function runProbe(label: string, probe: () => Promise<boolean>) {
    setLoading(true);
    setResult(null);
    try {
      const exploited = await probe();
      setResult(
        exploited
          ? { tone: "danger", message: `${label} が成立しました` }
          : { tone: "safe", message: `${label} は防御されています` },
      );
      if (exploited) onExploitDetected?.();
    } catch (err) {
      setResult({
        tone: "neutral",
        message: err instanceof Error ? err.message : CONTAINER_DOWN_MESSAGE,
      });
    } finally {
      setLoading(false);
    }
  }

  async function runAll() {
    setLoading(true);
    setResult(null);
    try {
      const outcomes = [
        ["Path Traversal", await probeTraversal()],
        ["Command Injection", await probeCommand()],
        ["File Upload", await probeUpload()],
      ] as const;
      const failed = outcomes.filter(([, exploited]) => exploited).map(([name]) => name);
      setResult(
        failed.length > 0
          ? {
              tone: "danger",
              message: "まだ攻撃が成立します",
              detail: failed.join(" / "),
            }
          : { tone: "safe", message: "3つの入出力経路はすべて防御されています" },
      );
      if (failed.length > 0) onExploitDetected?.();
    } catch (err) {
      setResult({
        tone: "neutral",
        message: err instanceof Error ? err.message : CONTAINER_DOWN_MESSAGE,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoTestNonce <= 0) return;
    queueMicrotask(() => {
      void runAll();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTestNonce]);

  return (
    <ReviewShell
      badge="PATH/CMD/UPLOAD"
      loading={loading}
      result={result}
      subtitle="File Workbench"
      title="危険な入出力を個別に再現"
      actions={[
        ["../ で非公開ファイル", () => runProbe("Path Traversal", probeTraversal)],
        ["シェルメタ文字", () => runProbe("Command Injection", probeCommand)],
        ["HTMLアップロード", () => runProbe("File Upload", probeUpload)],
        ["3攻撃まとめて確認", runAll],
      ]}
    />
  );
}

function ReviewShell({
  actions,
  badge,
  loading,
  result,
  subtitle,
  title,
}: {
  actions: Array<[string, () => void]>;
  badge: string;
  loading: boolean;
  result: Result | null;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="relative min-w-0 rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded bg-zinc-950 text-sm font-black text-cyan-200">
            RV
          </div>
          <div>
            <p className="text-sm font-bold">{subtitle}</p>
            <p className="text-xs text-zinc-500">{title}</p>
          </div>
        </div>
        <span className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-rose-700">
          {badge}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {actions.map(([label, action]) => (
          <button
            key={label}
            type="button"
            onClick={action}
            disabled={loading}
            className="min-h-11 rounded bg-zinc-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "確認中..." : label}
          </button>
        ))}
      </div>
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
    </div>
  );
}
