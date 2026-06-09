import type {
  Challenge,
  ProblemResponse,
  VerifyResult,
} from "@/lib/challengeTypes";
import { mockChallenges } from "@/lib/mockChallenges";
import {
  getProblemContent,
  problemOrder,
  type ProblemId,
} from "@/lib/problemContent";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export const DEFAULT_PROBLEM_ID: ProblemId = "sqli-login";
const STATIC_ONLY_PROBLEM_IDS = new Set<ProblemId>([
  "path-traversal-files",
  "cmd-injection-ping",
]);

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:4000";
// Default to the real orchestrator. Set NEXT_PUBLIC_USE_MOCK=true to opt
// back into the mockChallenges-only path (used for offline demos and tests).
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

async function authHeader(): Promise<Record<string, string>> {
  if (typeof window === "undefined" || !isSupabaseConfigured) return {};
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export async function getProblems(): Promise<Challenge[]> {
  if (USE_MOCK) {
    return mockChallenges;
  }

  // No list endpoint on the orchestrator — fetch each shipped problem.
  const results = await Promise.all(
    problemOrder.map((id) => getProblem(id).catch(() => undefined)),
  );

  return results.filter((c): c is Challenge => Boolean(c));
}

export async function getProblem(id: string): Promise<Challenge | undefined> {
  if (USE_MOCK) {
    return getStaticChallenge(id);
  }

  const response = await fetch(`${API_BASE_URL}/problems/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 404) {
      return getStaticChallenge(id);
    }

    throw new Error(`Problem API error (${response.status})`);
  }

  const problem = (await response.json()) as ProblemResponse;
  return mapProblemToChallenge(problem);
}

export async function verifyPatch(
  id: string,
  patch: string,
): Promise<VerifyResult> {
  if (USE_MOCK || isStaticOnlyProblem(id)) {
    return verifyMockPatch(id, patch);
  }

  const response = await fetch(`${API_BASE_URL}/problems/${id}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify({ patch }),
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Verify API error (${response.status})${formatErrorDetail(responseText)}`,
    );
  }

  try {
    const result = JSON.parse(responseText) as Partial<VerifyResult>;

    return {
      attackBefore: result.attackBefore ?? "未取得",
      attackAfter: result.attackAfter ?? "未取得",
      passed: Boolean(result.passed),
    };
  } catch {
    throw new Error("Verify APIのレスポンスを解析できませんでした。");
  }
}

export async function resetContainer(id: string): Promise<void> {
  // Static-only problems have no container to reset.
  if (USE_MOCK || isStaticOnlyProblem(id)) return;

  try {
    const response = await fetch(`${API_BASE_URL}/problems/${id}/reset`, {
      method: "POST",
    });
    if (!response.ok) {
      // Best-effort cleanup. The next verify will reset anyway, so just log.
      console.warn(`Container reset failed for ${id} (${response.status})`);
    }
  } catch (err) {
    console.warn(`Container reset request failed for ${id}:`, err);
  }
}

export async function previewApplyPatch(
  id: string,
  patch: string,
): Promise<{ applied: true }> {
  if (USE_MOCK || isStaticOnlyProblem(id)) {
    await wait(800);
    return { applied: true };
  }

  const response = await fetch(`${API_BASE_URL}/problems/${id}/preview`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify({ patch }),
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Preview API error (${response.status})${formatErrorDetail(responseText)}`,
    );
  }

  try {
    const result = JSON.parse(responseText) as { applied?: unknown };
    if (result.applied !== true) {
      throw new Error("applied flag missing");
    }
    return { applied: true };
  } catch {
    throw new Error("Preview APIのレスポンスを解析できませんでした。");
  }
}

function verifyMockPatch(id: string, patch: string): VerifyResult {
  const challenge = getStaticChallenge(id);
  const selectedPatch = challenge?.patchOptions.find(
    (patchOption) => patchOption.patch === patch,
  );
  const passed = Boolean(selectedPatch?.isCorrect);

  return {
    attackBefore: `攻撃成功: ${challenge?.attackVerifiedMessage ?? "脆弱性が刺さった疑似結果"}`,
    attackAfter: passed
      ? `防御成功: ${challenge?.defenseSuccessFlavor ?? "パッチ適用後の疑似攻撃を防ぎました。"}`
      : `防御失敗: ${challenge?.defenseFailureFlavor ?? "パッチ適用後も脆弱性の原因が残っています。"}`,
    passed,
  };
}

function getStaticChallenge(id: string): Challenge | undefined {
  return mockChallenges.find((challenge) => challenge.id === id);
}

function isStaticOnlyProblem(id: string): boolean {
  return STATIC_ONLY_PROBLEM_IDS.has(id as ProblemId);
}

function mapProblemToChallenge(problem: ProblemResponse): Challenge {
  // Merge the live API payload with frontend-only presentation content
  // (causeSummary, stepCopy, defenseSuccessFlavor, etc.) from problemContent.
  // When the problem ID has no matching frontend content, fall back to a
  // minimal Challenge so the page still renders.
  const content = getProblemContent(problem.id);

  return {
    id: problem.id,
    title: problem.title,
    vulnerability: content?.vulnerability ?? problem.vulnerability,
    difficulty: "Easy",
    status: "available",
    description: content?.shortDescription ?? problem.description,
    scenario: content?.scenario ?? problem.description,
    vulnerableAppTitle: content?.vulnerableAppTitle ?? problem.targetEndpoint,
    targetEndpoint: problem.targetEndpoint,
    // Prefer the localized JP hints over whatever the API ships (the
    // orchestrator currently returns English hints). Falls back to the
    // API value if no frontend content is registered.
    hints: content?.hints ?? problem.hints,
    initialCode: problem.initialCode,
    attackPayload: content?.attackPayload ?? "",
    attackSuccessMessage:
      content?.attackVerifiedMessage ?? "攻撃が成功しました",
    patchOptions: content?.patchOptions ?? [],
    explanation: content?.explanation ?? problem.description,
    learnSummary: content?.learnSummary,
    attackGoal: content?.attackGoal,
    causeSummary: content?.causeSummary,
    attackVerifiedMessage: content?.attackVerifiedMessage,
    attackVerifyDisclaimer: content?.attackVerifyDisclaimer,
    defenseSuccessFlavor: content?.defenseSuccessFlavor,
    defenseFailureFlavor: content?.defenseFailureFlavor,
    previewKind: content?.previewKind,
    liveViewMode: content?.liveViewMode,
    stepCopy: content?.stepCopy,
    progress: content?.progress,
  };
}

function formatErrorDetail(responseText: string) {
  if (!responseText.trim()) {
    return "";
  }

  try {
    const parsed = JSON.parse(responseText) as {
      error?: string;
      message?: string;
    };
    const message = parsed.message ?? parsed.error;

    return message ? `: ${message}` : `: ${responseText}`;
  } catch {
    return `: ${responseText}`;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
