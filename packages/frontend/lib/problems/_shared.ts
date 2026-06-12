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
    throw new Error(`wrongPatch: source string not found in initial code`);
  }
  return makePatch("src/server.js", initial, initial.replace(find, replace));
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
  for (const [find, replace] of replacements) {
    if (!modified.includes(find)) {
      throw new Error(`solutionPatch: source string not found in code`);
    }
    modified = modified.replace(find, replace);
  }
  return makePatch("src/server.js", initial, modified);
}
