import type { CoachFacts } from '../../src/core/coach.js';

export interface CoachEnvironment {
  COACH_ENABLED?: string;
  COACH_ALLOWED_ORIGINS?: string;
  COACH_MODEL?: string;
  COACH_API_KEY?: string;
}

/** The only strings the Worker ever logs. Fixed codes: never request, key or model data. */
export const COACH_REASONS = [
  'ok', 'preflight', 'disabled', 'bad_origin', 'bad_request', 'body_too_large', 'bad_json', 'bad_facts',
  'rate_limited', 'not_configured', 'upstream_timeout', 'upstream_http', 'upstream_truncated',
  'upstream_empty', 'text_rejected', 'fallback',
] as const;
export type CoachReason = (typeof COACH_REASONS)[number];

/** Filled in by the provider so the Worker can log why there was no text. */
export interface CoachTrace {
  /** Numeric HTTP status of the provider response, if one arrived. */
  upstream?: number;
  reason?: CoachReason;
}
export type CoachProvider = (
  facts: CoachFacts, env: CoachEnvironment, signal: AbortSignal, trace?: CoachTrace,
) => Promise<unknown>;
