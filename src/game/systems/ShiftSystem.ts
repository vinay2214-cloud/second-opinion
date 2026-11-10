// Adapter between the pure shift runtime (src/core) and the table.
// It forwards input (tray releases, Keep, card poke) to the runtime and draws
// what the runtime returns. It never computes a score, an advisor call or a
// reliance label. Advice is drawn only after commit() succeeded and the 0.6 s
// hold passed, and never while an uncommitted token is in a hand.
import { createSystem, Pressed, VisibilityState } from '@iwsdk/core';
import { advisorData, loadCases, shiftConfig } from '../../core/data.js';
import {
  buildShift,
  createShiftRuntime,
  type PublicAdvice,
  type RuntimeEvent,
  type ShiftRuntime,
  type Zone,
} from '../../core/index.js';
import { PALETTE } from '../../scene/palette.js';
import type { ShiftUiParts } from '../../scene/shiftUi.js';
import type { PanelLine } from '../../ui/TextPanel.js';
import { KeepButton, type TokenIntent, VitalsCard } from '../components.js';
import { PlacementSystem } from './PlacementSystem.js';
import { TokenSystem } from './TokenSystem.js';
import { TraySystem } from './TraySystem.js';

/** Beat between the stamp and the advisor line (docs/02 section 3). Presentation only. */
const ADVICE_HOLD_SEC = 0.6;
const RESULT_SEC = 4;
const TOKEN_LEAVE_SEC = 2.5;
const REFRESH_SEC = 0.25;

/** Shape plus word, never colour alone. */
const ZONE_MARK: Record<Zone, string> = {
  red: '▲ RED',
  amber: '◆ AMBER',
  green: '● GREEN',
};
const ZONE_COLOR: Record<Zone, string> = {
  red: '#ff8589',
  amber: '#ffc35c',
  green: '#5fd39a',
};
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

type Stage = 'arrived' | 'committed';

