import { coachConfig as C } from '../../src/core/data.js';
import type { CoachFacts } from '../../src/core/coach.js';
import type { CoachProvider, CoachStage } from './types.js';

/** Separate for a credential-free contract test of the exact wire payload. */
export function geminiRequest(facts: CoachFacts) {
  return {
    systemInstruction: { parts: [{ text: C.system }] },
    contents: [{ role: 'user', parts: [{ text: JSON.stringify(facts) }] }],
    // Plain text only: no tools, no search grounding, no audio. Thought tokens count
    // against maxOutputTokens, so thinking is pinned to the lowest documented level
    // (GenerationConfig.thinkingConfig.thinkingLevel; Gemini 3 or later only).
    // No temperature, topP or topK: the Gemini 3.x guidance is to remove them from all requests.
    generationConfig: {
      maxOutputTokens: C.limits.maxOutputTokens,
      candidateCount: 1,
      thinkingConfig: { thinkingLevel: 'MINIMAL' },
    },
  };
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : undefined;
}

export function geminiText(value: unknown): string | undefined {
  const candidates = record(value)?.candidates;
  if (!Array.isArray(candidates)) return undefined;
  const candidate = record(candidates[0]);
  if (candidate?.finishReason !== 'STOP') return undefined;
  const safety = candidate.safetyRatings;
  if (Array.isArray(safety) && safety.some((rating) => record(rating)?.blocked === true)) return undefined;
  const parts = record(candidate.content)?.parts;
  if (!Array.isArray(parts)) return undefined;
  return parts.flatMap((part: unknown) => {
    const p = record(part);
    return p?.thought !== true && typeof p?.text === 'string' ? [p.text] : [];
  }).join('');
}

/** Printable ASCII with no whitespace, quotes, asterisks or angle brackets (masked or placeholder values). */
const KEY_USABLE = /^[\x21-\x7E]+$/;
const KEY_FORBIDDEN = /["'`*<>]/;

/** The key as it may be sent, or undefined. Surrounding whitespace is trimmed; anything odd inside is refused. */
export function usableKey(raw: string | undefined): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const key = raw.trim();
  return key !== '' && KEY_USABLE.test(key) && !KEY_FORBIDDEN.test(key) ? key : undefined;
}

/** Booleans about the trimmed key's shape, for the log. Nothing here reveals the key. */
export function keyShape(raw: string | undefined): { len: boolean; prefix: boolean; charset: boolean } {
  const key = typeof raw === 'string' ? raw.trim() : '';
  return { len: key.length === 39, prefix: key.startsWith('AIza'), charset: /^[A-Za-z0-9_-]+$/.test(key) };
}

/** Only the constructor name of a thrown value; never its message or stack. */
function errorName(thrown: unknown): string {
  const name = record(thrown)?.constructor?.name;
  return typeof name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(name) ? name : 'unknown';
}

/**
 * The only provider HTTP call. No credentials in URLs, logs, client code, or files.
 * Never throws: a step that fails records its stage and error class in `trace`.
 */
export const callGemini: CoachProvider = async (facts, env, signal, trace = {}) => {
  const model = env.COACH_MODEL?.trim().replace(/^models\//, '');
  const key = usableKey(env.COACH_API_KEY);
  if (!key || !model || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(model)) {
    trace.reason = 'not_configured';
    return undefined;
  }
  if (signal.aborted) return undefined;
  let stage: CoachStage = 'build_url';
  try {
    const url = new URL(
      'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent',
    );
    stage = 'build_headers';
    const headers = new Headers({ 'Content-Type': 'application/json', 'x-goog-api-key': key });
    stage = 'build_body';
    const body = JSON.stringify(geminiRequest(facts));
    stage = 'fetch';
    // redirect must be 'manual': the Workers runtime throws a TypeError on 'error'
    // before sending anything. A 3xx is then just a non-2xx reply and is never followed.
    const response = await fetch(url, { method: 'POST', headers, body, signal, redirect: 'manual' });
    trace.upstream = response.status;
    if (!response.ok) {
      trace.reason = 'upstream_http';
      void response.body?.cancel().catch(() => undefined);
      return undefined;
    }
    stage = 'read_body';
    const reply: unknown = await response.json();
    const text = geminiText(reply);
    if (!text) {
      // The 150-token cap includes thought tokens; MAX_TOKENS means the reply was cut off.
      const candidates = record(reply)?.candidates;
      const finish = Array.isArray(candidates) ? record(candidates[0])?.finishReason : undefined;
      trace.reason = finish === 'MAX_TOKENS' ? 'upstream_truncated' : 'upstream_empty';
      return undefined;
    }
    return text;
  } catch (thrown) {
    // Our own timeout or a client disconnect aborts the fetch; the Worker already has a code for that.
    if (signal.aborted) return undefined;
    trace.stage = stage;
    trace.err = errorName(thrown);
    trace.reason = stage === 'fetch' ? 'upstream_http' : stage === 'read_body' ? 'upstream_empty' : 'not_configured';
    return undefined;
  }
};
