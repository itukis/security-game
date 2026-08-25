export type VulnerabilityType =
  | "SQL Injection"
  | "XSS"
  | "Authentication Bypass"
  | "Path Traversal"
  | "Command Injection"
  | "CSRF"
  | "Information Exposure"
  | "Open Redirect"
  | "Insecure File Upload"
  | "Composite Review";

export type Difficulty = "Easy" | "Medium" | "Hard";
export type ChallengeStatus = "available" | "locked" | "coming-soon";

export type PatchOption = {
  id: string;
  title: string;
  description: string;
  patch: string;
  isCorrect: boolean;
};

// Shape returned by the real orchestrator for attackBefore / attackAfter
// when USE_MOCK=false. The mock path still returns plain strings, so we
// keep the wider `VerifyValue` union for backwards compatibility.
export type AttackOutcome = {
  vulnerability?: string;
  exploited?: boolean;
  payload?: string | null;
  evidence?: string;
  durationMs?: number;
};

export type VerifyValue = string | boolean | number | AttackOutcome | null;

export type SubmissionRecording = {
  recorded: boolean;
  firstClear: boolean;
  score: number | null;
};

export type ProblemResponse = {
  id: string;
  title: string;
  description: string;
  vulnerability: VulnerabilityType;
  targetEndpoint: string;
  hints: string[];
  initialCode: string;
};

export type VerifyResult = {
  attackBefore: VerifyValue;
  attackAfter: VerifyValue;
  passed: boolean;
  // Present only for an authenticated verification. Supabase persistence is
  // performed by the orchestrator after the live attack succeeds; the browser
  // never writes an authoritative score directly.
  recording?: SubmissionRecording;
};

export type PreviewServerStatus =
  | "baseline"
  | "applied"
  | "verified"
  | "reset";

// Which mock UI to render in the Step 1 preview pane. Each kind has a
// matching <VulnerableAppPreview> rendering.
export type PreviewKind =
  | "login"
  | "comments"
  | "profile"
  | "download"
  | "ping"
  | "transfer"
  | "dashboard"
  | "redirect"
  | "upload"
  | "supportPortal"
  | "accountWorkflow"
  | "fileWorkbench";

// How to render the "live app" panel next to the editor in editPreview
// mode. Problems with a real HTML route (xss-comments → GET /comments)
// can use an <iframe>; the others only have JSON endpoints where an
// iframe would just show raw JSON, so we use the interactive
// VulnerableAppPreview form instead.
export type LiveViewMode = "iframe" | "interactive";

// Per-step UI copy. All vulnerability-specific text the UI used to
// hard-code now lives on the Challenge through these fields.
export type StepCopy = {
  step1Description: string;
  step2Description: string;
  step3Description: string;
  step4Description: string;
  focusBoxTitle: string;
  focusBoxBody: string;
  nextActionAttacked: string;
  nextActionCodeReviewed: string;
  stepperStep2Subtitle: string;
};

export type ProgressCopy = {
  attackedSummary: string;
};

// Group of presentation fields that come from per-problem static content
// (lib/problemContent.ts), not from the API. All optional on Challenge so
// older code paths keep working.
export type ProblemPresentation = {
  learnSummary?: string;
  attackGoal?: string;
  causeSummary?: string;
  attackVerifiedMessage?: string;
  attackVerifyDisclaimer?: string;
  defenseSuccessFlavor?: string;
  defenseFailureFlavor?: string;
  previewKind?: PreviewKind;
  liveViewMode?: LiveViewMode;
  stepCopy?: StepCopy;
  progress?: ProgressCopy;
  explanation: string;
};

export type Challenge = ProblemPresentation & {
  id: string;
  title: string;
  vulnerability: VulnerabilityType;
  difficulty: Difficulty;
  status: ChallengeStatus;
  description: string;
  scenario: string;
  vulnerableAppTitle: string;
  targetEndpoint: string;
  hints: string[];
  initialCode: string;
  attackPayload: string;
  attackSuccessMessage: string;
  patchOptions: PatchOption[];
  // `explanation` is required for backwards-compatibility with the
  // existing ResultPanel contract. ProblemPresentation re-declares it
  // so per-problem content can populate it explicitly.
};

export type ChallengeCardData = Pick<
  Challenge,
  | "id"
  | "title"
  | "vulnerability"
  | "difficulty"
  | "status"
  | "description"
  | "learnSummary"
>;

export type AttackResult = {
  challengeId: string;
  success: boolean;
  payload: string;
  message: string;
};
