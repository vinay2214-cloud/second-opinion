import { describe, expect, test } from 'vitest';
import { buildTrustMapModel } from '../src/ui/TrustMapModel.js';
import { advisorData, shiftConfig } from '../src/core/data.js';
import { classifyReliance, trustMap } from '../src/core/reliance.js';
import { makeRng } from '../src/core/rng.js';
import { ZONES } from '../src/core/rubric.js';
import type { AdvisorId, DebriefEntry } from '../src/core/types.js';

function entry(overrides: Partial<DebriefEntry> = {}): DebriefEntry {
  const input: Omit<DebriefEntry, 'reliance'> = {
    index: 0, advisorId: 'dash', category: 'cardiac', commit: 'red', advice: 'amber', final: 'red', truth: 'red', ...overrides,
  };
  return { ...input, reliance: classifyReliance(input) };
}

function cell(entries: readonly DebriefEntry[]) {
  return buildTrustMapModel(entries).rows.find((row) => row.advisorId === 'dash')!.cells.find((c) => c.category === 'cardiac')!;
}

describe('T09 trust map model', () => {
  test('empty logs produce a complete ordered grid with explicit missing-data cells', () => {
    const model = buildTrustMapModel([]);
    expect(model.categories).toEqual(advisorData.categories);
    expect(model.rows.map((row) => row.advisorId)).toEqual(shiftConfig.lineups.module3);
    for (const row of model.rows) {
      expect(row.advisorName).toBe(advisorData.advisors[row.advisorId].name);
      expect(row.cells.map((c) => c.category)).toEqual(model.categories);
      for (const c of row.cells) expect(c).toMatchObject({ disagreements: 0, followed: 0, adviceRight: 0, followRate: null, rightRate: null, status: 'notEnoughData', message: 'Not enough data' });
    }
  });

  test('rates use all logged disagreements including both-wrong outcomes', () => {
    const entries = [entry(), entry({ final: 'amber' }), entry({ commit: 'green', final: 'amber' })];
    expect(cell(entries)).toEqual({ category: 'cardiac', disagreements: 3, followed: 2, adviceRight: 0, followRate: 2 / 3, rightRate: 0, status: 'observed', message: null });
  });

  test('one observed result shows its count; observed zero is distinct from missing data', () => {
    expect(cell([entry()])).toMatchObject({ disagreements: 1, followed: 0, adviceRight: 0, followRate: 0, rightRate: 0, status: 'observed' });
    expect(cell([entry({ commit: 'amber', advice: 'red', final: 'red', truth: 'red' })]))
      .toMatchObject({ disagreements: 1, followRate: 1, rightRate: 1, status: 'observed' });
    expect(cell([])).toMatchObject({ followRate: null, rightRate: null });
  });

  test('agree stays excluded after moving away, and third-tray other stays excluded', () => {
    const agreement = entry({ commit: 'red', advice: 'red', final: 'green' });
    const thirdTray = entry({ commit: 'red', advice: 'amber', final: 'green' });
    expect(agreement.reliance).toBe('agree');
    expect(thirdTray.reliance).toBe('other');
    expect(cell([agreement, thirdTray])).toMatchObject({ disagreements: 0, status: 'notEnoughData' });
  });

  test('the selected lineup controls rows, with stable order and no duplicates', () => {
    const log = [entry(), entry({ advisorId: 'orator' })];
    expect(buildTrustMapModel(log, shiftConfig.lineups.module1).rows.map((r) => r.advisorId)).toEqual(['dash']);
    expect(buildTrustMapModel(log, shiftConfig.lineups.module2).rows.map((r) => r.advisorId)).toEqual(['dash', 'ledger']);
    expect(buildTrustMapModel(log, ['ledger', 'dash', 'ledger']).rows.map((r) => r.advisorId)).toEqual(['ledger', 'dash']);
    expect(buildTrustMapModel(log, []).rows).toEqual([]);
  });

  test('each advisor/category has its own denominator and no hidden reliability fields', () => {
    const model = buildTrustMapModel([entry(), entry({ advisorId: 'ledger', category: 'infection', commit: 'amber', advice: 'red', final: 'red' })]);
    const ledger = model.rows.find((row) => row.advisorId === 'ledger')!;
    expect(ledger.cells.find((c) => c.category === 'infection')).toMatchObject({ disagreements: 1, followRate: 1, rightRate: 1 });
    expect(ledger.cells.find((c) => c.category === 'cardiac')).toMatchObject({ disagreements: 0, rightRate: null });
    expect(Object.keys(model)).toEqual(['categories', 'rows']);
    expect(Object.keys(ledger)).toEqual(['advisorId', 'advisorName', 'cells']);
    expect(Object.keys(ledger.cells[0]).sort()).toEqual(['category', 'disagreements', 'followed', 'adviceRight', 'status', 'followRate', 'rightRate', 'message'].sort());
  });

  test('100 seeded grids match core trustMap output without mutating the supplied logs', () => {
    const ids = Object.keys(advisorData.advisors) as AdvisorId[];
    for (let seed = 0; seed < 100; seed++) {
      const rng = makeRng('T09-map', seed);
      const entries = Array.from({ length: rng.int(101) }, (_, index) => entry({ index, advisorId: rng.pick(ids), category: rng.pick(advisorData.categories), commit: rng.pick(ZONES), advice: rng.pick(ZONES), final: rng.pick(ZONES), truth: rng.pick(ZONES) }));
      const before = structuredClone(entries);
      const source = trustMap(entries);
      const model = buildTrustMapModel(Object.freeze(entries), ids);
      for (const row of model.rows) for (const c of row.cells) {
        const raw = source.find((item) => item.advisorId === row.advisorId && item.category === c.category);
        if (raw) expect(c).toMatchObject({ disagreements: raw.disagreements, followed: raw.followed, adviceRight: raw.adviceRight, followRate: raw.followRate, rightRate: raw.adviceAccuracy, status: 'observed' });
        else expect(c).toMatchObject({ disagreements: 0, followRate: null, rightRate: null, status: 'notEnoughData' });
      }
      expect(entries).toEqual(before);
      expect(buildTrustMapModel(entries, ids)).toEqual(model);
    }
  });

  test('returned arrays are detached from configuration and later models', () => {
    const first = buildTrustMapModel([]);
    const original = structuredClone(first);
    first.categories.pop();
    first.rows[0].cells.length = 0;
    first.rows.pop();
    expect(buildTrustMapModel([])).toEqual(original);
  });
});
