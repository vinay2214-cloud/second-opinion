// Adapter between the pure shift runtime (src/core) and the table.
// It forwards input (tray releases, Keep, advisor pokes, Start, Pause, card
// poke) to the runtime and draws what the runtime returns. It never computes
// a score, an advisor call or a reliance label. Advice is drawn only after
// commit() succeeded and the 0.6 s hold passed, and never while an
// uncommitted token is in a hand.
import {
  createSystem,
  type Entity,
  PokeInteractable,
  Pressed,
  RayInteractable,
  Visibility,
  VisibilityState,
} from '@iwsdk/core';
import { advisorData, loadCases, shiftConfig } from '../../core/data.js';
import {
  type AdvisorId,
  buildShift,
  createShiftRuntime,
  type ModuleId,
  type PublicAdvice,
  type RuntimeEvent,
  type Shift,
  type ShiftRuntime,
  type Zone,
} from '../../core/index.js';
import { PALETTE } from '../../scene/palette.js';
import {
  labelPlinth,
  type ShiftUiParts,
  showButtonLabel,
  TEXT_EM,
} from '../../scene/shiftUi.js';
import { debriefLines, debriefSentences } from '../../ui/debriefText.js';
import type { PanelLine } from '../../ui/TextPanel.js';
import {
  AdvisorPlinth,
  KeepButton,
  PauseButton,
  StartButton,
  type TokenIntent,
  VitalsCard,
} from '../components.js';
import { PlacementSystem } from './PlacementSystem.js';
import { TokenSystem } from './TokenSystem.js';
import { TraySystem } from './TraySystem.js';

/** Beat between the stamp and the advisor line (docs/02 section 3). Presentation only. */
const ADVICE_HOLD_SEC = 0.6;
/** The result stays until the next pickup or this long, whichever is later. */
const RESULT_MIN_SEC = 8;
const TOKEN_LEAVE_SEC = 2.5;
const REFRESH_SEC = 0.25;
const NOTICE_SEC = 3;

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
const MODULES: readonly ModuleId[] = ['module1', 'module2', 'module3'];
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const clockText = (sec: number): string => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

type Stage = 'arrived' | 'committed';

export interface PlinthView {
  entity: Entity;
  advisorId: AdvisorId;
  stand: { emissive: { setHex(hex: number): void } };
  body: { color: { setHex(hex: number): void } };
}

