// SPIKE S6 (not shipped): does IWSDK's documented AudioSource play a positional
// one-shot from a tray after the XR-entry gesture? Loaded only from a temporary
// dev import; see spikes/S6.md.
import {
  AudioSource,
  AudioUtils,
  createSystem,
  PlaybackMode,
  VisibilityState,
} from '@iwsdk/core';
import { Tray } from '../game/components.js';

export class S6AudioSpike extends createSystem({ trays: { required: [Tray] } }) {
  private armed = false;
  private fired = false;
  private wait = 0;

  update(delta: number): void {
    const inXR = this.world.visibilityState.peek() !== VisibilityState.NonImmersive;
    if (!inXR || this.fired) {
      return;
    }
    const tray = [...this.queries.trays.entities][0];
    if (!tray) {
      return;
    }
    if (!this.armed) {
      this.armed = true;
      tray.addComponent(AudioSource, {
        src: `${import.meta.env.BASE_URL}audio/s6-test.wav`,
        positional: true,
        refDistance: 0.5,
        playbackMode: PlaybackMode.Restart,
      });
      void AudioUtils.preload(tray).then(() => console.info('[S6] loaded'));
      return;
    }
    this.wait += delta;
    if (this.wait > 2 && tray.getValue(AudioSource, '_loaded')) {
      AudioUtils.play(tray);
      this.fired = true;
      const ctx = (
        this.player.head.children.find((c) => c.type === 'AudioListener') as
          | { context: AudioContext }
          | undefined
      )?.context;
      console.info(`[S6] play requested, context=${ctx?.state}`);
      setTimeout(
        () => console.info(`[S6] isPlaying after 50 ms = ${AudioUtils.isPlaying(tray)}, context=${ctx?.state}`),
        50,
      );
      setTimeout(
        () => console.info(`[S6] isPlaying after 600 ms = ${AudioUtils.isPlaying(tray)}`),
        600,
      );
    }
  }
}
