import { coachConfig as C } from '../../src/core/data.js';
import type { CoachFacts } from '../../src/core/coach.js';
import type { CoachProvider } from './types.js';

/** Separate for a credential-free contract test of the exact wire payload. */
export function geminiRequest(facts: CoachFacts) {
  return {
    systemInstruction: { parts: [{ text: C.system }] },
    contents: [{ role: 'user', parts: [{ text: JSON.stringify(facts) }] }],
    // Plain text only: no tools, no search grounding, no audio. Thought tokens count
    // against maxOutputTokens, so thinking is pinned to the lowest documented level
    // (GenerationConfig.thinkingConfig.thinkingLevel; Gemini 3 or later only).
    generationConfig: {
      maxOutputTokens: C.limits.maxOutputTokens,
      temperature: 0.2,
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

/** The only provider HTTP call. No credentials in URLs, logs, client code, or files. */
export const callGemini: CoachProvider = async (facts, env, signal) => {
  const model = env.COACH_MODEL?.trim().replace(/^models\//, '');
  const key = env.COACH_API_KEY?.trim();
  if (!key || !model || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(model) || signal.aborted) return undefined;
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(geminiRequest(facts)),
      signal, redirect: 'error',
    },
  );
  if (!response.ok) return undefined;
  return geminiText(await response.json());
};
