import { supabase } from './supabase';
import mockData from '../../docs/frontend-integration/sample-responses.json';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export type Problem = {
  id: string;
  title: string;
  vulnerability: string;
  description: string;
  targetEndpoint: string;
  hints: string[];
  initialCode: string;
};

export type VerifyResponse = {
  attackBefore: unknown;
  attackAfter: unknown;
  passed: boolean;
  recording?: { firstClear: boolean; score: number | null };
};

export type DashboardResponse = {
  profile: { display_name: string | null; email: string | null };
  totalScore: number;
  completedCount: number;
  completed: Array<{ problem_id: string; title: string | null; score: number; completed_at: string }>;
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

async function authHeader() {
  if (typeof window === 'undefined') return {};
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export async function getProblem(id: string): Promise<Problem> {
  if (USE_MOCK) return (mockData as { getProblem: Problem }).getProblem;
  const res = await fetch(`${BASE_URL}/problems/${id}`);
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function verifyPatch(id: string, patch: string): Promise<VerifyResponse> {
  if (USE_MOCK) return (mockData as { verifyPassing: VerifyResponse }).verifyPassing;
  const res = await fetch(`${BASE_URL}/problems/${id}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ patch }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function getDashboard(): Promise<DashboardResponse> {
  if (USE_MOCK) {
    return {
      profile: { display_name: null, email: 'mock@example.com' },
      totalScore: 0,
      completedCount: 0,
      completed: [],
      recentSubmissions: [],
    };
  }
  const res = await fetch(`${BASE_URL}/me/dashboard`, {
    headers: { ...(await authHeader()) },
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  if (USE_MOCK) return { entries: [] };
  const res = await fetch(`${BASE_URL}/leaderboard`);
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}
