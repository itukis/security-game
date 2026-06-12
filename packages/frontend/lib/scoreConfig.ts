export const SCORE_CONFIG = {
  base: 100,
  hintPenalty: 10,
  floor: 10,
  speedBonus: {
    enabled: false,
    maxBonus: 10,
    fastThresholdMs: 60_000,
  },
} as const;

export function computeScore(input: {
  hintsUsed: number;
  durationMs?: number;
}): number {
  const { base, hintPenalty, floor, speedBonus } = SCORE_CONFIG;

  let raw = base - input.hintsUsed * hintPenalty;

  if (
    speedBonus.enabled &&
    input.durationMs !== undefined &&
    input.durationMs < speedBonus.fastThresholdMs
  ) {
    const ratio = 1 - input.durationMs / speedBonus.fastThresholdMs;
    raw += Math.round(ratio * speedBonus.maxBonus);
  }

  return Math.max(floor, Math.min(base, raw));
}
