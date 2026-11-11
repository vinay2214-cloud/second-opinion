// Adapter between the pure shift runtime (src/core) and the table.
// It forwards input (tray releases, Keep, advisor pokes, module buttons,
// Pause, settings, card poke) to the runtime and draws what the runtime
// returns. It never computes a score, an advisor call or a reliance label.
// Advice is drawn only after commit() succeeded and the 0.6 s hold passed,
// and never while an uncommitted token is in a hand.
import {
  createSystem,
  type Entity,
  PokeInteractable,
  Pressed,
  RayInteractable,
  Vector3,
  Visibility,
  VisibilityState,
} from '@iwsdk/core';
import { access, type ToggleKey } from '../../access/access.js';
import type { GhostHand } from '../../access/ghostHand.js';
import { Tutorial } from '../../access/Tutorial.js';
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
import { recordShift } from '../../persist/history.js';
import { ZONES } from '../../scene/config.js';
import { PALETTE } from '../../scene/palette.js';
import {
  buildDriftBadge,
  labelPlinth,
  scalePanels,
  type ShiftUiParts,
  showButtonLabel,
  TEXT_EM,
} from '../../scene/shiftUi.js';
import type { WardParts } from '../../scene/ward.js';
import { debriefLines, debriefSentences } from '../../ui/debriefText.js';
import type { PanelLine } from '../../ui/TextPanel.js';
import { trustMapLines } from '../../ui/trustMapText.js';
import {
  AdvisorPlinth,
  KeepButton,
  PauseButton,
  SettingsButton,
  SettingToggle,
  StartButton,
  type TokenIntent,
  VitalsCard,
} from '../components.js';
import { localDate } from '../localDate.js';
import { TEST_RUN } from '../testRun.js';
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
/** No hand seen for this long freezes the shift (docs/04 section 5). */
const TRACKING_LOST_SEC = 0.8;
const TRACKING_CHECK_SEC = 0.2;

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
const MODULE_ORDER: readonly ModuleId[] = ['module1', 'module2', 'module3'];
/** Module names from docs/02 section 9 (display only). */
const MODULE_NAME: Record<ModuleId, string> = {
  module1: 'Commit First',
  module2: 'Read the Tells',
  module3: 'Pressure and Drift',
};
/** Stated confidence (a runtime value) shown as a word. */
const CONFIDENCE_WORD: Record<string, string> = { medium: '', high: 'sure', very_high: 'very sure' };
const ACCENT = '#ffd166';
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const clockText = (sec: number): string => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

type Stage = 'arrived' | 'committed';
type FreezeReason = 'pause' | 'tracking' | 'settings' | 'tutorial';

export interface PlinthView {
  entity: Entity;
  advisorId: AdvisorId;
  stand: { emissive: { setHex(hex: number): void } };
  body: { color: { setHex(hex: number): void } };
  /** Set by ShiftSystem. */
  label?: { material: unknown; visible: boolean };
  badge?: { visible: boolean };
}

