import type { CoachFacts } from '../../src/core/coach.js';

export interface CoachEnvironment {
  COACH_ENABLED?: string;
  COACH_ALLOWED_ORIGINS?: string;
  COACH_MODEL?: string;
  COACH_API_KEY?: string;
}
export type CoachProvider = (
  facts: CoachFacts, env: CoachEnvironment, signal: AbortSignal,
) => Promise<unknown>;
