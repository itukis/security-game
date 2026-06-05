'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../components/AuthProvider';
import { getLeaderboard, type LeaderboardEntry } from '../../lib/api';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    getLeaderboard()
      .then((data) => {
        if (active) setEntries(data.entries || []);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <div className="mx-auto max-w-4xl px-6 py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Top 50 players</p>
            <h1 className="text-2xl font-semibold">Leaderboard</h1>
          </div>
          <Link className="text-sm text-slate-300 underline" href="/dashboard">
            Back to dashboard
          </Link>
        </header>

        {error ? (
          <div className="mt-6 rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/60 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Total Score</th>
                <th className="px-4 py-3 font-medium">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {entries.map((entry) => {
                const isCurrent = user && entry.user_id && entry.user_id === user.id;
                return (
                  <tr
                    key={`${entry.rank}-${entry.display_name || 'anon'}`}
                    className={isCurrent ? 'bg-slate-800/70' : 'bg-slate-900/40'}
                  >
                    <td className="px-4 py-3 font-semibold">#{entry.rank}</td>
                    <td className="px-4 py-3">
                      {entry.display_name || 'Anonymous'}
                      {isCurrent ? (
                        <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                          You
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{entry.total_score}</td>
                    <td className="px-4 py-3">{entry.completed_count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
