import type { Challenge } from "@/lib/challengeTypes";
import { problemContent, problemOrder } from "@/lib/problemContent";

function buildMockChallenge(id: keyof typeof problemContent): Challenge {
  const content = problemContent[id];

  return {
    id: content.id,
    title: content.title,
    vulnerability: content.vulnerability,
    difficulty: "Easy",
    status: "available",
    description: content.shortDescription,
    scenario: content.scenario,
    vulnerableAppTitle: content.vulnerableAppTitle,
    targetEndpoint: content.targetEndpoint,
    hints: content.hints,
    initialCode: content.initialCode,
    attackPayload: content.attackPayload,
    attackSuccessMessage: content.attackVerifiedMessage ?? "攻撃が成功しました",
    patchOptions: content.patchOptions,
    explanation: content.explanation,
    learnSummary: content.learnSummary,
    attackGoal: content.attackGoal,
    causeSummary: content.causeSummary,
    attackVerifiedMessage: content.attackVerifiedMessage,
    attackVerifyDisclaimer: content.attackVerifyDisclaimer,
    defenseSuccessFlavor: content.defenseSuccessFlavor,
    defenseFailureFlavor: content.defenseFailureFlavor,
    previewKind: content.previewKind,
    liveViewMode: content.liveViewMode,
    stepCopy: content.stepCopy,
    progress: content.progress,
  };
}

export const mockChallenges: Challenge[] = problemOrder.map(buildMockChallenge);
