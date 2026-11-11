import { coachConfig as C, debriefLines as L } from '../core/data.js';
import { chooseCoachText, coachFallback, validateCoachFacts } from '../core/coach.js';
import type { CoachDebrief, CoachText } from '../core/coach.js';
import { COACH_PROXY_URL, coachProxyUrl } from './config.js';

export interface CoachClientOptions {
  proxyUrl?: string;
  fetcher?: typeof fetch;
}
export type AskCoach = (facts: unknown, debrief: CoachDebrief) => Promise<CoachText>;

function fallback(debrief: CoachDebrief): CoachText {
  try {
    return { source: 'template', text: coachFallback(debrief), reason: 'unavailable' };
  } catch {
    return {
      source: 'template',
      text: L.headline.notEnough + ' ' + L.nextStep.notEnough,
      reason: 'unavailable',
    };
  }
}

/** No request at creation. Call only on a player press; reuse the shift's debrief object. */
export function createCoachClient(options: CoachClientOptions = {}): AskCoach {
  const cache = new WeakMap<CoachDebrief, Promise<CoachText>>();
  const url = coachProxyUrl(options.proxyUrl ?? COACH_PROXY_URL);
  const fetcher: typeof fetch = options.fetcher ?? ((...args) => globalThis.fetch(...args));

  async function request(facts: unknown, debrief: CoachDebrief): Promise<CoachText> {
    const template = fallback(debrief);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    try {
      if (!url || !validateCoachFacts(facts).ok) return template;
      // Validate the serialized snapshot too: toJSON must not introduce free text.
      const body = JSON.stringify(facts);
      if (new TextEncoder().encode(body).byteLength > C.limits.maxBodyBytes) return template;
      const snapshot: unknown = JSON.parse(body);
      if (!validateCoachFacts(snapshot).ok) return template;
      controller = new AbortController();
      const signal = controller.signal;
      const timeout = new Promise<CoachText>((resolve) => {
        timer = setTimeout(() => {
          resolve(template);
          controller?.abort();
        }, C.limits.timeoutMs);
      });
      const work = (async (): Promise<CoachText> => {
        const response = await fetcher(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body, signal, credentials: 'omit', cache: 'no-store',
          redirect: 'error', referrerPolicy: 'no-referrer',
        });
        if (signal.aborted || !response.ok || response.status === 204) return template;
        const reply: unknown = await response.json();
        if (signal.aborted || !reply || typeof reply !== 'object') return template;
        const modelText = (reply as Record<string, unknown>).text;
        return chooseCoachText({ modelText, facts: snapshot, debrief });
      })().catch(() => template);
      // Includes body decoding, and settles even if a fetch implementation ignores abort.
      return await Promise.race([work, timeout]);
    } catch {
      return template;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      controller?.abort();
    }
  }

  return async (facts, debrief) => {
    try {
      const cached = cache.get(debrief);
      if (cached) return await cached;
      const result = request(facts, debrief);
      cache.set(debrief, result);
      return await result;
    } catch {
      return fallback(debrief);
    }
  };
}

/** One POST per debrief object, including repeated/concurrent presses and failures. */
export const askCoach: AskCoach = createCoachClient();
