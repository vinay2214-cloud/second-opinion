/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { PanelSystem } from './panel.js';
import { RobotSystem } from './robot.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.registerSystem(RobotSystem);
  world.registerSystem(PanelSystem);
  // Spike S2 (dev only; the dynamic import keeps it out of the deployed build). Remove with T04.
  if (import.meta.env.DEV) {
    void Promise.all([
      import('./spikes/s2-components.js'),
      import('./spikes/s2-release.js'),
    ]).then(([components, release]) => {
      world
        .registerComponent(components.SpikeToken)
        .registerComponent(components.SpikeTray);
      world.registerSystem(release.S2ReleaseSystem);
    });
  }
});
