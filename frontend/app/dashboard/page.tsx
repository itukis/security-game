'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import { getDashboard, type DashboardResponse } from '../../lib/api';

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setDashboard(null);
      return;
    }

    let active = true;
    setDataLoading(true);
    setError(null);

    getDashboard()
      .then((data) => {
        if (active) setDashboard(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      })
      .finally(() => {
        if (active) setDataLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <div className="mx-auto max-w-4xl px-6 py-12">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <p className="text-lg">Please log in to view your dashboard.</p>
          <Link className="mt-4 inline-block text-sm text-slate-300 underline" href="/login">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  const displayName =
    dashboard?.profile.display_name || dashboard?.profile.email || user.email || 'User';
  const completed = dashboard?.completed ?? [];
  const recent = dashboard?.recentSubmissions ?? [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
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

        {error ? (
          <div className="mt-6 rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
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
              <p className="p-4 text-sm text-slate-400">No problems completed yet.</p>
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
                        <p className="text-lg font-semibold">{item.score}</p>
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
              <p className="p-4 text-sm text-slate-400">No submissions yet.</p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {recent.map((item) => (
                  <li key={`${item.problem_id}-${item.created_at}`} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm text-slate-400">{item.problem_id}</p>
                        <p className="text-base font-semibold">
                          {item.passed ? 'Passed' : 'Failed'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={item.passed ? 'text-emerald-400' : 'text-rose-400'}>
                          {item.passed ? '✓' : '✗'}
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
