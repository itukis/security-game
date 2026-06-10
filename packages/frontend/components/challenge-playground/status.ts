import type { QuestUiStatus } from "@/components/NextActionCard";
import type { AttackState, DefenseState } from "./types";

export function getQuestUiStatus({
  attackState,
  codeReviewed,
  defenseState,
  hasSelectedPatch,
}: {
  attackState: AttackState;
  codeReviewed: boolean;
  defenseState: DefenseState;
  hasSelectedPatch: boolean;
}): QuestUiStatus {
  if (defenseState === "checking") return "verifying";
  if (defenseState === "success") return "passed";
  if (defenseState === "failure" || defenseState === "error") return "failed";
  if (hasSelectedPatch) return "patchSelected";
  if (codeReviewed) return "codeReviewed";
  if (attackState === "success") return "attacked";
  return "idle";
}

export function getCurrentStep(status: QuestUiStatus, step1Confirmed: boolean) {
  if (status === "idle") return 1;
  if (status === "attacked") return step1Confirmed ? 2 : 1;
  if (status === "codeReviewed" || status === "patchSelected") return 3;
  return 4;
}

export function getCompletedSteps({
  attackState,
  codeReviewed,
  defenseState,
  hasSelectedPatch,
}: {
  attackState: AttackState;
  codeReviewed: boolean;
  defenseState: DefenseState;
  hasSelectedPatch: boolean;
}) {
  const completedSteps: number[] = [];

  if (attackState === "success") completedSteps.push(1);
  if (codeReviewed) completedSteps.push(2);
  if (hasSelectedPatch) completedSteps.push(3);
  if (defenseState === "success" || defenseState === "failure") {
    completedSteps.push(4);
  }

  return completedSteps;
}

export function getStatusLabel(status: QuestUiStatus) {
  const labels: Record<QuestUiStatus, string> = {
    idle: "未開始",
    attacked: "攻撃済み",
    codeReviewed: "原因確認済み",
    patchSelected: "修正案選択済み",
    verifying: "検証中",
    passed: "防御成功",
    failed: "防御失敗",
  };

  return labels[status];
}

export function getNextActionLabel(status: QuestUiStatus) {
  const labels: Record<QuestUiStatus, string> = {
    idle: "攻撃テストを実行",
    attacked: "原因コードを確認する",
    codeReviewed: "修正案を選択",
    patchSelected: "修正後に再テストする",
    verifying: "検証完了を待つ",
    passed: "結果と解説を確認",
    failed: "別の修正案を試す",
  };

  return labels[status];
}

export function getResultSummary(defenseState: DefenseState) {
  if (defenseState === "success") return "防御成功";
  if (defenseState === "failure") return "防御失敗";
  if (defenseState === "error") return "APIエラー";
  if (defenseState === "checking") return "検証中";
  return "修正案選択後に実行";
}
