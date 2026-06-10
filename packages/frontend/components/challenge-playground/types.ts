import type { QuestUiStatus } from "@/components/NextActionCard";
import type {
  Challenge,
  PatchOption,
  PreviewServerStatus,
  VerifyResult,
} from "@/lib/challengeTypes";
import type {
  DifficultyMode,
  DifficultySettings,
} from "@/lib/difficultyConfig";

export type AttackState = "idle" | "running" | "success" | "failure";
export type DefenseState = "idle" | "checking" | "success" | "failure" | "error";
export type PreviewApplyState = "idle" | "applying" | "applied" | "error";

export type PlaygroundModel = {
  challenge: Challenge;
  mode: DifficultyMode;
  availableModes: DifficultyMode[];
  difficulty: DifficultySettings;
  scoreCap: number;
  attackState: AttackState;
  codeReviewed: boolean;
  defenseState: DefenseState;
  selectedPatchId: string | null;
  editorCode: string;
  verifyResult: VerifyResult | null;
  verifyError: string | null;
  loadingStep: string | null;
  score: number;
  previewReloadKey: number;
  previewReloading: boolean;
  previewAutoTestNonce: number;
  previewStatus: PreviewServerStatus;
  previewApplyState: PreviewApplyState;
  previewApplyError: string | null;
  hintsRevealed: number;
  selectedPatch?: PatchOption;
  hasAttacked: boolean;
  isEditorMode: boolean;
  hasEditedCode: boolean;
  hasSelectedPatch: boolean;
  canSelectPatch: boolean;
  canRetest: boolean;
  uiStatus: QuestUiStatus;
  currentStep: number;
  completedSteps: number[];
  visibleHints: string[];
  retestDisabledReason: string | null;
  showLivePreview: boolean;
  liveViewMode: Challenge["liveViewMode"];
  selectedPatchTitle?: string;
};

export type PlaygroundActions = {
  handleModeChange: (next: DifficultyMode) => void;
  handleRunAttack: () => void;
  handleProceedToStep2: () => void;
  handleConfirmCodeReviewed: () => void;
  handleSelectPatch: (patchId: string) => void;
  handleEditorChange: (next: string) => void;
  handleTryAnotherPatch: () => void;
  handleBackToEditor: () => void;
  handleResetMission: () => void;
  handleRevealHint: () => void;
  handlePreviewApply: () => void;
  handleSubmitPatch: () => void;
};

export type PlaygroundState = {
  model: PlaygroundModel;
  actions: PlaygroundActions;
};
