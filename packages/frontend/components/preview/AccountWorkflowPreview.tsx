"use client";

import { useEffect } from "react";
import { CONTAINER_DOWN_MESSAGE, previewUrl } from "./shared";
import {
  ReviewShell,
  useReviewProbes,
  type PreviewProps,
} from "./reviewShared";

const ALL_SAFE_MESSAGE = "3つの境界はすべて防御されています";

export function AccountWorkflowPreview({
  autoTestNonce = 0,
  onExploitDetected,
  problemId,
}: PreviewProps) {
  const { loading, result, runProbe, runAll } = useReviewProbes({
    onExploitDetected,
  });

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

  const allProbes = [
    ["IDOR", probeIdor],
    ["CSRF", probeCsrf],
    ["Secret Exposure", probeSecret],
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
      badge="IDOR/CSRF/SECRET"
      loading={loading}
      result={result}
      subtitle="Account Center"
      title="権限境界を個別に再現"
      actions={[
        ["他人口座を取得", () => runProbe("IDOR", probeIdor)],
        ["トークンなし送金", () => runProbe("CSRF", probeCsrf)],
        ["HTMLソースの鍵", () => runProbe("秘密情報露出", probeSecret)],
        ["3攻撃まとめて確認", () => runAll(allProbes, ALL_SAFE_MESSAGE)],
      ]}
    />
  );
}