export class ShiftSystem extends createSystem({
  keepPressed: { required: [KeepButton, Pressed] },
  cardPressed: { required: [VitalsCard, Pressed] },
  plinthPressed: { required: [AdvisorPlinth, Pressed] },
  startPressed: { required: [StartButton, Pressed] },
  pausePressed: { required: [PauseButton, Pressed] },
  settingsPressed: { required: [SettingsButton, Pressed] },
  togglePressed: { required: [SettingToggle, Pressed] },
}) {
  /** Set by bootstrap before registration. */
  static ui: ShiftUiParts;
  static ward: WardParts;
  static ghost: GhostHand;
  static plinths: PlinthView[];
  static startEntities: Entity[];
  static toggleEntities: Entity[];
  static cardEntity: Entity;

  private runtime!: ShiftRuntime;
  private shift!: Shift;
  private tokens!: TokenSystem;
  private trays!: TraySystem;
  private placement!: PlacementSystem;
  private ui!: ShiftUiParts;
  private tutorial!: Tutorial;

  private started = false;
  private ended = false;
  private clock = 0;
  private refreshIn = 0;
  private expanded = false;
  private keepRequested = false;
  private startRequested = 0;
  private pauseRequested = false;
  private settingsRequested = false;
  private toggleRequested: ToggleKey | '' = '';
  private verifyRequested: AdvisorId | '' = '';
  private keepEnabled = false;
  private adviceVisible = false;
  private settingsOpen = false;
  private seed = 'ward-a';
  private speed = 1;
  private driftShown = false;
  private firstShift = true;
  /** Which near-edge row is live: module buttons, settings toggles, the card, or nothing. */
  private row: 'none' | 'starts' | 'toggles' | 'card' = 'none';
  /**
   * Time. The runtime only ever sees wall time minus the time spent frozen.
   * pause, tracking and settings also block input; tutorial only stops the clock.
   */
  private freeze: Record<FreezeReason, boolean> = {
    pause: false,
    tracking: false,
    settings: false,
    tutorial: false,
  };
  private frozenSince = 0;
  private frozenTotalMs = 0;
  private trackingCheckIn = 0;
  private lostFor = 0;
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
  private debriefShown: PanelLine[] = [];
  private mapLines: PanelLine[] = [];
  private mapOpen = false;
  private idleClock = 0;
  private notice = '';
  private noticeUntil = 0;
  private names: Partial<Record<AdvisorId, string>> = {};

  init(): void {
    this.ui = ShiftSystem.ui;
    this.tokens = this.world.getSystem(TokenSystem) as TokenSystem;
    this.trays = this.world.getSystem(TraySystem) as TraySystem;
    this.placement = this.world.getSystem(PlacementSystem) as PlacementSystem;

    const params = new URLSearchParams(window.location.search);
    const dev = import.meta.env.DEV;
    this.seed = (dev && TEST_RUN.seed) || params.get('seed') || 'ward-a';
    const speed = Number((dev && (TEST_RUN.speed || params.get('speed'))) || 1);
    this.speed = Number.isFinite(speed) && speed >= 1 && speed <= 16 ? speed : 1;
    for (const plinth of ShiftSystem.plinths) {
      const id = plinth.advisorId;
      const name = advisorData.advisors[id].name; // display name only
      this.names[id] = name;
      plinth.label = labelPlinth(plinth.entity.object3D!, name, true);
      plinth.badge = buildDriftBadge(plinth.entity.object3D!, name, advisorData.drift.cueText);
    }
    const rest = new Vector3();
    const up = (v: Vector3, y: number) => v.clone().setY(v.y + y);
    this.tutorial = new Tutorial(
      ShiftSystem.ghost,
      up(TokenSystem.laneSlots[0], 0.03),
      ZONES.map((zone) => up(this.trays.restPosition(zone, rest), 0.03)),
      up(this.ui.keep.root.position, 0.016),
      up(this.ui.card.mesh.position, 0.02),
    );
    console.info(
      `[shift] ready seed=${this.seed} speed=${this.speed} settings=${JSON.stringify(access.settings)} tutorial=${access.tutorialOn}`,
    );

    // Act on release, not on press: changing a target under a pressing hand
    // leaves that hand unable to grab (T04 finding).
    this.cleanupFuncs.push(
      this.tokens.onIntent((intent) => this.onIntent(intent)),
      this.queries.keepPressed.subscribe('disqualify', () => {
        this.keepRequested = true;
      }),
      this.queries.cardPressed.subscribe('disqualify', () => {
        // A poke opens the vitals and they stay open. There is no poke-to-close:
        // a hand reaching over the card toward the lane must not hide them.
        if (!this.expanded) {
          this.expanded = true;
          this.refreshIn = 0;
          console.info('[shift] card expanded');
        }
      }),
      this.queries.plinthPressed.subscribe('disqualify', (entity) => {
        this.verifyRequested = (entity.getValue(AdvisorPlinth, 'advisorId') ?? '') as AdvisorId;
      }),
      this.queries.startPressed.subscribe('disqualify', (entity) => {
        this.startRequested = entity.getValue(StartButton, 'module') ?? 0;
      }),
      this.queries.pausePressed.subscribe('disqualify', () => {
        this.pauseRequested = true;
      }),
      this.queries.settingsPressed.subscribe('disqualify', () => {
        this.settingsRequested = true;
      }),
      this.queries.togglePressed.subscribe('disqualify', (entity) => {
        this.toggleRequested = (entity.getValue(SettingToggle, 'key') ?? '') as ToggleKey;
      }),
    );
    for (const entity of [...ShiftSystem.startEntities, ...ShiftSystem.toggleEntities, ShiftSystem.cardEntity]) {
      entity.setValue(Visibility, 'isVisible', false);
    }
    this.applyAccess();
  }

  // ---- time -------------------------------------------------------------

  private get frozen(): boolean {
    const f = this.freeze;
    return f.pause || f.tracking || f.settings || f.tutorial;
  }

  /** Input is refused while paused, while hands are lost, or in settings. */
  private get blocked(): boolean {
    const f = this.freeze;
    return f.pause || f.tracking || f.settings;
  }

  private setFreeze(reason: FreezeReason, on: boolean): void {
    if (this.freeze[reason] === on) {
      return;
    }
    const wall = performance.now();
    const was = this.frozen;
    this.freeze[reason] = on;
    if (!was && this.frozen) {
      this.frozenSince = wall;
    } else if (was && !this.frozen) {
      this.frozenTotalMs += wall - this.frozenSince;
    }
    this.refreshIn = 0;
  }

  /** Shift time as the runtime sees it: wall time with frozen stretches removed. */
  private now(): number {
    const wall = performance.now();
    return (wall - this.frozenTotalMs - (this.frozen ? wall - this.frozenSince : 0)) * this.speed;
  }

  // ---- frame ------------------------------------------------------------

  update(delta: number, time: number): void {
    this.clock = time;
    this.updateSettings();
    const playing = this.started && !this.ended;
    const inXR = this.world.visibilityState.peek() !== VisibilityState.NonImmersive;
    const ready = inXR && this.placement.isPlaced;
    this.setRow(
      this.settingsOpen ? 'toggles' : !ready ? 'none' : !playing ? 'starts' : this.stage.has(this.focus) ? 'card' : 'none',
    );
    if (!playing) {
      this.updateIdle(ready);
      return;
    }
    this.updateTracking(delta);
    if (this.pauseRequested) {
      this.pauseRequested = false;
      if (!this.settingsOpen && !this.freeze.tracking) {
        this.setFreeze('pause', !this.freeze.pause);
        showButtonLabel(this.ui.pause, this.freeze.pause ? 1 : 0);
        console.info(
          `[shift] ${this.freeze.pause ? 'pause' : 'resume'} remaining=${this.runtime.remainingSec(this.now()).toFixed(2)}s`,
        );
      }
    }
    if (this.tutorial.active) {
      const first = this.stage.get(0);
      const done = this.tutorial.update(this.blocked ? 0 : delta, {
        stage: first ?? (this.resolvedCount > 0 ? 'resolved' : 'none'),
        cardExpanded: this.expanded,
        tokenTouched: this.tokens.lastTouched === 0 && this.tokens.grabs > 0,
        adviceShown: this.adviceVisible,
      });
      this.setFreeze('tutorial', this.tutorial.holdsClock);
      if (done) {
        access.tutorialCompleted();
        this.applyAccess();
      }
    }
    const now = this.now();
    if (!this.blocked) {
      this.handle(this.runtime.tick(now));
      if (this.ended) {
        return;
      }
      if (this.keepRequested) {
        const zone = this.commitZone.get(this.focus);
        if (this.keepEnabled && zone) {
          const result = this.runtime.finalize(this.focus, zone, now);
          console.info(`[shift] keep ${this.focus} ${zone} ok=${result.ok}`);
          this.handle(this.runtime.tick(now));
        }
      }
      if (this.verifyRequested) {
        this.verify(this.verifyRequested, now);
      }
    }
    this.keepRequested = false;
    this.verifyRequested = '';
    if (this.ended) {
      return;
    }
    this.refreshIn -= delta;
    if (this.refreshIn <= 0) {
      this.refreshIn = REFRESH_SEC;
      this.draw(now);
    }
  }

  /** Before the first shift and after a debrief: the module buttons are live. */
  private updateIdle(ready: boolean): void {
    const asked = this.startRequested;
    const flip = this.keepRequested;
    this.startRequested = 0;
    this.pauseRequested = false;
    this.keepRequested = false;
    this.verifyRequested = '';
    if (ready && asked > 0 && !this.settingsOpen && this.tokens.heldCount === 0) {
      console.info(`[shift] start pressed module=${asked}`);
      this.begin(MODULE_ORDER[asked - 1]);
      return;
    }
    // Redraw at most four times a second (and at once after any input).
    this.refreshIn -= this.clock - this.idleClock;
    this.idleClock = this.clock;
    if (this.refreshIn > 0 && !flip) {
      return;
    }
    this.refreshIn = REFRESH_SEC;
    if (this.ended) {
      // On the debrief the Keep button switches between the review and the trust map.
      if (flip && !this.settingsOpen) {
        this.mapOpen = !this.mapOpen;
        showButtonLabel(this.ui.keep, this.mapOpen ? 2 : 1);
        console.info(`[debrief] view=${this.mapOpen ? 'trust map' : 'review'}`);
      }
      this.ui.debrief.set(this.mapOpen ? 'map' : 'debrief', this.mapOpen ? this.mapLines : this.debriefShown);
      return;
    }
    const em = TEXT_EM.speech;
    const lines: PanelLine[] = [
      { text: 'Second Opinion', bold: true, em: TEXT_EM.speechHead },
      { text: 'Commit your call. Then see if the AI agrees.', em },
    ];
    if (this.settingsOpen) {
      lines.push(...this.settingsLines());
    } else if (ready) {
      lines.push({ text: 'Sit at a table. Keep drinks away from your hands.', em, color: '#9ec1ff' });
      MODULE_ORDER.forEach((id, i) => {
        const patients = shiftConfig.modules[id].patients;
        lines.push({
          text: `Module ${i + 1} · ${MODULE_NAME[id]} · ${patients} patients${i === 0 && this.firstShift ? ' · start here' : ''}`,
          em,
          bold: i === 0 && this.firstShift,
        });
      });
      lines.push({ text: 'Poke a module to start.', em, color: ACCENT });
    } else if (this.world.visibilityState.peek() === VisibilityState.NonImmersive) {
      lines.push({ text: 'This is a mixed-reality game for Meta Quest.', em, color: '#9ec1ff' });
      lines.push({ text: 'Open this page on the headset and enter XR to play.', em, color: ACCENT });
    } else {
      lines.push({ text: 'Place your ward to begin.', em, color: ACCENT });
    }
    this.ui.speech.set(lines.map((l) => l.text).join('|'), lines);
  }

  // ---- settings and accessibility ---------------------------------------

  private updateSettings(): void {
    if (this.settingsRequested) {
      this.settingsRequested = false;
      this.settingsOpen = !this.settingsOpen;
      showButtonLabel(this.ui.settings, this.settingsOpen ? 1 : 0);
      if (this.started && !this.ended) {
        this.setFreeze('settings', this.settingsOpen);
      }
      console.info(`[settings] ${this.settingsOpen ? 'open' : 'closed'}`);
      this.refreshIn = 0;
    }
    const key = this.toggleRequested;
    this.toggleRequested = '';
    if (key && this.settingsOpen) {
      const changed = access.toggle(key);
      this.notice = !changed
        ? 'Finish the tutorial once to turn it off.'
        : key === 'calm' && this.started && !this.ended
          ? 'Calm mode applies from the next shift.'
          : '';
      this.noticeUntil = this.clock + NOTICE_SEC;
      console.info(`[settings] ${key}=${access.isOn(key)} changed=${changed}`);
      this.applyAccess();
    }
  }

  private settingsLines(): PanelLine[] {
    const em = TEXT_EM.speech;
    const lines: PanelLine[] = [
      { text: 'Settings', bold: true, em: TEXT_EM.speechHead },
      { text: 'Contrast: black panels, white outlines.', em },
      { text: 'Calm: slower arrivals, longer windows.', em },
      { text: 'Big text: larger panels.', em },
      { text: 'One hand is enough for every action. Sound is off.', em, color: '#9ec1ff' },
      { text: 'Poke Done to go back.', em, color: ACCENT },
    ];
    if (this.notice !== '' && this.clock < this.noticeUntil) {
      lines.push({ text: this.notice, em, bold: true, color: ACCENT });
    }
    return lines;
  }

  /** Apply the saved settings to everything on the table. Safe to call at any time. */
  private applyAccess(): void {
    const contrast = access.settings.highContrast;
    const ward = ShiftSystem.ward;
    const paint = (mesh: { material: unknown }, normal: number) =>
      (mesh.material as { color: { setHex(hex: number): void } }).color.setHex(contrast ? 0x000000 : normal);
    paint(ward.floor, PALETTE.floor);
    paint(ward.lane, PALETTE.lane);
    paint(ward.rail, PALETTE.rail);
    for (const tray of ward.trays) {
      tray.frame.visible = contrast;
    }
    scalePanels(this.ui, access.panelScale);
    for (const toggle of this.ui.toggles) {
      const on = access.isOn(toggle.key);
      showButtonLabel(toggle.parts, on ? 1 : 0);
      toggle.parts.cap.color.setHex(on ? PALETTE.keepOn : PALETTE.button);
    }
    this.ui.starts.forEach((b, i) => {
      b.cap.emissive.setHex(i === 0 && this.firstShift ? 0x2a5a1a : 0x000000);
    });
    this.refreshIn = 0;
  }

  /** Only the visible near-edge row takes pokes; hidden targets must not. */
  private setRow(row: 'none' | 'starts' | 'toggles' | 'card'): void {
    if (row === this.row) {
      return;
    }
    this.row = row;
    const set = (entity: Entity, on: boolean) => {
      entity.setValue(Visibility, 'isVisible', on);
      if (on) {
        if (!entity.hasComponent(RayInteractable)) entity.addComponent(RayInteractable);
        if (!entity.hasComponent(PokeInteractable)) entity.addComponent(PokeInteractable);
      } else {
        if (entity.hasComponent(RayInteractable)) entity.removeComponent(RayInteractable);
        if (entity.hasComponent(PokeInteractable)) entity.removeComponent(PokeInteractable);
      }
    };
    ShiftSystem.startEntities.forEach((e) => set(e, row === 'starts'));
    ShiftSystem.toggleEntities.forEach((e) => set(e, row === 'toggles'));
    set(ShiftSystem.cardEntity, row === 'card');
  }

  /** Freeze the shift while no hand (or controller) has a pose. One hand is enough. */
  private updateTracking(delta: number): void {
    this.trackingCheckIn -= delta;
    if (this.trackingCheckIn > 0) {
      return;
    }
    this.trackingCheckIn = TRACKING_CHECK_SEC;
    const frame = this.renderer.xr.getFrame();
    const space = this.renderer.xr.getReferenceSpace();
    let tracked = !frame || !space; // outside a session there is nothing to lose
    if (frame && space) {
      for (const side of ['left', 'right'] as const) {
        const source = this.input.xr.getPrimaryInputSource(side);
        if (source && frame.getPose(source.gripSpace ?? source.targetRaySpace, space)) {
          tracked = true;
        }
      }
    }
    this.lostFor = tracked ? 0 : this.lostFor + TRACKING_CHECK_SEC;
    const lost = this.lostFor >= TRACKING_LOST_SEC;
    if (lost !== this.freeze.tracking) {
      this.setFreeze('tracking', lost);
      console.info(
        `[shift] tracking ${lost ? 'lost' : 'resumed'} remaining=${this.runtime.remainingSec(this.now()).toFixed(2)}s`,
      );
    }
  }

  // ---- shift ------------------------------------------------------------

  private begin(module: ModuleId): void {
    this.ended = false;
    this.stage.clear();
    this.commitZone.clear();
    this.lead.clear();
    this.revealAt.clear();
    this.focus = -1;
    this.scoreTotal = 0;
    this.resolvedCount = 0;
    this.resultAt = -1;
    this.resultKey = '';
    this.notice = '';
    this.driftShown = false;
    this.adviceVisible = false;
    this.freeze = { pause: false, tracking: false, settings: false, tutorial: false };
    this.frozenTotalMs = 0;
    this.lostFor = 0;
    showButtonLabel(this.ui.pause, 0);
    showButtonLabel(this.ui.keep, 0);
    this.mapOpen = false;
    this.ui.keep.cap.color.setHex(PALETTE.button);
    this.keepEnabled = false;
    this.ui.debrief.mesh.visible = false;
    this.ui.speech.mesh.visible = true;

    this.shift = buildShift({ seed: this.seed, cases: loadCases(), module });
    for (const plinth of ShiftSystem.plinths) {
      const onDuty = this.shift.lineup.includes(plinth.advisorId);
      plinth.body.color.setHex(onDuty ? PALETTE.advisor : PALETTE.advisorOff);
      (plinth.label?.material as { opacity: number }).opacity = onDuty ? 1 : 0.4;
      if (plinth.badge) {
        plinth.badge.visible = false;
        if (plinth.label) {
          plinth.label.visible = true;
        }
      }
    }
    const calm = access.settings.calm;
    this.runtime = createShiftRuntime({ shift: this.shift, advisorNames: this.names, calm });
    this.started = true;
    this.tutorial.stop();
    if (module === 'module1' && access.tutorialOn) {
      this.expanded = false; // the tutorial teaches the poke
      this.tutorial.start();
    }
    console.info(
      `[shift] start seed=${this.seed} module=${module} patients=${this.shift.patients.length} tokens=${this.runtime.tokens} lineup=${this.shift.lineup.join(',')} drift=${this.shift.drift ? `${this.shift.drift.advisorId}/${this.shift.drift.category}@${this.shift.drift.atIndex}` : 'none'} calm=${calm} tutorial=${this.tutorial.active} speed=${this.speed}`,
    );
    console.info('[shift] start');
    this.handle(this.runtime.start(this.now()));
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
    if (this.blocked || !this.started || this.ended) {
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
        const surge = this.runtime.publicView(event.index).surge;
        console.info(
          `[shift] arrive ${event.index}${surge ? ' surge' : ''} t=${this.runtime.elapsedSec(this.now()).toFixed(1)}s`,
        );
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
    this.firstShift = false;
    this.tutorial.stop();
    const { score, debrief, tokensLeft, entries } = this.runtime.summary();
    this.mapLines = trustMapLines(entries, this.shift.lineup);
    this.mapOpen = false;
    const lines = debriefLines(debrief, score);
    // History and streak (T05). The date comes from localDate.ts, the only wall-clock read.
    const history = recordShift({ index: debrief.index, score: score.total }, localDate());
    lines.push({
      text: `Day streak: ${history.streak} · Shifts recorded: ${history.entries.length}`,
      em: TEXT_EM.debrief,
      color: '#9ec1ff',
    });
    lines.push({
      text: 'Poke Map for your trust map, or a module to play again.',
      em: TEXT_EM.debrief,
      color: '#9ec1ff',
    });
    this.debriefShown = lines;
    this.ui.debrief.set('debrief', lines);
    this.ui.debrief.mesh.visible = true;
    this.ui.speech.mesh.visible = false;
    this.setKeep(false);
    showButtonLabel(this.ui.keep, 1);
    this.ui.keep.cap.color.setHex(PALETTE.keepOn);
    this.highlightPlinths(null, []);
    for (const plinth of ShiftSystem.plinths) {
      if (plinth.badge) {
        plinth.badge.visible = false;
        if (plinth.label) {
          plinth.label.visible = true;
        }
      }
    }
    this.applyAccess();
    // Logged diff (T07 acceptance): every debrief sentence must be on the panel verbatim.
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
      `[shift] end module=${this.shift.module} score=${score.total} outcome=${score.outcome} restraint=${score.restraint} tokensLeft=${tokensLeft} elapsed=${this.runtime.elapsedSec(this.now()).toFixed(1)}s seed=${this.seed} calm=${access.settings.calm} streak=${history.streak} recorded=${history.entries.length}`,
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
    this.adviceVisible = adviceShown;
    this.setKeep(adviceShown && !this.blocked);
    const view = stage !== undefined ? this.runtime.publicView(i) : null;
    const verified = adviceShown && view?.verified ? view.verified : [];
    this.highlightPlinths(adviceShown && lead ? lead.advisorId : null, verified.map((v) => v.advisorId));

    // Window rings on every waiting token, from the runtime's arrival and window times.
    const elapsed = this.runtime.elapsedSec(now);
    for (const index of this.stage.keys()) {
      const pv = this.runtime.publicView(index);
      const left = pv.arrivalSec + pv.windowSec - elapsed;
      this.tokens.setWindow(index, left / pv.windowSec, left <= 8, pv.surge);
    }

    // Drift cue: a quiet tag, shown when the runtime says so.
    const cue = this.runtime.driftCue(now);
    for (const plinth of ShiftSystem.plinths) {
      if (plinth.badge) {
        plinth.badge.visible = !!cue && cue.advisorId === plinth.advisorId;
        if (plinth.label) {
          plinth.label.visible = !plinth.badge.visible; // the tag carries the name
        }
      }
    }
    if (cue && !this.driftShown) {
      this.driftShown = true;
      console.info(`[shift] drift cue shown advisor=${cue.advisorId} text="${cue.text}" resolved=${this.resolvedCount}`);
    }

    if (view) {
      const left = Math.max(0, Math.ceil(view.arrivalSec + view.windowSec - elapsed));
      const v = view.case.vitals;
      const em = TEXT_EM.card;
      const lines: PanelLine[] = [
        {
          text: `${view.surge ? 'SURGE' : 'Patient'} ${i + 1} · ${cap(view.case.ageBand)} · ${cap(view.case.category)} · ${left} s`,
          bold: true,
          em,
          color: left <= 8 ? '#ffc35c' : '#9ec1ff',
        },
        { text: view.case.complaint, em },
        this.expanded
          ? { text: `Pulse ${v.pulse} · BP ${v.sbp}/${v.dbp} · O₂ ${v.spo2}% · ${v.temp}°C`, em }
          : { text: 'Poke this card to read the vitals.', em, color: ACCENT },
      ];
      this.ui.card.set(`${i}-${left}-${this.expanded}`, lines);
    }

    // HUD line: always on top of the speech panel.
    const remaining = this.runtime.remainingSec(now);
    const tokensLeft = this.runtime.tokens;
    const hasTokens = this.shift.tokens !== null;
    const pips = hasTokens
      ? ` · Opinions ${'●'.repeat(tokensLeft)}${'○'.repeat(Math.max(0, (this.shift.tokens ?? 0) - tokensLeft))}`
      : '';
    const hud: PanelLine = {
      text: `${clockText(remaining)} left · Patient ${Math.min(this.resolvedCount + 1, this.shift.patients.length)}/${this.shift.patients.length} · Score ${this.scoreTotal}${pips}`,
      em: TEXT_EM.speech,
      color: remaining <= 30 ? '#ffc35c' : '#9ec1ff',
    };

    const resultActive =
      this.resultAt >= 0 &&
      (this.clock - this.resultAt < RESULT_MIN_SEC || this.tokens.grabs === this.resultGrabs);
    const noticeActive = this.notice !== '' && this.clock < this.noticeUntil;
    const teach = this.tutorial.active ? this.tutorial.line : '';
    const em = TEXT_EM.speech;
    const head = TEXT_EM.speechHead;
    const body: PanelLine[] = [];
    if (this.freeze.tracking) {
      body.push({ text: 'Show your hands to continue.', bold: true, em: head });
      body.push({ text: 'The clock is stopped.', em });
    } else if (this.settingsOpen) {
      body.push(...this.settingsLines());
    } else if (this.freeze.pause) {
      body.push({ text: 'Paused', bold: true, em: head });
      body.push({ text: 'Poke Play to continue. The clock is stopped.', em });
    } else if (adviceShown && lead) {
      // One call line per advisor heard. Up to two quotes stay on screen:
      // the lead advisor's and the latest second opinion's.
      const said = (advice: { advisorId: AdvisorId; call: Zone }, confidence: string): PanelLine => {
        const word = CONFIDENCE_WORD[confidence] ?? '';
        return {
          text: `${this.names[advice.advisorId] ?? advice.advisorId}${word ? `, ${word}` : ''}: ${ZONE_MARK[advice.call]}`,
          bold: true,
          em,
          color: ZONE_COLOR[advice.call],
        };
      };
      const verySure = lead.statedConfidence === 'very_high';
      body.push(said(lead, lead.statedConfidence));
      body.push({ text: `“${lead.line}”`, em, italic: verySure });
      verified.forEach((second, k) => {
        body.push(said(second, ''));
        if (k === verified.length - 1) {
          body.push({ text: `“${second.line}”`, em });
        }
      });
      if (teach) {
        body.push({ text: teach, em, bold: true, color: ACCENT });
      } else if (noticeActive) {
        body.push({ text: this.notice, em, bold: true, color: ACCENT });
      } else {
        const canVerify = this.runtime.availableVerifiers(i).length > 0;
        body.push({
          text: canVerify
            ? `Keep, move the token, or ask an advisor (1 ●, clock +${shiftConfig.verify.clockCostSeconds} s).`
            : hasTokens && tokensLeft <= 0
              ? 'Keep or move the token. No second opinions left.'
              : 'Press Keep, or move the token to change your call.',
          em,
          color: ACCENT,
        });
      }
      if (resultActive && this.resultShort && verified.length === 0) {
        body.push(this.resultShort);
      }
    } else if (resultActive && !(teach && this.tutorial.beat < 6)) {
      body.push(...this.resultLines);
      if (teach) {
        body.push({ text: teach, em, bold: true, color: ACCENT });
      }
    } else if (teach) {
      body.push({ text: teach, bold: true, em: head, color: ACCENT });
    } else if (stage === 'arrived' || uncommittedInHand) {
      body.push({ text: 'Make your own call first.', bold: true, em: head });
    } else if (stage === 'committed') {
      body.push({ text: '…', bold: true, em: head });
    } else {
      body.push({ text: 'Next patient on the way.', em });
    }
    if (noticeActive && !this.blocked && !(adviceShown && lead)) {
      body.push({ text: this.notice, em, bold: true, color: ACCENT });
    }
    const all = [hud, ...body];
    this.ui.speech.set(all.map((l) => l.text).join('|'), all);
  }

  private highlightPlinths(lead: AdvisorId | null, verified: readonly AdvisorId[]): void {
    for (const plinth of ShiftSystem.plinths) {
      const hex =
        plinth.advisorId === lead ? 0x6a5a10 : verified.includes(plinth.advisorId) ? 0x24486e : 0x000000;
      plinth.stand.emissive.setHex(hex);
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