export class ShiftSystem extends createSystem({
  keepPressed: { required: [KeepButton, Pressed] },
  cardPressed: { required: [VitalsCard, Pressed] },
  plinthPressed: { required: [AdvisorPlinth, Pressed] },
  startPressed: { required: [StartButton, Pressed] },
  pausePressed: { required: [PauseButton, Pressed] },
}) {
  /** Set by bootstrap before registration. */
  static ui: ShiftUiParts;
  static plinths: PlinthView[];
  static startEntity: Entity;

  private runtime!: ShiftRuntime;
  private shift!: Shift;
  private tokens!: TokenSystem;
  private trays!: TraySystem;
  private placement!: PlacementSystem;
  private ui!: ShiftUiParts;

  private started = false;
  private ended = false;
  private startShown = false;
  private clock = 0;
  private refreshIn = 0;
  private expanded = false;
  private keepRequested = false;
  private startRequested = false;
  private pauseRequested = false;
  private verifyRequested: AdvisorId | '' = '';
  private keepEnabled = false;
  /** Pause: the runtime only ever sees wall time minus the time spent paused. */
  private paused = false;
  private pausedSince = 0;
  private pausedTotalMs = 0;
  /** Unresolved patients on the table, with what the runtime last told us. */
  private stage = new Map<number, Stage>();
  private commitZone = new Map<number, Zone>();
  private lead = new Map<number, PublicAdvice>();
  private revealAt = new Map<number, number>();
  private focus = -1;
  private scoreTotal = 0;
  private resolvedCount = 0;
  private resultAt = -1;
  private resultGrabs = 0;
  private resultKey = '';
  private resultLines: PanelLine[] = [];
  private resultShort: PanelLine | null = null;
  private notice = '';
  private noticeUntil = 0;
  private names: Partial<Record<AdvisorId, string>> = {};

  init(): void {
    this.ui = ShiftSystem.ui;
    this.tokens = this.world.getSystem(TokenSystem) as TokenSystem;
    this.trays = this.world.getSystem(TraySystem) as TraySystem;
    this.placement = this.world.getSystem(PlacementSystem) as PlacementSystem;

    const params = new URLSearchParams(window.location.search);
    const seed = params.get('seed') ?? 'ward-a';
    const asked = params.get('module') as ModuleId | null;
    const module: ModuleId = asked && MODULES.includes(asked) ? asked : 'module2';
    this.shift = buildShift({ seed, cases: loadCases(), module });
    for (const plinth of ShiftSystem.plinths) {
      const id = plinth.advisorId;
      const name = advisorData.advisors[id].name; // display name only
      this.names[id] = name;
      const onDuty = this.shift.lineup.includes(id);
      labelPlinth(plinth.entity.object3D!, name, onDuty);
      plinth.body.color.setHex(onDuty ? PALETTE.advisor : PALETTE.advisorOff);
    }
    this.runtime = createShiftRuntime({ shift: this.shift, advisorNames: this.names });
    console.info(
      `[shift] built seed=${seed} module=${module} patients=${this.shift.patients.length} tokens=${this.runtime.tokens} lineup=${this.shift.lineup.join(',')}`,
    );

    // Act on release, not on press: changing a target under a pressing hand
    // leaves that hand unable to grab (T04 finding).
    this.cleanupFuncs.push(
      this.tokens.onIntent((intent) => this.onIntent(intent)),
      this.queries.keepPressed.subscribe('disqualify', () => {
        this.keepRequested = true;
      }),
      this.queries.cardPressed.subscribe('disqualify', () => {
        this.expanded = !this.expanded;
        this.refreshIn = 0;
        console.info(`[shift] card ${this.expanded ? 'expanded' : 'collapsed'}`);
      }),
      this.queries.plinthPressed.subscribe('disqualify', (entity) => {
        this.verifyRequested = (entity.getValue(AdvisorPlinth, 'advisorId') ?? '') as AdvisorId;
      }),
      this.queries.startPressed.subscribe('disqualify', () => {
        this.startRequested = true;
      }),
      this.queries.pausePressed.subscribe('disqualify', () => {
        this.pauseRequested = true;
      }),
    );
    this.setStartShown(false);
  }

  /** Shift time as the runtime sees it: wall time with paused stretches removed. */
  private now(): number {
    const wall = performance.now();
    return wall - this.pausedTotalMs - (this.paused ? wall - this.pausedSince : 0);
  }

  update(delta: number, time: number): void {
    this.clock = time;
    if (this.ended) {
      return;
    }
    if (!this.started) {
      this.updateBeforeStart();
      return;
    }
    if (this.pauseRequested) {
      this.pauseRequested = false;
      this.togglePause();
    }
    if (this.paused) {
      this.refreshIn -= delta;
      if (this.refreshIn <= 0) {
        this.refreshIn = REFRESH_SEC;
        this.draw(this.now());
      }
      return;
    }
    const now = this.now();
    this.handle(this.runtime.tick(now));
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
    if (this.verifyRequested) {
      this.verify(this.verifyRequested, now);
      this.verifyRequested = '';
    }
    this.refreshIn -= delta;
    if (this.refreshIn <= 0) {
      this.refreshIn = REFRESH_SEC;
      this.draw(now);
    }
  }

  private updateBeforeStart(): void {
    const ready =
      this.world.visibilityState.peek() !== VisibilityState.NonImmersive &&
      this.placement.isPlaced;
    this.setStartShown(ready);
    if (ready && this.startRequested) {
      this.startRequested = false;
      this.started = true;
      this.setStartShown(false);
      console.info('[shift] start');
      this.handle(this.runtime.start(this.now()));
      this.refreshIn = 0;
      return;
    }
    this.startRequested = false;
    this.pauseRequested = false;
    this.ui.speech.set(ready ? 'ready' : 'idle', [
      { text: 'Second Opinion', bold: true, em: TEXT_EM.speechHead },
      { text: 'Commit your call. Then see if the AI agrees.', em: TEXT_EM.speech },
      ready
        ? { text: 'Poke Start shift when you are ready.', em: TEXT_EM.speech, color: '#ffd166' }
        : { text: 'Place your ward to begin.', em: TEXT_EM.speech, color: '#ffd166' },
    ]);
  }

  private togglePause(): void {
    const wall = performance.now();
    if (this.paused) {
      this.pausedTotalMs += wall - this.pausedSince;
      this.paused = false;
      showButtonLabel(this.ui.pause, 0);
      console.info(`[shift] resume remaining=${this.runtime.remainingSec(this.now()).toFixed(2)}s`);
    } else {
      console.info(`[shift] pause remaining=${this.runtime.remainingSec(this.now()).toFixed(2)}s`);
      this.pausedSince = wall;
      this.paused = true;
      showButtonLabel(this.ui.pause, 1);
    }
    this.refreshIn = 0;
  }

  private verify(advisorId: AdvisorId, now: number): void {
    const i = this.focus;
    if (this.stage.get(i) !== 'committed' || this.clock < (this.revealAt.get(i) ?? Infinity)) {
      this.showNotice(this.stage.get(i) === 'arrived' ? 'Make your own call first.' : '');
      return;
    }
    if (!this.runtime.availableVerifiers(i).includes(advisorId)) {
      const name = this.names[advisorId] ?? advisorId;
      const asked = this.runtime.publicView(i).verified ?? [];
      this.showNotice(
        !this.shift.lineup.includes(advisorId)
          ? `${name} is off duty this shift.`
          : this.lead.get(i)?.advisorId === advisorId
            ? `${name} is already advising on this patient.`
            : asked.some((v) => v.advisorId === advisorId)
              ? `You already asked ${name}.`
              : 'No second opinions left.',
      );
      console.info(`[shift] verify ${i} ${advisorId} not available tokens=${this.runtime.tokens}`);
      return;
    }
    const before = this.runtime.remainingSec(now);
    const result = this.runtime.verify(i, advisorId, now);
    const after = this.runtime.remainingSec(now);
    console.info(
      `[shift] verify ${i} ${advisorId} ok=${result.ok} tokens=${this.runtime.tokens} clock ${before.toFixed(2)}s -> ${after.toFixed(2)}s`,
    );
    if (result.ok) {
      this.showNotice(
        `Second opinion: 1 token spent, clock +${shiftConfig.verify.clockCostSeconds} s.`,
      );
    } else {
      this.showNotice(result.reason === 'no verify tokens left' ? 'No second opinions left.' : '');
    }
    this.handle(this.runtime.tick(now));
  }

  private showNotice(text: string): void {
    this.notice = text;
    this.noticeUntil = this.clock + NOTICE_SEC;
    this.refreshIn = 0;
  }

  private onIntent(intent: TokenIntent): void {
    const i = intent.tokenId;
    const now = this.now();
    const stage = this.stage.get(i);
    if (this.paused || !this.started) {
      this.tokens.revert(i);
    } else if (stage === 'arrived') {
      const result = this.runtime.commit(i, intent.zone, now);
      console.info(
        `[shift] commit ${i} ${intent.zone} ok=${result.ok}${result.ok ? ` lead=${result.lead.advisorId}` : ''}`,
      );
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
        this.onResolved(event);
      } else {
        this.finish();
      }
      this.refreshIn = 0;
    }
  }

  private onResolved(event: Extract<RuntimeEvent, { type: 'resolved' }>): void {
    const i = event.index;
    this.stage.delete(i);
    this.commitZone.delete(i);
    this.lead.delete(i);
    this.revealAt.delete(i);
    this.resolvedCount += 1;
    this.scoreTotal = this.runtime.score().total;
    // Where the token ends up is the runtime's logged final call.
    const entry = this.runtime.log().find((e) => e.index === i);
    this.tokens.retire(i, entry?.final ?? event.truth, TOKEN_LEAVE_SEC);
    this.trays.showTruth(event.truth);
    this.resultAt = this.clock;
    this.resultGrabs = this.tokens.grabs;
    this.resultKey = `result-${i}`;
    const head = event.missed
      ? // Penalty text straight from data/shift-config.json; the patient's total is the runtime's delta.
        `Too slow: auto-Amber, ${signed(shiftConfig.scoring.missedWindowPenalty)}. Patient ${i + 1}: ${signed(event.delta)}`
      : `Patient ${i + 1}: ${signed(event.delta)}`;
    this.resultLines = [
      { text: head, bold: true, em: TEXT_EM.speechHead },
      {
        text: `Answer: ${ZONE_MARK[event.truth]}`,
        bold: true,
        em: TEXT_EM.speech,
        color: ZONE_COLOR[event.truth],
      },
      { text: event.whyLine, em: TEXT_EM.speech },
    ];
    this.resultShort = {
      text: `Last: patient ${i + 1} ${signed(event.delta)}, answer ${ZONE_MARK[event.truth]}`,
      em: TEXT_EM.speech,
      color: ZONE_COLOR[event.truth],
    };
    console.info(
      `[shift] resolved ${i} truth=${event.truth} delta=${event.delta} reliance=${event.reliance} missed=${event.missed} score=${this.scoreTotal}`,
    );
  }

  private finish(): void {
    this.ended = true;
    const { score, debrief, tokensLeft } = this.runtime.summary();
    const lines = debriefLines(debrief, score);
    this.ui.debrief.set('debrief', lines);
    this.ui.debrief.mesh.visible = true;
    this.ui.speech.mesh.visible = false;
    this.ui.card.mesh.visible = false;
    this.setKeep(false);
    this.highlightPlinths(null, []);
    // Logged diff for T07 acceptance: every debrief sentence must be on the panel verbatim.
    const shown = new Set(lines.map((l) => l.text));
    const missing = debriefSentences(debrief).filter((s) => !shown.has(s));
    const indexShown = lines.some((l) =>
      l.text === (debrief.index === null
        ? 'Calibration index: Not enough data yet'
        : `Calibration index: ${debrief.index}`),
    );
    console.info(
      `[debrief] match=${missing.length === 0 && indexShown} missing=${JSON.stringify(missing)} index=${debrief.index} over=${debrief.overRelianceRate} under=${debrief.underRelianceRate} findings=${debrief.findings.length}`,
    );
    console.info(`[debrief] ${JSON.stringify(debrief)}`);
    console.info(
      `[shift] end score=${score.total} outcome=${score.outcome} restraint=${score.restraint} tokensLeft=${tokensLeft} elapsed=${this.runtime.elapsedSec(this.now()).toFixed(1)}s`,
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
    this.setKeep(adviceShown && !this.paused);
    const view = stage !== undefined ? this.runtime.publicView(i) : null;
    const verified = adviceShown && view?.verified ? view.verified : [];
    this.highlightPlinths(adviceShown && lead ? lead.advisorId : null, verified.map((v) => v.advisorId));

    if (view) {
      const left = Math.max(
        0,
        Math.ceil(view.arrivalSec + view.windowSec - this.runtime.elapsedSec(now)),
      );
      const v = view.case.vitals;
      const em = TEXT_EM.card;
      const lines: PanelLine[] = [
        {
          text: `Patient ${i + 1} · ${cap(view.case.ageBand)} · ${cap(view.case.category)} · ${left} s left`,
          bold: true,
          em,
          color: left <= 8 ? '#ffc35c' : '#9ec1ff',
        },
        { text: view.case.complaint, em },
      ];
      if (this.expanded) {
        lines.push({
          text: `Pulse ${v.pulse} · BP ${v.sbp}/${v.dbp} · Oxygen ${v.spo2}% · Temp ${v.temp}°`,
          em,
        });
      } else {
        lines.push({ text: 'Poke this card to read the vitals.', em, color: '#ffd166' });
      }
      card.set(`${i}-${left}-${this.expanded}`, lines);
    }

    // HUD line: always on top of the speech panel.
    const remaining = this.runtime.remainingSec(now);
    const tokensLeft = this.runtime.tokens;
    const hasTokens = this.shift.tokens !== null;
    const pips = hasTokens
      ? ` · Second opinions ${'●'.repeat(tokensLeft)}${'○'.repeat(Math.max(0, (this.shift.tokens ?? 0) - tokensLeft))} ${tokensLeft}`
      : '';
    const hud: PanelLine = {
      text: `${this.paused ? 'PAUSED · ' : ''}${clockText(remaining)} left · Patient ${Math.min(this.resolvedCount + 1, this.shift.patients.length)} of ${this.shift.patients.length} · Score ${this.scoreTotal}${pips}`,
      em: TEXT_EM.speech,
      color: remaining <= 30 ? '#ffc35c' : '#9ec1ff',
    };

    const resultActive =
      this.resultAt >= 0 &&
      (this.clock - this.resultAt < RESULT_MIN_SEC || this.tokens.grabs === this.resultGrabs);
    const noticeActive = this.notice !== '' && this.clock < this.noticeUntil;
    const em = TEXT_EM.speech;
    const body: PanelLine[] = [];
    let key: string;
    if (this.paused) {
      key = 'paused';
      body.push({ text: 'Paused', bold: true, em: TEXT_EM.speechHead });
      body.push({ text: 'Poke Resume to continue. The clock is stopped.', em });
    } else if (adviceShown && lead) {
      key = `advice-${i}-${verified.length}`;
      body.push({
        text: `${this.names[lead.advisorId] ?? lead.advisorId}: ${ZONE_MARK[lead.call]}  “${lead.line}”`,
        bold: true,
        em,
        color: ZONE_COLOR[lead.call],
      });
      for (const second of verified) {
        body.push({
          text: `${this.names[second.advisorId] ?? second.advisorId}: ${ZONE_MARK[second.call]}  “${second.line}”`,
          em,
          color: ZONE_COLOR[second.call],
        });
      }
      const canVerify = this.runtime.availableVerifiers(i).length > 0;
      body.push({
        text: canVerify
          ? 'Keep, move the token, or poke an advisor (1 token, clock +3 s).'
          : hasTokens && tokensLeft <= 0
            ? 'Keep or move the token. No second opinions left.'
            : 'Press Keep, or move the token to change your call.',
        em,
        color: '#ffd166',
      });
      if (resultActive && this.resultShort) {
        key += `-${this.resultKey}`;
        body.push(this.resultShort);
      }
    } else if (resultActive) {
      key = this.resultKey;
      body.push(...this.resultLines);
    } else if (stage === 'arrived' || uncommittedInHand) {
      key = 'prompt';
      body.push({ text: 'Make your own call first.', bold: true, em: TEXT_EM.speechHead });
    } else if (stage === 'committed') {
      key = 'hold';
      body.push({ text: '…', bold: true, em: TEXT_EM.speechHead });
    } else {
      key = 'waiting';
      body.push({ text: 'Next patient on the way.', em });
    }
    if (noticeActive && !this.paused) {
      key += `-n:${this.notice}`;
      body.push({ text: this.notice, em, bold: true, color: '#ffd166' });
    }
    this.ui.speech.set(`${hud.text}|${key}`, [hud, ...body]);
  }

  private highlightPlinths(lead: AdvisorId | null, verified: readonly AdvisorId[]): void {
    for (const plinth of ShiftSystem.plinths) {
      const hex =
        plinth.advisorId === lead ? 0x6a5a10 : verified.includes(plinth.advisorId) ? 0x24486e : 0x000000;
      plinth.stand.emissive.setHex(hex);
    }
  }

  private setStartShown(shown: boolean): void {
    if (shown === this.startShown) {
      return;
    }
    this.startShown = shown;
    const entity = ShiftSystem.startEntity;
    entity.setValue(Visibility, 'isVisible', shown);
    if (shown) {
      entity.addComponent(RayInteractable).addComponent(PokeInteractable);
    } else {
      if (entity.hasComponent(RayInteractable)) {
        entity.removeComponent(RayInteractable);
      }
      if (entity.hasComponent(PokeInteractable)) {
        entity.removeComponent(PokeInteractable);
      }
    }
  }

  private setKeep(enabled: boolean): void {
    if (enabled !== this.keepEnabled) {
      this.keepEnabled = enabled;
      this.ui.keep.cap.color.setHex(enabled ? PALETTE.keepOn : PALETTE.button);
      this.ui.keep.cap.emissive.setHex(enabled ? 0x2a5a1a : 0x000000);
    }
  }
}
