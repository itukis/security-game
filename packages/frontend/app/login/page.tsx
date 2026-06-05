"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError.message);
      toast.error(`ログインに失敗しました：${signInError.message}`);
      setLoading(false);
      return;
    }

    toast.success("ログインしました");
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="min-h-screen bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(250,204,21,0.05)_1px,transparent_1px)] bg-[size:34px_34px]">
        <Header />

        <section className="mx-auto flex min-h-[calc(100vh-76px)] w-full max-w-3xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-6 shadow-2xl shadow-black/40">
            <h1 className="text-2xl font-black text-white">Login</h1>
            <p className="mt-2 text-sm text-zinc-400">
              アカウントにログインして進捗を保存しましょう。
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-semibold text-zinc-300">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-cyan-300 focus:outline-none"
                />
              </label>

              <label className="block text-sm font-semibold text-zinc-300">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-cyan-300 focus:outline-none"
                />
              </label>

              {error ? (
                <div className="rounded border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center rounded border border-cyan-300/70 bg-cyan-300 px-4 text-sm font-black text-zinc-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>

            <p className="mt-6 text-sm text-zinc-400">
              アカウントがありませんか？{" "}
              <Link className="text-cyan-200 underline" href="/signup">
                Sign up
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
