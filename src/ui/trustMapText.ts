// Trust map as text for the debrief panel. Every number comes from Astra's
// buildTrustMapModel (src/ui/TrustMapModel.ts); this file only words them.
import type { AdvisorId, DebriefEntry } from '../core/index.js';
import { TEXT_EM } from '../scene/shiftUi.js';
import type { PanelLine } from './TextPanel.js';
import { buildTrustMapModel } from './TrustMapModel.js';

const MAX_ROWS = 7;

export function trustMapLines(
  entries: readonly DebriefEntry[],
  lineup: readonly AdvisorId[],
): PanelLine[] {
  const em = TEXT_EM.debrief;
  const model = buildTrustMapModel(entries, lineup);
  const lines: PanelLine[] = [
    { text: 'Trust map', bold: true, em: TEXT_EM.debriefHead },
    { text: 'When an advisor disagreed with your first call:', em, color: '#9ec1ff' },
  ];
  const rows: Array<{ n: number; text: string }> = [];
  for (const row of model.rows) {
    for (const cell of row.cells) {
      if (cell.status === 'observed') {
        rows.push({
          n: cell.disagreements,
          text: `${row.advisorName} · ${cell.category}: you followed ${cell.followed} of ${cell.disagreements}, ${row.advisorName} was right ${cell.adviceRight}`,
        });
      }
    }
  }
  rows.sort((a, b) => b.n - a.n);
  if (rows.length === 0) {
    lines.push({ text: 'Not enough data', em });
  }
  for (const row of rows.slice(0, MAX_ROWS)) {
    lines.push({ text: row.text, em });
  }
  if (rows.length > MAX_ROWS) {
    lines.push({ text: `and ${rows.length - MAX_ROWS} more`, em, color: '#9ec1ff' });
  }
  lines.push({ text: 'Poke Review to go back.', em, color: '#ffd166' });
  return lines;
}
