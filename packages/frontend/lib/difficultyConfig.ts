export type DifficultyMode = "editPreview" | "editOnly";

export interface DifficultySettings {
  patchInput: "editor";
  showSite: boolean;
  hints: "all" | "onDemand" | "none";
  scoreCap: number;
  scoreMode: DifficultyMode;
}

export const DIFFICULTY: Record<DifficultyMode, DifficultySettings> = {
  editPreview: {
    patchInput: "editor",
    showSite: true,
    hints: "onDemand",
    scoreCap: 200,
    scoreMode: "editPreview",
  },
  editOnly: {
    patchInput: "editor",
    showSite: false,
    hints: "none",
    scoreCap: 2500,
    scoreMode: "editOnly",
  },
};

export const DIFFICULTY_LABELS: Record<DifficultyMode, string> = {
  editPreview: "コード+プレビュー",
  editOnly: "コードのみ",
};
