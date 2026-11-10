// Spike S2: how do we know a grabbed token was released, and over which tray?
// Method: `Grabbed` is a transient tag managed by GrabSystem (grab/grabbed.d.ts).
// A query on [SpikeToken, Grabbed] fires 'qualify' on pickup and 'disqualify'
// on release. On release we compare the token's world position to each tray.
// Throwaway: delete with src/spikes/ once T04 lands.
import {
  BoxGeometry,
  createSystem,
  Grabbed,
  Mesh,
  MeshStandardMaterial,
  OneHandGrabbable,
  Vector3,
} from '@iwsdk/core';
import { SpikeToken, SpikeTray } from './s2-components.js';

const DROP_HEIGHT = 0.12; // token may be released up to 12 cm above a tray

export class S2ReleaseSystem extends createSystem({
  held: { required: [SpikeToken, Grabbed] },
  trays: { required: [SpikeTray] },
}) {
  private tokenPos = new Vector3();
  private trayPos = new Vector3();

  init(): void {
    const cube = new Mesh(
      new BoxGeometry(0.05, 0.05, 0.05),
      new MeshStandardMaterial({ color: 0x4f8cff }),
    );
    cube.name = 'S2 Cube';
    cube.position.set(-0.12, 1.0, -0.4);
    this.world
      .createTransformEntity(cube)
      .addComponent(SpikeToken)
      .addComponent(OneHandGrabbable, { rotate: false });

    const tray = new Mesh(
      new BoxGeometry(0.11, 0.01, 0.11),
      new MeshStandardMaterial({ color: 0xd9a400 }),
    );
    tray.name = 'S2 Tray';
    tray.position.set(0.12, 0.95, -0.4);
    this.world
      .createTransformEntity(tray)
      .addComponent(SpikeTray, { zone: 'amber', halfSize: 0.055 });

    this.cleanupFuncs.push(
      this.queries.held.subscribe('qualify', () => {
        console.log('[S2] grabbed');
      }),
      this.queries.held.subscribe('disqualify', (entity) => {
        const token = entity.object3D;
        if (token == null) {
          return;
        }
        token.getWorldPosition(this.tokenPos);
        let zone = '';
        for (const trayEntity of this.queries.trays.entities) {
          const trayObject = trayEntity.object3D;
          if (trayObject == null) {
            continue;
          }
          trayObject.getWorldPosition(this.trayPos);
          const half = trayEntity.getValue(SpikeTray, 'halfSize') ?? 0;
          const dy = this.tokenPos.y - this.trayPos.y;
          if (
            Math.abs(this.tokenPos.x - this.trayPos.x) <= half &&
            Math.abs(this.tokenPos.z - this.trayPos.z) <= half &&
            dy >= -0.02 &&
            dy <= DROP_HEIGHT
          ) {
            zone = trayEntity.getValue(SpikeTray, 'zone') ?? '';
          }
        }
        console.log(
          zone
            ? `[S2] released over tray ${zone}`
            : '[S2] released over nothing',
          this.tokenPos.x.toFixed(3),
          this.tokenPos.y.toFixed(3),
          this.tokenPos.z.toFixed(3),
        );
      }),
    );
  }
}
