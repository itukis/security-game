"use client";

import { useRef, useState } from "react";
import {
  CONTAINER_DOWN_MESSAGE,
  ResultBanner,
  type Tone,
} from "./shared";

export type PreviewProps = {
  problemId: string;
  onExploitDetected?: () => void;
  autoTestNonce?: number;
};

export type ProbeResult = {
  tone: Tone;
  message: string;
  detail?: string;
};

// Payload constants shared by the review-mode previews.
export const SUPPORT_XSS_PAYLOAD = "<script>window.__pwned__=true</script>";
export const EVIL_URL = "https://evil.example.com/phish";
export const UPLOAD_FILENAME = "malicious.html";
export const UPLOAD_PAYLOAD = "<script>document.title='pwned'</script>";

type ProbePair = readonly [name: string, probe: () => Promise<boolean>];

// Shared probe runner for the three composite-review previews. Each one
// invokes the same loading/try/catch/result boilerplate, so collapsing it
// here keeps the three Preview components focused on their probe logic and
// their result copy.
export function useReviewProbes(args: {
  onExploitDetected?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProbeResult | null>(null);
  const onExploitedRef = useRef(args.onExploitDetected);
  onExploitedRef.current = args.onExploitDetected;

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
      if (exploited) onExploitedRef.current?.();
    } catch (err) {
      setResult({
        tone: "neutral",
        message: err instanceof Error ? err.message : CONTAINER_DOWN_MESSAGE,
      });
    } finally {
      setLoading(false);
    }
  }

  async function runAll(probes: readonly ProbePair[], allSafeMessage: string) {
    setLoading(true);
    setResult(null);
    try {
      const outcomes: Array<[string, boolean]> = [];
      for (const [name, probe] of probes) {
        outcomes.push([name, await probe()]);
      }
      const failed = outcomes.filter(([, ex]) => ex).map(([n]) => n);
      setResult(
        failed.length > 0
          ? {
              tone: "danger",
              message: "まだ攻撃が成立します",
              detail: failed.join(" / "),
            }
          : { tone: "safe", message: allSafeMessage },
      );
      if (failed.length > 0) onExploitedRef.current?.();
    } catch (err) {
      setResult({
        tone: "neutral",
        message: err instanceof Error ? err.message : CONTAINER_DOWN_MESSAGE,
      });
    } finally {
      setLoading(false);
    }
  }

  return { loading, result, runProbe, runAll };
}

export function ReviewShell({
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
  result: ProbeResult | null;
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
