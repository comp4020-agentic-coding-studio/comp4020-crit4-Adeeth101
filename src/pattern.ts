// The drum pattern: which lane fires on which step. Pure state, no Web Audio.

import { STEPS } from "./timing.ts";

export interface Lane {
  readonly id: LaneId;
  readonly label: string;
  /** Drives the lane's colour in CSS, so the palette lives in one place. */
  readonly hue: number;
}

export type LaneId = "kick" | "snare" | "clap" | "closed" | "open" | "ride";

export const LANES: readonly Lane[] = [
  { id: "kick", label: "Kick", hue: 18 },
  { id: "snare", label: "Snare", hue: 342 },
  { id: "clap", label: "Clap", hue: 288 },
  { id: "closed", label: "Hat", hue: 190 },
  { id: "open", label: "Open", hue: 158 },
  { id: "ride", label: "Ride", hue: 48 },
];

/** `pattern[lane][step]`. */
export type Pattern = boolean[][];

export function emptyPattern(): Pattern {
  return LANES.map(() => new Array<boolean>(STEPS).fill(false));
}

function place(pattern: Pattern, lane: LaneId, steps: readonly number[]): void {
  const row = pattern[LANES.findIndex((l) => l.id === lane)];
  for (const step of steps) row[step] = true;
}

/**
 * The pattern the page opens on, and the reason there is no "click play" wall:
 * a stranger's first touch lands on a beat that already exists, so the
 * instrument makes a sound before they have decided what they are doing.
 *
 * It's the canonical drum-and-bass two-step — kick on the 1 and the "and" of
 * 3, snare on the 2 and the 4 — which is the pattern the genre is built on.
 */
export function defaultPattern(): Pattern {
  const pattern = emptyPattern();
  place(pattern, "kick", [0, 10]);
  place(pattern, "snare", [4, 12]);
  place(pattern, "closed", [0, 2, 4, 6, 8, 10, 12]);
  place(pattern, "open", [14]);
  place(pattern, "ride", [7]);
  return pattern;
}

export function clonePattern(pattern: Pattern): Pattern {
  return pattern.map((row) => [...row]);
}

/**
 * A fresh beat, weighted per lane so the roll stays listenable: the kick and
 * snare keep the skeleton of a two-step, the hats fill in, the rest garnish.
 * Nothing here can produce silence in the lanes that carry the groove.
 */
export function rollPattern(random: () => number = Math.random): Pattern {
  const pattern = emptyPattern();

  // Anchors, so a roll is always a beat rather than a maybe.
  place(pattern, "kick", [0]);
  place(pattern, "snare", [4, 12]);

  const chance: Record<LaneId, number> = {
    kick: 0.1,
    snare: 0.05,
    clap: 0.06,
    closed: 0.45,
    open: 0.1,
    ride: 0.14,
  };

  LANES.forEach((lane, laneIndex) => {
    for (let step = 0; step < STEPS; step += 1) {
      // Off-beats get a lighter hand, which is what keeps a random grid from
      // turning into a wall of sixteenths.
      const weight = step % 4 === 0 ? 1 : step % 2 === 0 ? 0.75 : 0.45;
      if (random() < chance[lane.id] * weight) pattern[laneIndex][step] = true;
    }
  });

  // A second kick somewhere in the back half is what makes it drum and bass
  // rather than a house loop.
  pattern[0][8 + Math.floor(random() * 8)] = true;
  return pattern;
}

export function activeStepCount(pattern: Pattern): number {
  return pattern.reduce((total, row) => total + row.filter(Boolean).length, 0);
}
