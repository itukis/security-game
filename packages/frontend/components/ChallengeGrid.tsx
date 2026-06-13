"use client";

import { useEffect, useState } from "react";
import { ChallengeCard } from "@/components/ChallengeCard";
import { getMyCompletions } from "@/lib/api/challenges";
import type { Challenge } from "@/lib/challengeTypes";

export function ChallengeGrid({ challenges }: { challenges: Challenge[] }) {
  const [completions, setCompletions] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    getMyCompletions().then(setCompletions);
  }, []);

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {challenges.map((challenge) => (
        <ChallengeCard
          key={challenge.id}
          challenge={challenge}
          clearedScore={completions?.[challenge.id]}
        />
      ))}
    </div>
  );
}
