// The ward diorama. Local frame: origin = ward centre on the table top,
// +X = player's right, +Z = toward the player, +Y = up. Flat low-poly, no shadows.
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  OctahedronGeometry,
  RingGeometry,
  MeshBasicMaterial,
  SphereGeometry,
} from '@iwsdk/core';
import { TRAY, WARD, ZONES, type Zone } from './config.js';
import { createFlatLabel } from './label.js';
import { PALETTE } from './palette.js';

export interface TrayParts {
  zone: Zone;
  root: Group;
  /** Thin ring used for the highlight and the stamp pulse. */
  ring: Mesh;
}

export interface WardParts {
  root: Group;
  /** Everything except the placement pad, so it can be hidden while placing. */
  content: Group;
  virtualTable: Mesh;
  trays: TrayParts[];
  /** Where a waiting token rests on the arrival lane. */
  laneSlot: Object3D;
  plinths: Group[];
  recentreButton: Group;
  placementPad: Mesh;
}

const lambert = (color: number) => new MeshLambertMaterial({ color });

const ZONE_SHAPE_SEGMENTS: Record<Zone, number> = { red: 3, amber: 4, green: 32 };
const ZONE_TEXT: Record<Zone, string> = { red: 'RED', amber: 'AMBER', green: 'GREEN' };

/** Tray centres along X. The lane takes the left 13 cm, three trays the rest. */
export const TRAY_X: Record<Zone, number> = { red: -0.075, amber: 0.075, green: 0.225 };
export const LANE_X = -0.225;

function buildTray(zone: Zone): TrayParts {
  const root = new Group();
  root.name = `Tray ${ZONE_TEXT[zone]}`;
  const base = new Mesh(
    new BoxGeometry(TRAY.size, 0.008, TRAY.size),
    lambert(PALETTE.trayBase),
  );
  base.position.y = 0.004;
  root.add(base);

  // Shape code: triangle / diamond / circle (FR-50). Never colour alone.
  const shape = new Mesh(
    new CylinderGeometry(0.034, 0.034, 0.005, ZONE_SHAPE_SEGMENTS[zone]),
    lambert(PALETTE[zone]),
  );
  shape.position.set(0, 0.0105, -0.014);
  if (zone === 'red') {
    shape.rotation.y = Math.PI; // apex away from the player
  }
  root.add(shape);

  const label = createFlatLabel(ZONE_TEXT[zone], {
    width: 0.094,
    height: 0.024,
    color: PALETTE.text,
  });
  label.position.set(0, 0.0085, 0.039);
  root.add(label);

  const ring = new Mesh(
    new RingGeometry(0.058, 0.064, 4, 1, Math.PI / 4),
    new MeshBasicMaterial({
      color: PALETTE.accent,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.009;
  ring.name = `Tray Ring ${ZONE_TEXT[zone]}`;
  root.add(ring);

  root.position.set(TRAY_X[zone], 0.005, 0);
  return { zone, root, ring };
}

function buildPlinth(index: number): Group {
  const plinth = new Group();
  plinth.name = `Advisor Plinth ${index + 1}`;
  const stand = new Mesh(
    new CylinderGeometry(0.026, 0.03, 0.03, 12),
    lambert(PALETTE.plinth),
  );
  stand.position.y = 0.015;
  plinth.add(stand);
  // Four distinct silhouettes, one per advisor. Names and badges arrive in T06.
  const bodies = [
    new ConeGeometry(0.02, 0.042, 6),
    new BoxGeometry(0.034, 0.034, 0.034),
    new SphereGeometry(0.021, 10, 8),
    new OctahedronGeometry(0.024),
  ];
  const body = new Mesh(bodies[index % bodies.length], lambert(PALETTE.advisor));
  body.position.y = 0.054;
  plinth.add(body);
  plinth.position.set(-0.135 + index * 0.09, 0.005, -0.15);
  return plinth;
}

export function buildWard(): WardParts {
  const root = new Group();
  root.name = 'Ward';
  const content = new Group();
  content.name = 'Ward Content';
  root.add(content);

  content.add(new HemisphereLight(0xffffff, 0x3a4a66, 1.6));
  const sun = new DirectionalLight(0xffffff, 1.2);
  sun.position.set(0.3, 1, 0.6);
  content.add(sun);

  const virtualTable = new Mesh(
    new BoxGeometry(WARD.width + 0.12, 0.03, WARD.depth + 0.12),
    lambert(PALETTE.table),
  );
  virtualTable.name = 'Virtual Table';
  virtualTable.position.y = -0.0155;
  virtualTable.visible = false;
  content.add(virtualTable);

  const floor = new Mesh(
    new BoxGeometry(WARD.width, 0.005, WARD.depth),
    lambert(PALETTE.floor),
  );
  floor.name = 'Ward Floor';
  floor.position.y = 0.0025;
  content.add(floor);

  const lane = new Mesh(new BoxGeometry(0.13, 0.003, 0.24), lambert(PALETTE.lane));
  lane.name = 'Arrival Lane';
  lane.position.set(LANE_X, 0.0065, 0.04);
  content.add(lane);

  const laneSlot = new Mesh(
    new CylinderGeometry(0.036, 0.036, 0.002, 24),
    lambert(PALETTE.laneSlot),
  );
  laneSlot.name = 'Lane Slot';
  laneSlot.position.set(LANE_X, 0.009, 0.06);
  content.add(laneSlot);

  const rail = new Mesh(new BoxGeometry(0.4, 0.003, 0.07), lambert(PALETTE.rail));
  rail.name = 'Advisor Rail';
  rail.position.set(0, 0.0065, -0.15);
  content.add(rail);

  const plinths = [0, 1, 2, 3].map(buildPlinth);
  plinths.forEach((plinth) => content.add(plinth));

  const trays = ZONES.map(buildTray);
  trays.forEach((tray) => content.add(tray.root));

  const recentreButton = new Group();
  recentreButton.name = 'Re-centre Button';
  const cap = new Mesh(new BoxGeometry(0.05, 0.012, 0.05), lambert(PALETTE.button));
  cap.position.y = 0.006;
  recentreButton.add(cap);
  const capLabel = createFlatLabel('RE-CENTRE', {
    width: 0.046,
    height: 0.012,
    color: PALETTE.text,
  });
  capLabel.position.y = 0.0125;
  recentreButton.add(capLabel);
  recentreButton.position.set(0.255, 0.005, 0.16);
  content.add(recentreButton);

  const footer = createFlatLabel('Fictional game logic. Not medical advice.', {
    width: 0.3,
    height: 0.014,
    color: PALETTE.text,
    bold: false,
  });
  footer.position.set(0.0, 0.0056, 0.188);
  content.add(footer);

  // Placement pad: the ward's footprint, shown on a detected table until confirmed.
  const placementPad = new Mesh(
    new BoxGeometry(WARD.width, 0.004, WARD.depth),
    new MeshBasicMaterial({
      color: PALETTE.accent,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  );
  placementPad.name = 'Placement Pad';
  placementPad.position.y = 0.002;
  placementPad.visible = false;

  return {
    root,
    content,
    virtualTable,
    trays,
    laneSlot,
    plinths,
    recentreButton,
    placementPad,
  };
}
