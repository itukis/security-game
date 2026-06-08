export type DifficultyMode = "select" | "editPreview" | "editOnly";

export interface DifficultySettings {
  patchInput: "options" | "editor";
  showSite: boolean;
  hints: "all" | "onDemand" | "none";
  scoreCap: number;
}

export const DIFFICULTY: Record<DifficultyMode, DifficultySettings> = {
  select: { patchInput: "options", showSite: true, hints: "all", scoreCap: 60 },
  editPreview: {
    patchInput: "editor",
    showSite: true,
    hints: "onDemand",
    scoreCap: 85,
  },
  editOnly: {
    patchInput: "editor",
    showSite: false,
    hints: "none",
    scoreCap: 100,
  },
};

export const DIFFICULTY_LABELS: Record<DifficultyMode, string> = {
  select: "選択式",
  editPreview: "コード+プレビュー",
  editOnly: "コードのみ",
};
