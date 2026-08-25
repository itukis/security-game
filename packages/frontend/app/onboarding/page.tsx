"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Spinner } from "@/components/Spinner";
import { SupabaseRequiredNotice } from "@/components/SupabaseRequiredNotice";
import { useToast } from "@/components/Toast";
import { hasChosenDisplayName } from "@/lib/authProfile";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function OnboardingPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, loading, updateDisplayName } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (hasChosenDisplayName(user)) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  if (!isSupabaseConfigured) {
    return <SupabaseRequiredNotice />;
  }

  if (loading || !user || hasChosenDisplayName(user)) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-100">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <Spinner />
          アカウントを確認中...
        </div>
      </main>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = displayName.trim();
    setError(null);

    if (trimmed.length < 2 || trimmed.length > 50) {
      setError("表示名は2〜50文字で入力してください。");
      return;
    }

    setSaving(true);
    const { error: updateError } = await updateDisplayName(trimmed);
    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      toast.error(`表示名を保存できませんでした：${updateError.message}`);
      return;
    }

    toast.success("表示名を設定しました");
    router.replace("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 py-12 text-zinc-100">
      <div className="w-full max-w-lg rounded-xl border border-cyan-300/20 bg-zinc-900 p-6 shadow-2xl shadow-black/50 sm:p-8">
        <div className="mb-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
            Welcome to SecurePatch Quest
          </p>
          <h1 className="mt-3 text-2xl font-black text-white">表示名を決めてください</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Dashboardとランキングに表示される名前です。本名でなくても構いません。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="text-sm font-bold text-zinc-200">表示名</span>
            <input
              autoFocus
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              minLength={2}
              maxLength={50}
              autoComplete="nickname"
              placeholder="例：taro"
              className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-300"
            />
            <span className="mt-2 block text-xs text-zinc-500">2〜50文字・後から変更可能</span>
          </label>

          {error ? (
            <div className="rounded border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-12 w-full items-center justify-center rounded bg-cyan-300 px-4 text-sm font-black text-zinc-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "保存中..." : "この名前で始める"}
          </button>
        </form>
      </div>
    </main>
  );
}