export class ShiftSystem extends createSystem({
  keepPressed: { required: [KeepButton, Pressed] },
  cardPressed: { required: [VitalsCard, Pressed] },
}) {
  /** Set by bootstrap before registration. */
  static ui: ShiftUiParts;

  private runtime!: ShiftRuntime;
  private tokens!: TokenSystem;
  private trays!: TraySystem;
  private placement!: PlacementSystem;
  private ui!: ShiftUiParts;

  private started = false;
  private ended = false;
  private clock = 0;
  private refreshIn = 0;
  private expanded = false;
  private keepRequested = false;
  private keepEnabled = false;
  /** Unresolved patients on the table, with what the runtime last told us. */
  private stage = new Map<number, Stage>();
  private commitZone = new Map<number, Zone>();
  private lead = new Map<number, PublicAdvice>();
  private revealAt = new Map<number, number>();
  private focus = -1;
  private resultLeft = 0;
  private resultKey = '';
  private resultLines: PanelLine[] = [];
  private names: Partial<Record<string, string>> = {};

  init(): void {
    this.ui = ShiftSystem.ui;
    this.tokens = this.world.getSystem(TokenSystem) as TokenSystem;
    this.trays = this.world.getSystem(TraySystem) as TraySystem;
    this.placement = this.world.getSystem(PlacementSystem) as PlacementSystem;

    const seed =
      new URLSearchParams(window.location.search).get('seed') ?? 'ward-a';
    const shift = buildShift({ seed, cases: loadCases(), module: 'module1' });
    for (const id of shift.lineup) {
      this.names[id] = advisorData.advisors[id].name; // display name only
    }
    this.runtime = createShiftRuntime({ shift, advisorNames: this.names });
    console.info(
      `[shift] built seed=${seed} module=${shift.module} patients=${shift.patients.length}`,
    );

    this.cleanupFuncs.push(
      this.tokens.onIntent((intent) => this.onIntent(intent)),
      // Act on release, not on press: changing a target under a pressing hand
      // leaves that hand unable to grab (T04 finding).
      this.queries.keepPressed.subscribe('disqualify', () => {
        this.keepRequested = true;
      }),
      this.queries.cardPressed.subscribe('disqualify', () => {
        this.expanded = !this.expanded;
        this.refreshIn = 0;
      }),
    );
    this.ui.speech.set('idle', [
      { text: 'Second Opinion', bold: true, em: 0.022 },
      { text: 'Commit your call. Then see if the AI agrees.' },
    ]);
  }

  update(delta: number, time: number): void {
    this.clock = time;
    if (this.ended) {
      return;
    }
    const now = performance.now();
    if (!this.started) {
      const inXR =
        this.world.visibilityState.peek() !== VisibilityState.NonImmersive;
      if (!inXR || !this.placement.isPlaced) {
        return;
      }
      this.started = true;
      console.info('[shift] start');
      this.handle(this.runtime.start(now));
    } else {
      this.handle(this.runtime.tick(now));
    }
    if (this.ended) {
      return;
    }

    if (this.keepRequested) {
      this.keepRequested = false;
      const zone = this.commitZone.get(this.focus);
      if (this.keepEnabled && zone) {
        const result = this.runtime.finalize(this.focus, zone, now);
        console.info(`[shift] keep ${this.focus} ${zone} ok=${result.ok}`);
        this.handle(this.runtime.tick(now));
      }
    }

    this.resultLeft = Math.max(0, this.resultLeft - delta);
    this.refreshIn -= delta;
    if (this.refreshIn <= 0) {
      this.refreshIn = REFRESH_SEC;
      this.draw(now);
    }
  }

  private onIntent(intent: TokenIntent): void {
    const i = intent.tokenId;
    const now = performance.now();
    const stage = this.stage.get(i);
    if (stage === 'arrived') {
      const result = this.runtime.commit(i, intent.zone, now);
      console.info(`[shift] commit ${i} ${intent.zone} ok=${result.ok}`);
      if (result.ok) {
        this.stage.set(i, 'committed');
        this.commitZone.set(i, intent.zone);
        this.lead.set(i, result.lead);
        this.revealAt.set(i, this.clock + ADVICE_HOLD_SEC);
      } else {
        this.tokens.revert(i);
      }
    } else if (stage === 'committed' && this.clock >= (this.revealAt.get(i) ?? Infinity)) {
      const result = this.runtime.finalize(i, intent.zone, now);
      console.info(`[shift] change ${i} ${intent.zone} ok=${result.ok}`);
      if (!result.ok) {
        this.tokens.revert(i);
      }
    } else {
      this.tokens.revert(i); // advice not shown yet, or the patient is already resolved
    }
    this.refreshIn = 0;
  }

  private handle(events: RuntimeEvent[]): void {
    for (const event of events) {
      if (event.type === 'arrive') {
        this.stage.set(event.index, 'arrived');
        this.tokens.spawnToken(event.index);
        console.info(`[shift] arrive ${event.index}`);
      } else if (event.type === 'resolved') {
        const i = event.index;
        this.stage.delete(i);
        this.commitZone.delete(i);
        this.lead.delete(i);
        this.revealAt.delete(i);
        // Where the token ends up is the runtime's logged final call.
        const entry = this.runtime.log().find((e) => e.index === i);
        this.tokens.retire(i, entry?.final ?? event.truth, TOKEN_LEAVE_SEC);
        this.trays.showTruth(event.truth);
        this.resultLeft = RESULT_SEC;
        this.resultKey = `result-${i}`;
        this.resultLines = [
          {
            text: event.missed
              ? // Penalty text straight from data/shift-config.json; the patient's total is the runtime's delta.
                `Too slow: auto-Amber, ${signed(shiftConfig.scoring.missedWindowPenalty)}. Patient ${i + 1}: ${signed(event.delta)}`
              : `Patient ${i + 1}: ${signed(event.delta)}`,
            bold: true,
            em: 0.02,
          },
          {
            text: `Answer: ${ZONE_MARK[event.truth]}`,
            bold: true,
            color: ZONE_COLOR[event.truth],
          },
          { text: event.whyLine, em: 0.0145 },
        ];
        console.info(
          `[shift] resolved ${i} truth=${event.truth} delta=${event.delta} reliance=${event.reliance} missed=${event.missed}`,
        );
      } else {
        this.finish();
      }
      this.refreshIn = 0;
    }
  }

  private finish(): void {
    this.ended = true;
    const { score, debrief } = this.runtime.summary();
    const lines: PanelLine[] = [
      { text: 'Shift review', bold: true, em: 0.024 },
      { text: debrief.headline, bold: true },
      { text: `Score ${score.total}` },
      {
        text:
          debrief.index === null
            ? 'Calibration index: Not enough data yet'
            : `Calibration index: ${debrief.index}`,
      },
    ];
    for (const finding of debrief.findings.slice(0, 2)) {
      lines.push({ text: finding, em: 0.015 });
    }
    lines.push({ text: debrief.nextStep, em: 0.015, color: '#ffd166' });
    this.ui.debrief.set('debrief', lines);
    this.ui.debrief.mesh.visible = true;
    this.ui.speech.mesh.visible = false;
    this.ui.card.mesh.visible = false;
    this.setKeep(false);
    console.info(
      `[shift] end score=${score.total} outcome=${score.outcome} headline="${debrief.headline}"`,
    );
  }

  /** Which patient the card and the speech panel are about. */
  private pickFocus(): number {
    const touched = this.tokens.lastTouched;
    if (this.stage.has(touched)) {
      return touched;
    }
    let first = -1;
    for (const index of this.stage.keys()) {
      if (first < 0 || index < first) {
        first = index;
      }
    }
    return first;
  }

  private draw(now: number): void {
    const i = (this.focus = this.pickFocus());
    const stage = this.stage.get(i);
    const card = this.ui.card;
    card.mesh.visible = stage !== undefined;

    // No advice while any uncommitted token is in a hand, whichever patient is in focus.
    let uncommittedInHand = false;
    if (this.tokens.heldCount > 0) {
      for (const [index, s] of this.stage) {
        if (s === 'arrived' && this.tokens.isHeld(index)) {
          uncommittedInHand = true;
        }
      }
    }
    const lead = this.lead.get(i);
    const adviceShown =
      stage === 'committed' &&
      !!lead &&
      !uncommittedInHand &&
      this.clock >= (this.revealAt.get(i) ?? Infinity);
    this.setKeep(adviceShown);

    if (stage !== undefined) {
      const view = this.runtime.publicView(i);
      const left = Math.max(
        0,
        Math.ceil(view.arrivalSec + view.windowSec - this.runtime.elapsedSec(now)),
      );
      const v = view.case.vitals;
      const lines: PanelLine[] = [
        {
          text: `Patient ${i + 1} · ${cap(view.case.ageBand)} · ${cap(view.case.category)} · ${left} s left`,
          bold: true,
          color: left <= 8 ? '#ffc35c' : '#9ec1ff',
        },
        { text: view.case.complaint },
      ];
      if (this.expanded) {
        lines.push({
          text: `Pulse ${v.pulse} · BP ${v.sbp}/${v.dbp} · Oxygen ${v.spo2}% · Temp ${v.temp}°`,
        });
      } else {
        lines.push({ text: 'Poke this card to read the vitals.', color: '#ffd166' });
      }
      card.set(`${i}-${left}-${this.expanded}`, lines);
    }

    const speech = this.ui.speech;
    if (this.resultLeft > 0) {
      speech.set(this.resultKey, this.resultLines);
    } else if (adviceShown && lead) {
      speech.set(`advice-${i}`, [
        {
          text: `${this.names[lead.advisorId] ?? lead.advisorId} says: ${ZONE_MARK[lead.call]}`,
          bold: true,
          em: 0.02,
          color: ZONE_COLOR[lead.call],
        },
        { text: `“${lead.line}”` },
        { text: 'Press Keep, or move the token to change your call.', em: 0.0145 },
      ]);
    } else if (stage === 'arrived' || uncommittedInHand) {
      speech.set('prompt', [{ text: 'Make your own call first.', bold: true, em: 0.02 }]);
    } else if (stage === 'committed') {
      speech.set('hold', [{ text: '…', bold: true, em: 0.02 }]);
    } else {
      speech.set('waiting', [{ text: 'Next patient on the way.', em: 0.02 }]);
    }
  }

  private setKeep(enabled: boolean): void {
    if (enabled !== this.keepEnabled) {
      this.keepEnabled = enabled;
      this.ui.keepCap.color.setHex(enabled ? PALETTE.keepOn : PALETTE.button);
      this.ui.keepCap.emissive.setHex(enabled ? 0x2a5a1a : 0x000000);
    }
  }
}
