import { advisorData, shiftConfig } from '../core/data.js';
import { trustMap } from '../core/reliance.js';
import type { AdvisorId, Category, DebriefEntry } from '../core/types.js';

export type TrustMapCell = {
  category: Category;
  disagreements: number;
  followed: number;
  adviceRight: number;
} & (
  | { status: 'observed'; followRate: number; rightRate: number; message: null }
  | { status: 'notEnoughData'; followRate: null; rightRate: null; message: 'Not enough data' }
);

export interface TrustMapModel {
  categories: Category[];
  rows: Array<{
    advisorId: AdvisorId;
    advisorName: string;
    cells: TrustMapCell[];
  }>;
}

/**
 * Build once from runtime.summary().entries for a debrief, using the active lineup.
 * Both rates describe logged disagreements only, as defined by core trustMap().
 * A zero-observation cell has null rates; one or more observations show rates
 * alongside their counts. No new statistical cutoff or hidden reliability is used.
 */
export function buildTrustMapModel(
  entries: readonly DebriefEntry[],
  lineup: readonly AdvisorId[] = shiftConfig.lineups.module3,
): TrustMapModel {
  const observed = new Map(trustMap(entries).map((row) => [`${row.advisorId}:${row.category}`, row]));
  const categories = advisorData.categories.slice();
  return {
    categories,
    rows: [...new Set(lineup)].map((advisorId) => ({
      advisorId,
      advisorName: advisorData.advisors[advisorId].name,
      cells: categories.map((category): TrustMapCell => {
        const row = observed.get(`${advisorId}:${category}`);
        if (!row) {
          return {
            category, disagreements: 0, followed: 0, adviceRight: 0,
            status: 'notEnoughData', followRate: null, rightRate: null,
            message: 'Not enough data',
          };
        }
        return {
          category,
          disagreements: row.disagreements,
          followed: row.followed,
          adviceRight: row.adviceRight,
          status: 'observed',
          followRate: row.followRate,
          rightRate: row.adviceAccuracy,
          message: null,
        };
      }),
    })),
  };
}
