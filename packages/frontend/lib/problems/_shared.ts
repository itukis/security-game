import type {
  Difficulty,
  PatchOption,
  ProblemPresentation,
  VulnerabilityType,
} from "@/lib/challengeTypes";
import { makePatch } from "@/lib/makePatch";

export type ProblemId =
  | "sqli-login"
  | "xss-comments"
  | "idor-profile"
  | "path-traversal-files"
  | "cmd-injection-ping"
  | "csrf-transfer"
  | "hardcoded-secrets"
  | "open-redirect"
  | "file-upload"
  | "review-support-portal"
  | "review-account-workflow"
  | "review-file-workbench";

export type ProblemContent = ProblemPresentation & {
  id: ProblemId;
  vulnerability: VulnerabilityType;
  difficulty?: Difficulty;
  title: string;
  shortDescription: string;
  scenario: string;
  vulnerableAppTitle: string;
  targetEndpoint: string;
  hints: string[];
  initialCode: string;
  attackPayload: string;
  patchOptions: PatchOption[];
};

// Every vulnerable-app exposes its mutable entrypoint at this path. The
// orchestrator's PROBLEMS map (see packages/orchestrator/src/applyPatch.js)
// hard-codes the same value as `patchTarget`, and `git apply --include=` runs
// against it. Centralizing here makes the contract visible and changeable in
// one spot if that ever needs to vary per problem.
const PATCH_TARGET = "src/server.js";

function previewFind(find: string): string {
  const trimmed = find.replace(/\s+/g, " ").trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
}

// Build a wrong-option unified diff from initial code + a single replacement.
// The hand-written `@@`-only hunks that this replaces failed `git apply --check`
// in the orchestrator, so the user got a "通信エラー" toast instead of the
// intended "防御失敗" result for wrong picks.
export function wrongPatch(
  initial: string,
  find: string,
  replace: string,
): string {
  if (!initial.includes(find)) {
    throw new Error(
      `wrongPatch: source string not found in initial code: "${previewFind(find)}"`,
    );
  }
  return makePatch(PATCH_TARGET, initial, initial.replace(find, replace));
}

// Same machinery as wrongPatch but for the correct option, supporting multiple
// sequential replacements when the fix touches more than one region. Goes
// through makePatch so the resulting unified diff applies cleanly under
// `git apply --check` — hand-written hunks surfaced as NetworkError on Step 4.
export function solutionPatch(
  initial: string,
  ...replacements: Array<[string, string]>
): string {
  let modified = initial;
  for (let i = 0; i < replacements.length; i++) {
    const [find, replace] = replacements[i];
    if (!modified.includes(find)) {
      throw new Error(
        `solutionPatch: replacement[${i}] source not found in code: "${previewFind(find)}"`,
      );
    }
    modified = modified.replace(find, replace);
  }
  return makePatch(PATCH_TARGET, initial, modified);
}
