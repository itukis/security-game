"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { SupabaseRequiredNotice } from "@/components/SupabaseRequiredNotice";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { hasChosenDisplayName } from "@/lib/authProfile";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(hasChosenDisplayName(user) ? "/dashboard" : "/onboarding");
    }
  }, [authLoading, router, user]);

  if (!isSupabaseConfigured) {
    return <SupabaseRequiredNotice />;
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);

    const { error: signInError } = await signInWithGoogle();
    if (signInError) {
      setError(signInError.message);
      toast.error(`ログインに失敗しました：${signInError.message}`);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="min-h-screen bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(250,204,21,0.05)_1px,transparent_1px)] bg-[size:34px_34px]">
        <Header />

        <section className="mx-auto flex min-h-[calc(100vh-76px)] w-full max-w-3xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-6 shadow-2xl shadow-black/40">
            <h1 className="text-2xl font-black text-white">Login</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Googleアカウントでログインして進捗を保存しましょう。
            </p>

            {error ? (
              <div className="mt-6 rounded border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || authLoading}
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-3 rounded border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-900 shadow-lg shadow-black/20 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full bg-[conic-gradient(from_-45deg,#4285f4_0_25%,#34a853_0_50%,#fbbc05_0_75%,#ea4335_0)] text-xs font-black text-white">
                G
              </span>
              {loading || authLoading ? "接続中..." : "Googleでログイン"}
            </button>

            <p className="mt-5 text-xs leading-5 text-zinc-500">
              初回ログイン時にアカウントが自動作成されます。確認メールとパスワード登録は不要です。
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
