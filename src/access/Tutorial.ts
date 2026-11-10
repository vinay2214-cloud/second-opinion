// Six-beat ghost-hand onboarding (docs/04 section 6). It watches what the
// player has done on the first patient and shows one short line plus a
// demonstration. It never changes game state; ShiftSystem asks it whether the
// shift clock should wait.
import { Vector3 } from '@iwsdk/core';
import type { GhostHand } from './ghostHand.js';

export interface TutorialState {
  /** 'none' before the first patient arrives. */
  stage: 'none' | 'arrived' | 'committed' | 'resolved';
  cardExpanded: boolean;
  tokenTouched: boolean;
  adviceShown: boolean;
}

const LINES = [
  '',
  'Place your ward.',
  'A patient arrives. Poke to read.',
  'Make your own call first.',
  'Now hear the advisor.',
  'Keep your call, or change it.',
  'That is the answer.',
];
const ADVICE_READ_SEC = 3;
const REVEAL_SEC = 5;

export class Tutorial {
  /** 0 = off, 2 to 6 = beats during the first patient, 7 = just finished. */
  beat = 0;
  private beatTime = 0;
  private total = 0;
  private loop = 0;
  private patientHere = false;
  private from = new Vector3();
  private to = new Vector3();

  constructor(
    private ghost: GhostHand,
    private tokenRest: Vector3,
    private trayRests: Vector3[],
    private keepRest: Vector3,
    private cardRest: Vector3,
  ) {}

  start(): void {
    this.beat = 2;
    this.beatTime = 0;
    this.total = 0;
    this.patientHere = false;
    console.info('[tutorial] start');
  }

  stop(): void {
    this.beat = 0;
    this.ghost.root.visible = false;
  }

  get active(): boolean {
    return this.beat >= 2 && this.beat <= 6;
  }

  /** The shift clock waits while the player is learning a step. */
  get holdsClock(): boolean {
    return this.patientHere && this.beat >= 2 && this.beat <= 5;
  }

  get line(): string {
    return this.patientHere ? (LINES[this.beat] ?? '') : '';
  }

  /** Returns true on the frame the tutorial completes. */
  update(delta: number, s: TutorialState): boolean {
    if (!this.active) {
      return false;
    }
    this.patientHere = s.stage !== 'none';
    if (!this.patientHere) {
      return false; // the first patient has not arrived yet
    }
    this.beatTime += delta;
    this.total += delta;
    this.loop += delta;
    let next = this.beat;
    if (s.stage === 'resolved') {
      next = this.beat < 6 ? 6 : this.beatTime > REVEAL_SEC ? 7 : 6;
    } else if (s.stage === 'committed') {
      next = !s.adviceShown ? 4 : this.beat === 4 && this.beatTime < ADVICE_READ_SEC ? 4 : 5;
      if (this.beat < 4) next = 4;
    } else if (s.stage === 'arrived') {
      next = s.cardExpanded || s.tokenTouched ? 3 : 2;
    }
    if (next !== this.beat) {
      this.beat = next;
      this.beatTime = 0;
      this.loop = 0;
      console.info(`[tutorial] beat ${next} t=${this.total.toFixed(1)}s`);
    }
    this.animate();
    if (this.beat === 7) {
      this.ghost.root.visible = false;
      console.info(`[tutorial] complete t=${this.total.toFixed(1)}s`);
      return true;
    }
    return false;
  }

  private animate(): void {
    const g = this.ghost;
    if (this.beat === 3) {
      // Pick up the token, carry it to a tray, let go. A different tray each
      // time, so the demonstration does not suggest an answer.
      const cycle = 2.6;
      const n = Math.floor(this.loop / cycle);
      const t = (this.loop % cycle) / cycle;
      this.from.copy(this.tokenRest);
      this.to.copy(this.trayRests[n % this.trayRests.length]);
      g.root.visible = true;
      const carry = Math.min(1, Math.max(0, (t - 0.2) / 0.5));
      const eased = carry * carry * (3 - 2 * carry);
      g.root.position.lerpVectors(this.from, this.to, eased);
      g.root.position.y += 0.01 + 0.035 * Math.sin(eased * Math.PI);
      g.token.visible = t > 0.15 && t < 0.8;
      g.material.opacity = t > 0.85 ? 0.5 * (1 - (t - 0.85) / 0.15) : 0.5;
    } else if (this.beat === 2 || this.beat === 5) {
      // One poke: down onto the target and back up.
      const cycle = 1.6;
      const t = (this.loop % cycle) / cycle;
      g.root.visible = true;
      g.token.visible = false;
      g.material.opacity = 0.5;
      g.root.position.copy(this.beat === 2 ? this.cardRest : this.keepRest);
      g.root.position.y += 0.004 + 0.03 * Math.abs(Math.cos(t * Math.PI));
    } else {
      g.root.visible = false;
    }
  }
}
