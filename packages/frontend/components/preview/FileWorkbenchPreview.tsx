"use client";

import { useEffect } from "react";
import { CONTAINER_DOWN_MESSAGE, previewUrl } from "./shared";
import {
  ReviewShell,
  UPLOAD_FILENAME,
  UPLOAD_PAYLOAD,
  useReviewProbes,
  type PreviewProps,
} from "./reviewShared";

const ALL_SAFE_MESSAGE = "3つの入出力経路はすべて防御されています";

export function FileWorkbenchPreview({
  autoTestNonce = 0,
  onExploitDetected,
  problemId,
}: PreviewProps) {
  const { loading, result, runProbe, runAll } = useReviewProbes({
    onExploitDetected,
  });

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
    return (
      res.ok &&
      typeof data?.output === "string" &&
      data.output.includes("WORKBENCH_PWNED")
    );
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

  const allProbes = [
    ["Path Traversal", probeTraversal],
    ["Command Injection", probeCommand],
    ["File Upload", probeUpload],
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
      badge="PATH/CMD/UPLOAD"
      loading={loading}
      result={result}
      subtitle="File Workbench"
      title="危険な入出力を個別に再現"
      actions={[
        ["../ で非公開ファイル", () => runProbe("Path Traversal", probeTraversal)],
        ["シェルメタ文字", () => runProbe("Command Injection", probeCommand)],
        ["HTMLアップロード", () => runProbe("File Upload", probeUpload)],
        ["3攻撃まとめて確認", () => runAll(allProbes, ALL_SAFE_MESSAGE)],
      ]}
    />
  );
}
