// Timing maths for the sequencer. Pure functions, no Web Audio — the spec
// tests reach these directly in jsdom, where AudioContext doesn't exist.

/** A bar is 16 sixteenth-note steps. The grid is one bar. */
export const STEPS = 16;

/** The tempo range drum and bass sits in. The tempo slider clamps to it. */
export const MIN_BPM = 150;
export const MAX_BPM = 180;

/** Seconds per sixteenth-note step. */
export function stepDuration(bpm: number): number {
  return 60 / bpm / 4;
}

/**
 * Swing pushes every off-grid sixteenth later, which is what turns a stiff
 * machine pattern into something that leans. Even steps stay nailed to the
 * grid so the beat itself never drifts.
 *
 * `swing` is 0 (straight) to 1 (an eighth-note triplet feel). Returns the
 * offset in seconds to add to this step's grid time — never accumulated into
 * the grid itself, or the loop would run slow.
 */
export function swingOffset(step: number, bpm: number, swing: number): number {
  if (step % 2 === 0) return 0;
  // Within an eighth note (two steps) a straight pair splits 1/2:1/2 and a
  // triplet pair splits 2/3:1/3, so the off-step moves from 1 step to 4/3 of
  // one. A third of a step is therefore full swing, not the whole step.
  return swing * stepDuration(bpm) * (1 / 3);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
