import type {
  Challenge,
  ProblemResponse,
  VerifyResult,
} from "@/lib/challengeTypes";
import { applyPatch as applyUnifiedPatch } from "diff";
import { mockChallenges } from "@/lib/mockChallenges";
import { problemOrder, type ProblemId } from "@/lib/problemContent";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { DifficultyMode } from "@/lib/difficultyConfig";

// Default static-only set when NEXT_PUBLIC_DOCKER_PROBLEM_IDS is unset.
// These two problems have no vulnerable-apps container and are not in the
// orchestrator's PROBLEMS map — they MUST be verified statically.
const DEFAULT_STATIC_ONLY_PROBLEM_IDS = new Set<ProblemId>([
  "path-traversal-files",
  "cmd-injection-ping",
]);

// Optional whitelist of problem IDs that are backed by real Docker containers.
// When set (e.g. low-memory VM that only runs the 3 composite review problems),
// every other problem ID falls back to verifyMockPatch / staticPatchPasses so
// the orchestrator can run with a reduced container fleet.
// Format: comma-separated, e.g. "review-support-portal,review-account-workflow"
const DOCKER_PROBLEM_IDS: ReadonlySet<string> | null = (() => {
  const raw = process.env.NEXT_PUBLIC_DOCKER_PROBLEM_IDS;
  if (!raw) return null;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? new Set(ids) : null;
})();

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:4000";
const SERVER_ORCHESTRATOR_URL =
  process.env.ORCHESTRATOR_URL?.replace(/\/$/, "") ??
  "http://localhost:4000";
// Default to the real orchestrator. Set NEXT_PUBLIC_USE_MOCK=true to opt
// back into the mockChallenges-only path (used for offline demos and tests).
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

function apiUrl(path: string): string {
  if (typeof window === "undefined" && API_BASE_URL.startsWith("/")) {
    return `${SERVER_ORCHESTRATOR_URL}${path}`;
  }
  return `${API_BASE_URL}${path}`;
}

