"use client";

import { useEffect } from "react";
import { CONTAINER_DOWN_MESSAGE, previewUrl } from "./shared";
import {
  ReviewShell,
  SUPPORT_XSS_PAYLOAD,
  EVIL_URL,
  useReviewProbes,
  type PreviewProps,
} from "./reviewShared";

const ALL_SAFE_MESSAGE = "3つの攻撃はすべて防御されています";

export function SupportPortalPreview({
  autoTestNonce = 0,
  onExploitDetected,
  problemId,
}: PreviewProps) {
  const { loading, result, runProbe, runAll } = useReviewProbes({
    onExploitDetected,
  });

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
    const location =
      res.headers.get("x-upstream-location") ||
      res.headers.get("location") ||
      "";
    return /^https?:\/\//i.test(location) || location.startsWith("//");
  }

  const allProbes = [
    ["SQLi", probeLogin],
    ["XSS", probeXss],
    ["Open Redirect", probeRedirect],
  ] as const;

  useEffect(() => {
    if (autoTestNonce <= 0) return;
    queueMicrotask(() => {
      void runAll(allProbes, ALL_SAFE_MESSAGE);
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
        ["3攻撃まとめて確認", () => runAll(allProbes, ALL_SAFE_MESSAGE)],
      ]}
    />
  );
}
