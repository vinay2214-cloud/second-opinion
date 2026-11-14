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

/** Where a provider step threw. Fixed names only. */
export const COACH_STAGES = ['build_url', 'build_headers', 'build_body', 'fetch', 'read_body'] as const;
export type CoachStage = (typeof COACH_STAGES)[number];

/** Filled in by the provider so the Worker can log why there was no text. */
export interface CoachTrace {
  /** Numeric HTTP status of the provider response, if one arrived. */
  upstream?: number;
  reason?: CoachReason;
  /** The step that threw, if one did. */
  stage?: CoachStage;
  /** Constructor name of what was thrown (TypeError, DOMException). Never its message or stack. */
  err?: string;
}
export type CoachProvider = (
  facts: CoachFacts, env: CoachEnvironment, signal: AbortSignal, trace?: CoachTrace,
) => Promise<unknown>;
