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

export function TransferPreview({
  problemId,
  onExploitDetected,
  autoTestNonce = 0,
}: {
  problemId: string;
  onExploitDetected?: () => void;
  autoTestNonce?: number;
}) {
  const fieldId = useId();
  const [balance, setBalance] = useState<number | null>(null);
  const [to, setTo] = useState("user-2");
  const [amount, setAmount] = useState("1000");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    tone: Tone;
    message: string;
    detail?: string;
  } | null>(null);

  const refreshBalance = async () => {
    try {
      const res = await fetch(previewUrl(problemId, "balance"));
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data?.balance === "number") setBalance(data.balance);
    } catch {
      // silent — balance is best-effort
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void refreshBalance();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId]);

  async function performTransfer(payload: { to: string; amount: number }) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(previewUrl(problemId, "transfer"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 502) {
        setResult({ tone: "neutral", message: CONTAINER_DOWN_MESSAGE });
        return { detected: false };
      }
      if (res.status === 403) {
        setResult({
          tone: "safe",
          message: "送金が 403 で弾かれました — CSRFトークンが必須化されています",
        });
        return { detected: false };
      }
      if (res.ok && data?.success === true) {
        setResult({
          tone: "danger",
          message: "送金成功 — CSRFトークンなしで処理されました",
          detail: `新しい残高: ${data.newBalance}`,
        });
        await refreshBalance();
        return { detected: true };
      }
      setResult({
        tone: "neutral",
        message: `応答 HTTP ${res.status}`,
        detail: typeof data === "object" ? JSON.stringify(data) : undefined,
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
    const amt = parseInt(amount, 10);
    if (!to.trim() || !amt || amt <= 0) {
      setResult({
        tone: "neutral",
        message: "送金先と正の整数の金額を入力してください",
      });
      return;
    }
    const out = await performTransfer({ to: to.trim(), amount: amt });
    if (out.detected) onExploitDetected?.();
  }

  useEffect(() => {
    if (autoTestNonce <= 0) return;
    queueMicrotask(() => {
      setTo("user-2");
      setAmount("1000");
      void performTransfer({ to: "user-2", amount: 1000 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTestNonce]);

  return (
    <form
      onSubmit={handleSubmit}
      className="relative min-w-0 rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-zinc-950 text-sm font-black text-emerald-200">
          ¥
        </div>
        <div>
          <p className="text-sm font-bold">Banking Transfer</p>
          <p className="text-xs text-zinc-500">mvp build / review needed</p>
        </div>
      </div>

      <div className="mb-3 rounded border border-zinc-300 bg-white px-3 py-2 text-sm">
        <span className="text-zinc-500">user-1 の残高: </span>
        <span className="font-mono font-bold">
          {balance === null ? "—" : balance}
        </span>
      </div>

      <label className="block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
        送金先 (user-id)
        <input
          className="mt-2 h-10 w-full rounded border border-zinc-300 bg-white px-3 font-mono text-sm text-zinc-800"
          value={to}
          onChange={(e) => {
            const v = e.target.value;
            const inputType = (e.nativeEvent as InputEvent).inputType;
            if (inputType !== "insertFromPaste" && v.includes("(Header:")) return;
            setTo(v);
          }}
          autoComplete="one-time-code"
          name={`field-${fieldId}-to`}
          spellCheck={false}
        />
      </label>

      <label className="mt-3 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
        金額
        <input
          className="mt-2 h-10 w-full rounded border border-zinc-300 bg-white px-3 font-mono text-sm text-zinc-800"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          name={`field-${fieldId}-amount`}
          spellCheck={false}
        />
      </label>

      <p className="mt-3 rounded border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">
        ← このフォームは X-CSRF-Token を送らずに POST します（外部サイトからの偽装送金を再現）
      </p>

      <button
        type="submit"
        disabled={loading}
        className="mt-3 h-11 w-full rounded bg-zinc-950 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "送金中..." : "POST /transfer (トークンなし)"}
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
