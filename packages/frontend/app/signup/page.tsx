"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await signUp(email, password);

    if (signUpError) {
      setError(signUpError.message);
      toast.error(`アカウント作成に失敗しました：${signUpError.message}`);
      setLoading(false);
      return;
    }

    toast.success("アカウントを作成しました");
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="min-h-screen bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(250,204,21,0.05)_1px,transparent_1px)] bg-[size:34px_34px]">
        <Header />

        <section className="mx-auto flex min-h-[calc(100vh-76px)] w-full max-w-3xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-6 shadow-2xl shadow-black/40">
            <h1 className="text-2xl font-black text-white">Sign up</h1>
            <p className="mt-2 text-sm text-zinc-400">
              学習の進捗を保存するためにアカウントを作成します。
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

              <label className="block text-sm font-semibold text-zinc-300">
                Confirm password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
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
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-sm text-zinc-400">
              すでにアカウントがありますか？{" "}
              <Link className="text-cyan-200 underline" href="/login">
                Log in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
