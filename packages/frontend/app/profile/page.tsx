"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PageError } from "@/components/PageError";
import { Spinner } from "@/components/Spinner";
import { SupabaseRequiredNotice } from "@/components/SupabaseRequiredNotice";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { getDashboard, type DashboardResponse } from "@/lib/api";
import { classifyError, type ErrorKind } from "@/lib/errors";
import { problemOrder } from "@/lib/problemContent";
import { isSupabaseConfigured } from "@/lib/supabase";

function formatMemberSince(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

type BadgeConfig = {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (data: DashboardResponse) => boolean;
};

const BADGES: BadgeConfig[] = [
  {
    id: "first-clear",
    name: "初回クリア",
    description: "はじめての問題をクリアした",
    icon: "★",
    check: (d) => d.completed.length >= 1,
  },
  {
    id: "sqli-master",
    name: "SQLi マスター",
    description: "SQLインジェクションの問題をクリアした",
    icon: "S",
    check: (d) => d.completed.some((c) => c.problem_id.includes("sqli")),
  },
  {
    id: "xss-master",
    name: "XSS マスター",
    description: "XSSの問題をクリアした",
    icon: "X",
    check: (d) => d.completed.some((c) => c.problem_id.includes("xss")),
  },
  {
    id: "idor-master",
    name: "IDOR マスター",
    description: "IDORの問題をクリアした",
    icon: "I",
    check: (d) => d.completed.some((c) => c.problem_id.includes("idor")),
  },
  {
    id: "all-clear",
    name: "全問制覇",
    description: "全種類の脆弱性問題をすべてクリアした",
    icon: "✦",
    check: (d) => {
      const completedIds = new Set(d.completed.map((c) => c.problem_id));
      return problemOrder.every((id) => completedIds.has(id));
    },
  },
  {
    id: "one-shot",
    name: "一撃必殺",
    description: "一度の提出で問題をクリアした",
    icon: "◉",
    check: (d) => {
      const completedIds = new Set(d.completed.map((c) => c.problem_id));
      return [...completedIds].some((id) => {
        const subs = d.recentSubmissions.filter((s) => s.problem_id === id);
        return subs.length > 0 && subs.every((s) => s.passed);
      });
    },
  },
];

type BadgeItem = Omit<BadgeConfig, "check"> & { unlocked: boolean };

export default function ProfilePage() {
  const { user, loading, updateDisplayName } = useAuth();
  const toast = useToast();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [nameSaving, setNameSaving] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;

    let active = true;

    async function fetchData() {
      setDataLoading(true);
      setErrorKind(null);
      try {
        const data = await getDashboard();
        if (active) setDashboard(data);
      } catch (err) {
        if (active) setErrorKind(classifyError(err));
      } finally {
        if (active) setDataLoading(false);
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, [user, retryCount]);

  if (!isSupabaseConfigured) {
    return <SupabaseRequiredNotice />;
  }

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <Header />
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-12">
          <Spinner />
          <span className="text-sm text-zinc-400">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <Header />
        <div className="mx-auto max-w-4xl px-6 py-12">
          <p className="text-lg text-zinc-300">
            プロフィールを表示するにはログインが必要です。
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block text-sm text-cyan-300 underline hover:text-cyan-100"
          >
            ログインページへ
          </Link>
        </div>
      </div>
    );
  }

  const currentDisplayName =
    (user.user_metadata?.display_name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null;
  const email = dashboard?.profile.email ?? user.email ?? "-";
  const memberSince = formatMemberSince(user.created_at);

  async function handleSaveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = (nameInput ?? currentDisplayName ?? "").trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      toast.error("表示名は2〜50文字で入力してください。");
      return;
    }
    setNameSaving(true);
    const { error } = await updateDisplayName(trimmed);
    setNameSaving(false);
    if (error) {
      toast.error(`保存に失敗しました：${error.message}`);
    } else {
      toast.success("表示名を更新しました");
    }
  }
  const completedCount = dashboard?.completedCount ?? 0;
  const totalSubmissions = dashboard?.recentSubmissions.length ?? 0;
  const passedCount =
    dashboard?.recentSubmissions.filter((s) => s.passed).length ?? 0;
  const successRate =
    totalSubmissions > 0 ? Math.round((passedCount / totalSubmissions) * 100) : 0;

  const badgeItems: BadgeItem[] = BADGES.map(({ check, ...rest }) => ({
    ...rest,
    unlocked: dashboard ? check(dashboard) : false,
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
            Profile
          </p>
          <h1 className="mt-2 text-2xl font-black text-white">プロフィール</h1>
        </header>

        {errorKind ? (
          <div className="mb-6">
            <PageError
              kind={errorKind}
              onRetry={() => setRetryCount((c) => c + 1)}
            />
          </div>
        ) : null}

        <section className="rounded-lg border border-zinc-700 bg-zinc-900/90 p-5">
          <h2 className="mb-4 text-xs font-black uppercase tracking-[0.15em] text-zinc-500">
            アカウント情報
          </h2>
          <dl className="grid gap-0 divide-y divide-zinc-800">
            <StatRow label="表示名" value={currentDisplayName ?? "（未設定）"} />
            <StatRow label="メールアドレス" value={email} />
            <StatRow label="登録日" value={memberSince} />
            <StatRow label="クリア問題数" value={String(completedCount)} />
            <StatRow label="総提出数" value={String(totalSubmissions)} />
            <StatRow
              label="成功率"
              value={totalSubmissions > 0 ? `${successRate}%` : "-"}
            />
          </dl>
        </section>

        <section className="mt-6 rounded-lg border border-zinc-700 bg-zinc-900/90 p-5">
          <h2 className="mb-4 text-xs font-black uppercase tracking-[0.15em] text-zinc-500">
            表示名を変更
          </h2>
          <p className="mb-4 text-sm text-zinc-400">
            ここで設定した名前がDashboardとランキングに表示されます。本名以外の名前も使用できます。
          </p>
          <form onSubmit={handleSaveName} className="flex items-end gap-3">
            <label className="flex-1">
              <span className="block text-sm font-semibold text-zinc-300">
                新しい表示名
              </span>
              <input
                type="text"
                value={nameInput ?? currentDisplayName ?? ""}
                onChange={(e) => setNameInput(e.target.value)}
                minLength={2}
                maxLength={50}
                placeholder="2〜50文字"
                className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-300 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={nameSaving}
              className="h-[38px] rounded border border-cyan-300/70 bg-cyan-300 px-4 text-sm font-black text-zinc-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {nameSaving ? "保存中..." : "保存"}
            </button>
          </form>
          <p className="mt-2 text-xs text-zinc-500">2〜50文字。リーダーボードや挨拶欄に表示されます。</p>
        </section>

        <section className="mt-6">
          <h2 className="mb-4 text-xs font-black uppercase tracking-[0.15em] text-zinc-500">
            実績バッジ
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {badgeItems.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-sm font-semibold text-zinc-200">{value}</dd>
    </div>
  );
}

function BadgeCard({ badge }: { badge: BadgeItem }) {
  if (badge.unlocked) {
    return (
      <div className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded border border-cyan-300/50 bg-cyan-300/20 text-base font-black text-cyan-100">
            {badge.icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-cyan-100">{badge.name}</p>
            <p className="mt-0.5 text-xs leading-4 text-zinc-300">
              {badge.description}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 opacity-50">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded border border-zinc-700 bg-zinc-900 text-base font-black text-zinc-600">
          ✕
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-zinc-500">{badge.name}</p>
          <p className="mt-0.5 text-xs leading-4 text-zinc-600">
            {badge.description}
          </p>
        </div>
      </div>
    </div>
  );
}
