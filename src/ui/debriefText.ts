// Debrief panel text. Every sentence is a field of the runtime's
// summary().debrief (buildDebrief output) or a fixed label from
// docs/05 section 4; nothing is computed here except number formatting.
import type { Debrief, Score } from '../core/index.js';
import { TEXT_EM } from '../scene/shiftUi.js';
import type { PanelLine } from './TextPanel.js';

const pct = (rate: number | null): string =>
  rate === null ? 'n/a' : `${Math.round(rate * 100)}%`;

export function debriefLines(debrief: Debrief, score: Score): PanelLine[] {
  const em = TEXT_EM.debrief;
  const lines: PanelLine[] = [
    { text: 'Shift review', bold: true, em: TEXT_EM.debriefHead },
    { text: debrief.headline, bold: true, em },
    {
      text:
        debrief.index === null
          ? 'Calibration index: Not enough data yet'
          : `Calibration index: ${debrief.index}`,
      em,
      color: '#9ec1ff',
    },
    {
      text: `Followed wrong advice: ${pct(debrief.overRelianceRate)} · Overruled right advice: ${pct(debrief.underRelianceRate)}`,
      em,
    },
  ];
  for (const finding of debrief.findings.slice(0, 3)) {
    lines.push({ text: finding, em });
  }
  lines.push({ text: debrief.nextStep, em, color: '#ffd166' });
  lines.push({ text: `Score ${score.total}`, em, color: '#9ec1ff' });
  return lines;
}

/** The debrief sentences the panel must show verbatim, for the logged diff. */
export function debriefSentences(debrief: Debrief): string[] {
  return [debrief.headline, ...debrief.findings.slice(0, 3), debrief.nextStep];
}
