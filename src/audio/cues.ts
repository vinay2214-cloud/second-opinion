// The game's five sound cues (proposals/audio-brief.md), synthesised with the
// Web Audio API: oscillators and gain envelopes, no files. Quiet and short.
// Every cue has a visual twin elsewhere; nothing depends on a cue playing.
// playCue never throws and never waits: if sound is off, or the audio context
// is not running yet (no user gesture), the cue is skipped.
import { access } from '../access/access.js';

export type Cue = 'stamp' | 'advice' | 'verify' | 'surge' | 'resultRight' | 'resultWrong';

interface Note {
  wave: OscillatorType;
  /** Hz. With `to`, the pitch glides from `hz` to `to` over the note. */
  hz: number;
  to?: number;
  /** Seconds after the cue fires. */
  at: number;
  /** Seconds. */
  len: number;
  /** Relative to the master gain. */
  peak: number;
}

/** About -15 dB. */
const MASTER_GAIN = 0.18;
const ATTACK_SEC = 0.008;
const SILENT = 0.0001;

const RECIPES: Record<Cue, readonly Note[]> = {
  stamp: [
    { wave: 'sine', hz: 170, to: 85, at: 0, len: 0.14, peak: 1 },
    { wave: 'triangle', hz: 1100, at: 0, len: 0.03, peak: 0.25 },
  ],
  advice: [
    { wave: 'sine', hz: 587, at: 0, len: 0.1, peak: 0.6 },
    { wave: 'sine', hz: 784, at: 0.09, len: 0.15, peak: 0.6 },
  ],
  verify: [
    { wave: 'triangle', hz: 1319, at: 0, len: 0.05, peak: 0.45 },
    { wave: 'triangle', hz: 1760, at: 0.06, len: 0.12, peak: 0.45 },
  ],
  surge: [
    { wave: 'sine', hz: 523, at: 0, len: 0.16, peak: 0.7 },
    { wave: 'sine', hz: 523, at: 0.2, len: 0.16, peak: 0.7 },
  ],
  resultRight: [
    { wave: 'sine', hz: 523, at: 0, len: 0.12, peak: 0.7 },
    { wave: 'sine', hz: 784, at: 0.11, len: 0.19, peak: 0.7 },
  ],
  resultWrong: [
    { wave: 'sine', hz: 392, at: 0, len: 0.12, peak: 0.5 },
    { wave: 'sine', hz: 294, at: 0.11, len: 0.19, peak: 0.5 },
  ],
};

let provider: (() => AudioContext | null) | null = null;
let own: AudioContext | null = null;
let master: GainNode | null = null;
let masterOf: AudioContext | null = null;
let meter: AnalyserNode | null = null;

/**
 * Where to find an audio context that the framework resumes on XR entry
 * (spikes/S6.md). Without one, a context of our own is created on first use.
 */
export function setAudioContextProvider(find: () => AudioContext | null): void {
  provider = find;
}

function context(): AudioContext | null {
  const shared = provider?.() ?? null;
  if (shared) {
    return shared;
  }
  if (!own && typeof AudioContext !== 'undefined') {
    own = new AudioContext();
  }
  return own;
}

/** Play one cue now. Returns whether it was scheduled. */
export function playCue(cue: Cue): boolean {
  if (!access.soundOn) {
    return false;
  }
  try {
    const ctx = context();
    if (!ctx) {
      return false;
    }
    if (ctx.state !== 'running') {
      // Allowed only after a user gesture; this cue is skipped either way.
      void ctx.resume().catch(() => undefined);
      return false;
    }
    if (!master || masterOf !== ctx) {
      master = ctx.createGain();
      master.gain.value = MASTER_GAIN;
      master.connect(ctx.destination);
      masterOf = ctx;
      meter = null;
      if (import.meta.env.DEV) {
        // Dev builds only: lets the headless emulator log that a signal was produced.
        meter = ctx.createAnalyser();
        meter.fftSize = 2048;
        master.connect(meter);
      }
    }
    const t0 = ctx.currentTime + 0.005;
    for (const note of RECIPES[cue]) {
      const start = t0 + note.at;
      const end = start + note.len;
      const osc = ctx.createOscillator();
      osc.type = note.wave;
      osc.frequency.setValueAtTime(note.hz, start);
      if (note.to) {
        osc.frequency.exponentialRampToValueAtTime(note.to, end);
      }
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(SILENT, start);
      gain.gain.linearRampToValueAtTime(note.peak, start + ATTACK_SEC);
      gain.gain.exponentialRampToValueAtTime(SILENT, end);
      osc.connect(gain).connect(master);
      osc.start(start);
      osc.stop(end + 0.02);
    }
    if (import.meta.env.DEV && meter) {
      const probe = meter;
      setTimeout(() => {
        const samples = new Float32Array(probe.fftSize);
        probe.getFloatTimeDomainData(samples);
        let peak = 0;
        for (const s of samples) peak = Math.max(peak, Math.abs(s));
        console.info(`[audio] ${cue} peak=${peak.toFixed(3)}`);
      }, 60);
    }
    return true;
  } catch {
    return false;
  }
}
