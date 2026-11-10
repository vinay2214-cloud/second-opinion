import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { bootstrapWard } from './scene/bootstrap.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  bootstrapWard(world);
});
