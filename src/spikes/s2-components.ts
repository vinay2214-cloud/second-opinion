// Spike S2 only. Throwaway: delete with src/spikes/ once T04 lands.
import { createComponent, Types } from '@iwsdk/core';

export const SpikeToken = createComponent('SpikeToken', {});

export const SpikeTray = createComponent('SpikeTray', {
  zone: { type: Types.String, default: '' },
  halfSize: { type: Types.Float32, default: 0.055 },
});
