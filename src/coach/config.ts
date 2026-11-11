/** Public build configuration. T17 renders its button only when this is true. */
export function coachProxyUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || url.hash ||
        (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) return '';
    return url.href;
  } catch {
    return '';
  }
}

export const COACH_PROXY_URL = coachProxyUrl(import.meta.env.VITE_COACH_PROXY_URL);
export const COACH_AVAILABLE = COACH_PROXY_URL !== '';
