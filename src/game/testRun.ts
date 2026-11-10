// Dev-only overrides for scripted emulator runs (the CLI cannot open a URL
// with query parameters). Ignored in production builds. Keep the defaults
// (null) committed.
export const TEST_RUN: {
  seed: string | null;
  module: 'module1' | 'module2' | 'module3' | null;
  /** Shift clock multiplier for idle length checks. 1 = real time. */
  speed: number | null;
} = { seed: null, module: null, speed: null };
