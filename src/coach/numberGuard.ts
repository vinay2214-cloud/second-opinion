// Number guard for coach text. validateCoachText (src/core/coach.ts) only checks that every
// number appears somewhere in the facts, so "across 100 cases" passed when 100 was the
// calibration index. This adds a deterministic rule about what a number may be attached to.
// Pure: no DOM, no network, no config import. Used by the Worker and by the client, after
// validateCoachText. Anything rejected here falls back to the template text.
//
// Rules
//  1. Percentages (N%, N percent, N per cent, N percentage ...) must equal overRelianceRate,
//     underRelianceRate or verifyYield.
//  2. A number followed within two words by a counting word (cases, patients, times, calls,
//     decisions, ...) must equal a count in the facts: disagreements, or a pattern's count,
//     of or adviceRight.
//  3. If such a number is introduced as a total ("across", "over", "all", "total of",
//     "out of", "of the"), it must equal a denominator: disagreements or a pattern's `of`.
//  4. "N of M" must have N among the counts and M among the denominators, with N <= M.
//  5. The facts hold no count of shifts, rounds, advisors or people, so a number attached to
//     one of those words is always rejected.
// Spelled-out numbers (two ... twenty, thirty ... hundred) are treated like digits here.
// "one" is left alone: "play one more shift" is ordinary advice, not a count.

export type CoachNumberCheck = { ok: true; reason: null } | { ok: false; reason: string };

interface CountFacts {
  disagreements?: unknown;
  overRelianceRate?: unknown;
  underRelianceRate?: unknown;
  verifyYield?: unknown;
  patterns?: unknown;
}

const WORD_NUMBERS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};
/** Words the facts can back with a count. */
const COUNT_WORD = /^(cases?|patients?|times?|calls?|decisions?|disagreements?|occasions?|instances?|picks?|choices?|answers?|triages?)$/;
/** Words the facts never count. */
const NEVER_COUNTED = /^(shifts?|rounds?|advisors?|people|players?|games?|sessions?|days?)$/;
const TOTAL_LEAD = /^(across|over|all|total|throughout|among)$/;
const FILLER = /^(the|all|your|those|these|just|only|of|a)$/;
const BOUNDARY = /^[.!?,;:()]$/;

const isCount = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0;

function countsIn(facts: CountFacts): { counts: Set<number>; totals: Set<number>; rates: Set<number> } {
  const counts = new Set<number>();
  const totals = new Set<number>();
  const rates = new Set<number>();
  if (isCount(facts.disagreements)) { counts.add(facts.disagreements); totals.add(facts.disagreements); }
  for (const rate of [facts.overRelianceRate, facts.underRelianceRate, facts.verifyYield]) if (isCount(rate)) rates.add(rate);
  if (Array.isArray(facts.patterns)) {
    for (const value of facts.patterns) {
      const p = (value ?? {}) as Record<string, unknown>;
      for (const key of ['count', 'of', 'adviceRight']) if (isCount(p[key])) counts.add(p[key] as number);
      if (isCount(p.of)) totals.add(p.of);
    }
  }
  return { counts, totals, rates };
}

interface Token { text: string; value: number | null; percent: boolean }

function tokenize(text: string): Token[] {
  const raw = text.toLowerCase().match(/\d+(?:\.\d+)?%?|[a-z]+(?:['’][a-z]+)?|[.!?,;:()%]/g) ?? [];
  return raw.map((t) => {
    if (/^\d/.test(t)) return { text: t, value: Number(t.replace('%', '')), percent: t.endsWith('%') };
    return { text: t, value: t in WORD_NUMBERS ? WORD_NUMBERS[t] : null, percent: false };
  });
}

/** Check the numbers in coach text against what the facts can support. */
export function checkCoachNumbers(text: unknown, facts: unknown): CoachNumberCheck {
  const bad = (why: string): CoachNumberCheck => ({ ok: false, reason: why });
  if (typeof text !== 'string') return bad('not a string');
  if (!facts || typeof facts !== 'object') return bad('no facts');
  const { counts, totals, rates } = countsIn(facts as CountFacts);
  const tokens = tokenize(text);
  const at = (i: number): Token | undefined => tokens[i];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.value === null) continue;
    const n = token.value;
    const next = at(i + 1);
    const after = at(i + 2);

    // 1. Percentages.
    const percent = token.percent || next?.text === '%' || next?.text === 'percent' || next?.text === 'percentage'
      || (next?.text === 'per' && after?.text === 'cent');
    if (percent) {
      if (!rates.has(n)) return bad(`percentage not a rate in facts: ${n}`);
      continue;
    }

    // 4. "N of M".
    if (next?.text === 'of' && after && after.value !== null) {
      const m = after.value;
      if (!counts.has(n) || !totals.has(m) || n > m) return bad(`"${n} of ${m}" is not a count in facts`);
      continue;
    }

    // The counting word: the next word, or the one after it (one word in between).
    let word: string | undefined;
    for (let j = i + 1; j <= i + 2; j++) {
      const t = at(j);
      if (!t || BOUNDARY.test(t.text) || t.value !== null || t.text === '%') break;
      if (COUNT_WORD.test(t.text) || NEVER_COUNTED.test(t.text)) { word = t.text; break; }
    }
    if (!word) continue;

    // 5. Nothing in the facts counts these.
    if (NEVER_COUNTED.test(word)) return bad(`facts hold no count of ${word}: ${n}`);

    // 3. Introduced as a total?
    let lead = at(i - 1);
    for (let j = i - 1, steps = 0; lead && FILLER.test(lead.text) && steps < 2; steps++) lead = at(--j);
    const before = at(i - 1)?.text;
    const total = (lead !== undefined && TOTAL_LEAD.test(lead.text))
      || (before === 'of' && at(i - 2)?.text === 'out') || before === 'all' || before === 'total';
    if (total) {
      if (!totals.has(n)) return bad(`total not in facts: ${n} ${word}`);
      continue;
    }

    // 2. An ordinary count.
    if (!counts.has(n)) return bad(`count not in facts: ${n} ${word}`);
  }
  return { ok: true, reason: null };
}