async function authHeader(): Promise<Record<string, string>> {
  if (typeof window === "undefined" || !isSupabaseConfigured) return {};
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export async function getProblems(): Promise<Challenge[]> {
  // The orchestrator has no list endpoint and its per-problem payload only
  // adds a live initialCode read that the card UI does not consume. Build the
  // list from the frontend-defined content so every problem in problemOrder
  // shows up regardless of whether the orchestrator is reachable.
  return problemOrder
    .map((id) => getStaticChallenge(id))
    .filter((c): c is Challenge => Boolean(c));
}

export async function getProblem(id: string): Promise<Challenge | undefined> {
  const fallback = getStaticChallenge(id);
  if (isStaticOnlyProblem(id)) {
    return fallback;
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(`/problems/${id}`), {
      cache: "no-store",
    });
  } catch {
    return fallback;
  }

  if (!response.ok) {
    return fallback;
  }

  try {
    const problem = (await response.json()) as ProblemResponse;
    return mapProblemToChallenge(id, problem) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function verifyPatch(
  id: string,
  patch: string,
  mode: DifficultyMode = "editPreview",
): Promise<VerifyResult> {
  if (isStaticOnlyProblem(id)) {
    return verifyMockPatch(id, patch);
  }

  const response = await fetch(apiUrl(`/problems/${id}/verify`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify({ patch, mode }),
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
  if (isStaticOnlyProblem(id)) return;

  try {
    const response = await fetch(apiUrl(`/problems/${id}/reset`), {
      method: "POST",
      headers: { ...(await authHeader()) },
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
  if (isStaticOnlyProblem(id)) {
    return { applied: true };
  }

  const response = await fetch(apiUrl(`/problems/${id}/preview`), {
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
  const patchedCode =
    challenge?.initialCode === undefined
      ? false
      : applyUnifiedPatch(ensureTrailingNewline(challenge.initialCode), patch);
  const passed =
    Boolean(selectedPatch?.isCorrect) ||
    (typeof patchedCode === "string" && staticPatchPasses(id, patchedCode));

  return {
    attackBefore: `攻撃成功: ${challenge?.attackVerifiedMessage ?? "脆弱性が刺さった疑似結果"}`,
    attackAfter: passed
      ? `防御成功: ${challenge?.defenseSuccessFlavor ?? "パッチ適用後の疑似攻撃を防ぎました。"}`
      : `防御失敗: ${challenge?.defenseFailureFlavor ?? "パッチ適用後も脆弱性の原因が残っています。"}`,
    passed,
  };
}

function ensureTrailingNewline(value: string) {
  return value.endsWith("\n") ? value : `${value}\n`;
}

function staticPatchPasses(id: string, code: string): boolean {
  const hasPreparedSql =
    /WHERE\s+(?:username|email)\s*=\s*\?\s+AND\s+(?:password)\s*=\s*\?/i.test(code) &&
    /\.(?:get|all)\([^)]*(?:username|email)[^)]*password[^)]*\)/.test(code);
  const hasHtmlEscape =
    /function\s+escapeHtml/.test(code) &&
    /escapeHtml\([^)]*(?:author|c\.author|comment\.author)/.test(code) &&
    /escapeHtml\([^)]*(?:text|body|c\.text|comment\.body)/.test(code);
  const hasAuthz =
    /req\.userId\s*!==\s*req\.params\.id/.test(code) &&
    /status\(403\)/.test(code);
  const hasPathGuard =
    /path\.resolve/.test(code) &&
    /startsWith\([^)]*path\.sep/.test(code) &&
    /status\(400\)/.test(code);
  const hasExecFile =
    /\bexecFile\s*\(/.test(code) &&
    !/\bexec\s*\(\s*`/.test(code) &&
    /\^\[a-zA-Z0-9/.test(code);
  const hasCsrf =
    /csrfTokens/.test(code) &&
    /x-csrf-token/.test(code) &&
    /csrfTokens\.has/.test(code) &&
    /status\(403\)/.test(code);
  const hidesSecret =
    !/const\s+API_KEY\s*=/.test(code) &&
    !/const\s+ADMIN_API_KEY\s*= '\$\{ADMIN_API_KEY\}'/.test(code) &&
    !/sk-review-admin[^']*['"]/.test(extractHtmlScriptArea(code));
  const hasRedirectGuard =
    /startsWith\('\/'\)/.test(code) &&
    /startsWith\('\/\/'\)/.test(code) &&
    /status\(400\)/.test(code);
  const hasUploadGuard =
    /ALLOWED_EXTS|allowedExt/i.test(code) &&
    /fileFilter/.test(code) &&
    /path\.basename/.test(code) &&
    /replace\(\s*\/\[\^A-Za-z0-9\._-\]\//.test(code);

  const checks: Record<string, boolean> = {
    "sqli-login": hasPreparedSql,
    "xss-comments": hasHtmlEscape,
    "idor-profile": hasAuthz,
    "path-traversal-files": hasPathGuard,
    "cmd-injection-ping": hasExecFile,
    "csrf-transfer": hasCsrf,
    "hardcoded-secrets": hidesSecret && /data-proxy/.test(code),
    "open-redirect": hasRedirectGuard,
    "file-upload": hasUploadGuard,
    "review-support-portal": hasPreparedSql && hasHtmlEscape && hasRedirectGuard,
    "review-account-workflow": hasAuthz && hasCsrf && hidesSecret,
    "review-file-workbench": hasPathGuard && hasExecFile && hasUploadGuard,
  };

  return Boolean(checks[id]);
}

function extractHtmlScriptArea(code: string) {
  const start = code.indexOf("res.send(`<!doctype html>");
  if (start === -1) return "";
  const end = code.indexOf("`);", start);
  return end === -1 ? code.slice(start) : code.slice(start, end);
}

function getStaticChallenge(id: string): Challenge | undefined {
  return mockChallenges.find((challenge) => challenge.id === id);
}

function isStaticOnlyProblem(id: string): boolean {
  if (USE_MOCK) return true;
  if (DEFAULT_STATIC_ONLY_PROBLEM_IDS.has(id as ProblemId)) return true;
  // Explicit Docker whitelist wins: only IDs in the env-configured set go
  // through the orchestrator; everything else is forced through verifyMockPatch.
  if (DOCKER_PROBLEM_IDS) {
    return !DOCKER_PROBLEM_IDS.has(id);
  }
  return false;
}

// UI-facing predicate: true when this problem reaches the orchestrator at
// runtime (i.e. has a live container backing it). Used to gate live-preview
// affordances that only make sense for Docker-backed problems.
export function isDockerBackedProblem(id: string): boolean {
  return !isStaticOnlyProblem(id);
}

function mapProblemToChallenge(
  requestedId: string,
  problem: ProblemResponse,
): Challenge | undefined {
  // Look up the frontend-defined content by the REQUESTED id, not the API
  // response's id. The orchestrator owns only the live initialCode read; all
  // presentation copy (scenario / stepCopy / patchOptions / hints / flavor)
  // lives in problemContent and is keyed off the URL param.
  const staticChallenge = getStaticChallenge(requestedId);
  if (!staticChallenge) return undefined;
  return {
    ...staticChallenge,
    initialCode: problem.initialCode,
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

export async function recordCompletion(
  id: string,
  score: number,
  patch: string,
): Promise<void> {
  // Record submissions for both Docker-backed and static-only problems —
  // the user still cleared the challenge regardless of how it was verified.
  if (!isSupabaseConfigured) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  try {
    // Atomic GREATEST upsert: score only moves upward; patch is kept from the
    // highest-scoring run. Uses a SECURITY DEFINER RPC so no extra RLS policies
    // are needed on completed_problems for INSERT/UPDATE.
    const { error: upsertError } = await supabase.rpc("upsert_completion", {
      p_user_id: session.user.id,
      p_problem_id: id,
      p_score: score,
      p_patch: patch,
    });
    if (upsertError) {
      console.warn("[recordCompletion] upsert_completion:", upsertError.message);
    }

    const { error: insertError } = await supabase
      .from("submission_history")
      .insert({
        user_id: session.user.id,
        problem_id: id,
        passed: true,
        patch,
      });
    if (insertError) {
      console.warn("[recordCompletion] submission_history insert:", insertError.message);
    }
  } catch (err) {
    console.warn("[recordCompletion] unexpected error:", err);
  }
}

export async function getMyCompletions(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured) return {};

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return {};

  try {
    const { data } = await supabase
      .from("completed_problems")
      .select("problem_id, score")
      .eq("user_id", session.user.id);

    if (!data) return {};
    const result: Record<string, number> = {};
    for (const row of data) {
      result[row.problem_id as string] = row.score as number;
    }
    return result;
  } catch {
    return {};
  }
}
