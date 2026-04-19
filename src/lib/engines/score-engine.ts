import type { ScoreEventType, ScoreBand } from '@/types/database';
import { DEFAULT_SCORE_POINTS, SCORE_BANDS } from '@/lib/utils/constants';

/**
 * Get the default points for a score event type.
 */
export function getDefaultPoints(eventType: ScoreEventType): number {
  return DEFAULT_SCORE_POINTS[eventType] ?? 0;
}

/**
 * Calculate the score band from a total score value.
 */
export function calculateScoreBand(totalScore: number): ScoreBand {
  for (const { band, min, max } of SCORE_BANDS) {
    if (totalScore >= min && totalScore <= max) {
      return band;
    }
  }
  return 'cold';
}

/**
 * Calculate the total score from an array of score events.
 */
export function calculateTotalScore(
  events: Array<{ event_type: ScoreEventType; points: number }>
): { score: number; band: ScoreBand } {
  const score = events.reduce((sum, e) => sum + e.points, 0);
  const band = calculateScoreBand(score);
  return { score, band };
}

/**
 * Determine if a lead is "ready for qualified" based on score and stage.
 */
export function isReadyForQualified(score: number, stage: string): boolean {
  return score >= 50 && ['conversing', 'proposal'].includes(stage);
}

/**
 * Determine if a lead is "ready for purchase" based on score and stage.
 */
export function isReadyForPurchase(score: number, stage: string): boolean {
  return score >= 80 && stage === 'qualified';
}
