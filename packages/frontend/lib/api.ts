import { ApiError } from "@/lib/errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:4000";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export type DashboardResponse = {
  profile: { display_name: string | null; email: string | null };
  totalScore: number;
  completedCount: number;
  completed: Array<{
    problem_id: string;
    title: string | null;
    score: number;
    completed_at: string;
  }>;
  recentSubmissions: Array<{ problem_id: string; passed: boolean; created_at: string }>;
};

export type LeaderboardEntry = {
  user_id?: string;
  rank: number;
  display_name: string | null;
  total_score: number;
  completed_count: number;
};

export type LeaderboardResponse = { entries: LeaderboardEntry[] };

async function authHeader(): Promise<Record<string, string>> {
  if (typeof window === "undefined" || !isSupabaseConfigured) return {};
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export async function getDashboard(): Promise<DashboardResponse> {
  if (USE_MOCK) {
    return {
      profile: { display_name: null, email: "mock@example.com" },
      totalScore: 0,
      completedCount: 0,
      completed: [],
      recentSubmissions: [],
    };
  }

  const response = await fetch(`${API_BASE_URL}/me/dashboard`, {
    headers: { ...(await authHeader()) },
  });
  if (!response.ok) {
    throw new ApiError("Dashboard API error", response.status);
  }
  return response.json();
}

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  if (USE_MOCK) return { entries: [] };

  const response = await fetch(`${API_BASE_URL}/leaderboard`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError("Leaderboard API error", response.status);
  }

  return response.json();
}

export async function getMyCompletions(): Promise<Record<string, number>> {
  if (USE_MOCK || !isSupabaseConfigured) return {};

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return {};

  try {
    const dashboard = await getDashboard();
    return Object.fromEntries(
      dashboard.completed.map((row) => [row.problem_id, row.score]),
    );
  } catch {
    return {};
  }
}
