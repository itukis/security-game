"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { PageError } from "@/components/PageError";
import { Spinner } from "@/components/Spinner";
import { SupabaseRequiredNotice } from "@/components/SupabaseRequiredNotice";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { getDashboard, type DashboardResponse } from "@/lib/api";
import { classifyError, type ErrorKind } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;

    let active = true;

    async function fetchDashboard() {
      setDataLoading(true);
      setErrorKind(null);
      try {
        const data = await getDashboard();
        if (active) setDashboard(data);
      } catch (err) {
        if (active) {
          setErrorKind(classifyError(err));
          toast.error("通信エラーが発生しました");
        }
      } finally {
        if (active) setDataLoading(false);
      }
    }

    fetchDashboard();

    return () => {
      active = false;
    };
  }, [user, retryCount, toast]);

  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  if (!isSupabaseConfigured) {
    return <SupabaseRequiredNotice />;
  }

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <Header />
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-12">
          <Spinner />
          <span className="text-sm text-slate-400">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <Header />
        <div className="mx-auto max-w-4xl px-6 py-12">
          <p className="text-lg">ログインするとここに履歴が表示されます</p>
          <Link className="mt-4 inline-block text-sm text-slate-300 underline" href="/login">
            ログインページへ
          </Link>
        </div>
      </div>
    );
  }

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ||
    dashboard?.profile.display_name ||
    dashboard?.profile.email ||
    user.email ||
    "User";
  const completed = dashboard?.completed ?? [];
  const recent = dashboard?.recentSubmissions ?? [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Header />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Dashboard</p>
            <h1 className="text-2xl font-semibold">Welcome, {displayName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500"
              href="/leaderboard"
            >
              Leaderboard
            </Link>
            <button
              className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900"
              onClick={handleLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        </header>

        {errorKind ? (
          <div className="mt-6">
            <PageError
              kind={errorKind}
              onRetry={() => setRetryCount((c) => c + 1)}
            />
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-800/40 p-4">
            <p className="text-sm text-slate-400">Total Score</p>
            <p className="mt-2 text-2xl font-semibold">{dashboard?.totalScore ?? 0}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-800/40 p-4">
            <p className="text-sm text-slate-400">Completed Count</p>
            <p className="mt-2 text-2xl font-semibold">{dashboard?.completedCount ?? 0}</p>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Completed Problems</h2>
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/40">
            {completed.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">まだ解いた問題はありません</p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {completed.map((item) => (
                  <li key={`${item.problem_id}-${item.completed_at}`} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm text-slate-400">{item.problem_id}</p>
                        <p className="text-base font-semibold">
                          {item.title || item.problem_id}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Score</p>
                        <p className="text-lg font-semibold">{Math.max(0, item.score)}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Completed {formatDate(item.completed_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Recent Submissions</h2>
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/40">
            {recent.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">まだ提出はありません</p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {recent.map((item) => (
                  <li key={`${item.problem_id}-${item.created_at}`} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm text-slate-400">{item.problem_id}</p>
                        <p className="text-base font-semibold">
                          {item.passed ? "Passed" : "Failed"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={item.passed ? "text-emerald-400" : "text-rose-400"}>
                          {item.passed ? "✓" : "✗"}
                        </span>
                        <span className="text-slate-400">{formatDate(item.created_at)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
