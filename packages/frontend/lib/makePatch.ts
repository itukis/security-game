import { createTwoFilesPatch } from "diff";

// Single source of truth for browser-side unified-diff generation.
// The orchestrator runs `git apply` (default -p1) inside the container, so
// paths must include an a/ b/ prefix — bare paths get stripped down to
// just the basename and the apply fails.
//
// jsdiff's createTwoFilesPatch emits an `Index: ...` line and a row of "="
// before the --- / +++ headers. git apply ignores them, but we strip them
// so the on-wire diff stays close to the on-disk solution.patch files.

function ensureTrailingNewline(s: string): string {
  return s.endsWith("\n") ? s : s + "\n";
}

export function makePatch(
  filePath: string,
  original: string,
  modified: string,
): string {
  const oldStr = ensureTrailingNewline(original);
  const newStr = ensureTrailingNewline(modified);
  const raw = createTwoFilesPatch(
    `a/${filePath}`,
    `b/${filePath}`,
    oldStr,
    newStr,
    "",
    "",
    { context: 3 },
  );
  return raw.replace(/^Index:[^\n]*\n=+\n?/, "").replace(/^=+\n/, "");
}
