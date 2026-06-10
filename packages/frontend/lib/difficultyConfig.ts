import type { Difficulty } from "@/lib/challengeTypes";

export type DifficultyMode = "multipleChoice" | "editPreview" | "editOnly";

export interface DifficultySettings {
  patchInput: "selector" | "editor";
  showSite: boolean;
  hints: "all" | "onDemand" | "none";
  scoreMode: DifficultyMode;
}

export const DIFFICULTY: Record<DifficultyMode, DifficultySettings> = {
  multipleChoice: {
    patchInput: "selector",
    showSite: false,
    hints: "all",
    scoreMode: "multipleChoice",
  },
  editPreview: {
    patchInput: "editor",
    showSite: true,
    hints: "onDemand",
    scoreMode: "editPreview",
  },
  editOnly: {
    patchInput: "editor",
    showSite: false,
    hints: "none",
    scoreMode: "editOnly",
  },
};

export const DIFFICULTY_LABELS: Record<DifficultyMode, string> = {
  multipleChoice: "選択肢",
  editPreview: "コード+プレビュー",
  editOnly: "コードのみ",
};

// Per-problem-difficulty score caps. Easy problems expose the multiple-choice
// mode (60pt); review/advanced problems only support the editor modes and use
// higher caps to reward the harder workflow.
const SCORE_CAPS: Record<Difficulty, Partial<Record<DifficultyMode, number>>> = {
  Easy: {
    multipleChoice: 60,
    editPreview: 80,
    editOnly: 100,
  },
  Medium: {
    editPreview: 200,
    editOnly: 250,
  },
  Hard: {
    editPreview: 200,
    editOnly: 250,
  },
};

export function getScoreCap(
  mode: DifficultyMode,
  problemDifficulty: Difficulty,
): number {
  return SCORE_CAPS[problemDifficulty]?.[mode] ?? 0;
}

export function getAvailableModes(
  problemDifficulty: Difficulty,
): DifficultyMode[] {
  if (problemDifficulty === "Easy") {
    return ["multipleChoice", "editPreview", "editOnly"];
  }
  return ["editPreview", "editOnly"];
}
