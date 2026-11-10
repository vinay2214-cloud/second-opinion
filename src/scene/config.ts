// Layout and placement starting values (docs/04 section 3). Design values to
// test on device, kept in one place. Game tuning lives in data/*.json, not here.
export const WARD = {
  width: 0.6,
  depth: 0.4,
  /** Ward centre, metres in front of the player's head. Back edge lands at 60 cm. */
  forward: 0.4,
  /** Virtual table top, metres below eye level. */
  below: 0.4,
} as const;

export const PLACEMENT = {
  /** No usable plane after this long: fall back to the virtual table (FR-04). */
  planeTimeoutSec: 5,
  /** A plane was found but nobody pinched: accept it so the player is never stuck. */
  confirmTimeoutSec: 15,
  /** A table-like plane sits this far below the eyes. Excludes floor and ceiling. */
  minBelowEyes: 0.2,
  maxBelowEyes: 0.95,
  /** Furthest plane edge (horizontal metres from the head) we will place on. */
  maxPlaneDistance: 0.8,
} as const;

export const TRAY = { size: 0.11, gap: 0.04 } as const;
export const TOKEN = { size: 0.05 } as const;

export type Zone = 'red' | 'amber' | 'green';
export const ZONES: readonly Zone[] = ['red', 'amber', 'green'];
