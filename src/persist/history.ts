import { safeStorage, type SafeStorage } from './safeStorage.js';

export interface ShiftSummary {
  index: number | null;
  score: number;
  /** Caller-supplied local calendar day, YYYY-MM-DD. */
  date: string;
}

export interface HistoryState {
  /** Newest recorded result first, at most 30. */
  entries: ShiftSummary[];
  /** Consecutive played days ending on lastPlayedDate, not a live clock reading. */
  streak: number;
  lastPlayedDate: string | null;
}

const KEY = 'so.history';
const LIMIT = 30;
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const empty = (): HistoryState => ({ entries: [], streak: 0, lastPlayedDate: null });

/** Gregorian day ordinal. Calendar arithmetic avoids clock and timezone dependencies. */
function dayNumber(value: unknown): number | null {
  if (typeof value !== 'string' || value.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12) return null;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  if (day < 1 || day > MONTH_DAYS[month - 1] + (leap && month === 2 ? 1 : 0)) return null;
  const y = year - 1;
  let ordinal = y * 365 + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + day;
  for (let m = 1; m < month; m++) ordinal += MONTH_DAYS[m - 1] + (leap && m === 2 ? 1 : 0);
  return ordinal;
}

function isSummary(value: unknown): value is ShiftSummary {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (v.index === null || (typeof v.index === 'number' && Number.isFinite(v.index) && v.index >= 0 && v.index <= 100))
    && typeof v.score === 'number' && Number.isFinite(v.score)
    && dayNumber(v.date) !== null;
}

function normalize(value: unknown): HistoryState {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return empty();
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.entries)) return empty();
  const entries = v.entries.filter(isSummary).slice(0, LIMIT)
    .map(({ index, score, date }) => ({ index, score, date }));
  if (!entries.length) return empty();
  const latest = entries.reduce((a, b) => a.date > b.date ? a : b).date;
  const storedDay = dayNumber(v.lastPlayedDate);
  if (storedDay !== null && storedDay >= dayNumber(latest)!
    && typeof v.streak === 'number' && Number.isSafeInteger(v.streak) && v.streak > 0) {
    return { entries, streak: v.streak, lastPlayedDate: v.lastPlayedDate as string };
  }
  // Recover broken streak metadata from the valid retained results.
  const days = new Set(entries.map((e) => dayNumber(e.date)!));
  let streak = 0;
  for (let d = dayNumber(latest)!; days.has(d); d--) streak++;
  return { entries, streak, lastPlayedDate: latest };
}

export function loadHistory(storage: SafeStorage = safeStorage): HistoryState {
  try {
    const raw = storage.get(KEY);
    return normalize(raw === null ? null : JSON.parse(raw));
  } catch {
    return empty();
  }
}

/** Invalid results/days are ignored. Backdated results never advance or rewind the streak. */
export function recordShift(
  summary: Pick<ShiftSummary, 'index' | 'score'>,
  localDate: string,
  storage: SafeStorage = safeStorage,
): HistoryState {
  let history = loadHistory(storage);
  try {
    const entry = { index: summary.index, score: summary.score, date: localDate };
    if (!isSummary(entry)) return history;
    const day = dayNumber(localDate)!;
    const previousDay = dayNumber(history.lastPlayedDate);
    let { streak, lastPlayedDate } = history;
    if (previousDay === null || day > previousDay) {
      streak = previousDay !== null && day === previousDay + 1
        ? Math.min(Number.MAX_SAFE_INTEGER, streak + 1) : 1;
      lastPlayedDate = localDate;
    }
    history = { entries: [entry, ...history.entries].slice(0, LIMIT), streak, lastPlayedDate };
    storage.set(KEY, JSON.stringify(history));
  } catch { /* Storage and malformed caller values must not interrupt a shift. */ }
  return history;
}
