"use client";

import { ChallengePlaygroundView } from "@/components/challenge-playground/ChallengePlaygroundView";
import { useChallengePlaygroundState } from "@/components/challenge-playground/useChallengePlaygroundState";
import type { Challenge } from "@/lib/challengeTypes";

export function ChallengePlayground({ challenge }: { challenge: Challenge }) {
  const state = useChallengePlaygroundState(challenge);
  return <ChallengePlaygroundView state={state} />;
}
