/**
 * TypeScript types matching the SecureCodeArena orchestrator API.
 * Copy this file into your frontend project.
 *
 * Base URL: http://localhost:4000
 */

/** Supported vulnerability categories.
 *  Shipped problems: 'sqli' (sqli-login), 'xss' (xss-comments),
 *  'auth-bypass' (idor-profile). */
export type Vulnerability = 'sqli' | 'xss' | 'auth-bypass';

/**
 * Problem metadata + source code.
 * Source: GET /problems/:id
 */
export interface Problem {
  id: string;
  title: string;
  vulnerability: Vulnerability;
  description: string;
  targetEndpoint: string;
  hints: string[];
  /** The initial vulnerable source code (contents of src/server.js) */
  initialCode: string;
}

/**
 * Result of running an attack against a vulnerable app.
 * Returned as part of VerifyResponse.
 */
export interface AttackResult {
  vulnerability: Vulnerability;
  /** true if the attack succeeded (vulnerability was exploited) */
  exploited: boolean;
  /** The payload that worked, or null if none did */
  payload: string | null;
  /** Human-readable description of what happened */
  evidence: string;
  /** Wall-clock time for the attack run in milliseconds */
  durationMs: number;
}

/**
 * One added line from a unified diff, paired with the removed line it
 * replaces (if any). Used by the frontend to highlight what changed.
 */
export interface AppliedPatchHunk {
  file: string;
  /** Line number in the new (post-patch) file */
  lineNumber: number;
  /** The line that was removed in this swap, or empty for pure insertions */
  before: string;
  /** The added line content. Truncated to 200 chars by the server. */
  after: string;
}

export interface AppliedPatchSummary {
  filesChanged: string[];
  linesAdded: number;
  linesRemoved: number;
  /** At most 5 hunks. */
  hunks: AppliedPatchHunk[];
}

/** Scoring side-effect of an authenticated submission. */
export interface SubmissionRecording {
  firstClear: boolean;
  score: number | null;
}

/**
 * Response from the verify endpoint.
 * Source: POST /problems/:id/verify
 */
export interface VerifyResponse {
  /** Attack result against the unpatched baseline (should be exploited: true) */
  attackBefore: AttackResult;
  /** Attack result after applying the user's patch */
  attackAfter: AttackResult;
  /** true if attackBefore.exploited && !attackAfter.exploited */
  passed: boolean;
  /** Present only when the request is authenticated. */
  recording?: SubmissionRecording;
  /** Present only when the request is authenticated. */
  appliedPatchSummary?: AppliedPatchSummary;
}

/**
 * Error response shape (4xx / 5xx).
 */
export interface ApiError {
  error: string;
}
