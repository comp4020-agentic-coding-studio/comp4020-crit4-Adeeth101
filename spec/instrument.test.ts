// The week's spec, as far as a machine can hold it.
//
// Crit 4 has nine clauses. Four of them are mechanically checkable and are
// asserted here; the rest ("it is expressive", "a stranger can play it
// uninstructed") are ear-and-eye judgements that belong to the crit, not to
// vitest, and pretending otherwise would just be a test that always passes.
//
// Each describe below names the clause it stands for, so a failure says which
// part of the brief just broke rather than which function did.

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it } from "vitest";

import { PENTATONIC, PADS, midiForPad, midiToFrequency } from "../src/scale.ts";
import { LANES, activeStepCount, defaultPattern, emptyPattern, rollPattern } from "../src/pattern.ts";
import { STEPS, stepDuration, swingOffset } from "../src/timing.ts";
import { buildGrid } from "../src/ui/grid.ts";
import { buildPads } from "../src/ui/pads.ts";

const DIST = resolve("dist");

function shippedFiles(dir: string = DIST): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? shippedFiles(path) : [relative(DIST, path).split(sep).join("/")];
  });
}

describe("clause 2: the browser is the instrument", () => {
  const shipped = shippedFiles();

  it("ships no audio files at all", () => {
    // The clause is that sound is *made* in the page, not played back. The
    // sharpest version of that is a build with nothing to play back from.
    const audio = shipped.filter((name) => /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|webm)$/i.test(name));
    expect(audio, `dist ships ${audio.join(", ")} — the sound must be synthesised, not loaded`).toEqual([]);
  });

  it("has no <audio> element and loads no media", () => {
    const doc = new JSDOM(readFileSync(join(DIST, "index.html"), "utf8")).window.document;
    expect(doc.querySelector("audio")).toBeNull();
    expect(doc.querySelector("video")).toBeNull();
  });

  it("builds every drum lane from a synthesis routine", () => {
    // Six lanes on the grid means six voices in the synth; a lane the kit
    // can't speak for would be a silent row a player could fill in vain.
    const source = readFileSync(resolve("src/audio/drums.ts"), "utf8");
    for (const lane of LANES) {
      expect(source, `no case for the ${lane.id} lane in drums.ts`).toContain(`case "${lane.id}"`);
    }
  });
});

describe("clause 4: the opening screen invites the first sound", () => {
  it("opens on a pattern that already plays", () => {
    // No empty grid, so a stranger's first touch lands on a running beat
    // rather than on silence they then have to debug.
    const pattern = defaultPattern();
    expect(activeStepCount(pattern)).toBeGreaterThan(4);
  });

  it("gives the kick, the snare and the hats something to do", () => {
    const pattern = defaultPattern();
    const voiced = LANES.filter((_, lane) => pattern[lane].some(Boolean)).map((lane) => lane.id);
    expect(voiced).toEqual(expect.arrayContaining(["kick", "snare", "closed"]));
  });

  it("does not gate the instrument behind a wall of instructions", () => {
    const doc = new JSDOM(readFileSync(join(DIST, "index.html"), "utf8")).window.document;
    const hint = doc.querySelector('[data-testid="hint"]');
    expect(hint, "the one-line invitation is missing").toBeTruthy();
    // One short line. If this grows into a paragraph, it has become the wall
    // the clause rules out.
    expect(hint!.textContent!.trim().split(/\s+/).length).toBeLessThan(16);
  });
});

describe("clause 5: playable with whatever is at hand", () => {
  let dom: JSDOM;

  beforeEach(() => {
    dom = new JSDOM("<!doctype html><body><div id='grid'></div><div id='pads'></div></body>");
    const anyGlobal = globalThis as unknown as Record<string, unknown>;
    anyGlobal.document = dom.window.document;
    anyGlobal.window = dom.window;
  });

  it("makes every step a real button, so a keyboard reaches it", () => {
    const root = dom.window.document.getElementById("grid")!;
    buildGrid(root as unknown as HTMLElement, defaultPattern(), {
      onToggle() {},
      onAudition() {},
    });
    const steps = root.querySelectorAll("button.step");
    expect(steps.length).toBe(LANES.length * STEPS);
    for (const step of steps) {
      expect(step.getAttribute("aria-pressed")).toMatch(/^(true|false)$/);
      expect(step.getAttribute("aria-label")).toBeTruthy();
    }
  });

  it("makes every bass pad a real button, and labels its key", () => {
    const root = dom.window.document.getElementById("pads")!;
    buildPads(root as unknown as HTMLElement, { onNoteOn() {}, onNoteOff() {} });
    const pads = root.querySelectorAll("button.pad");
    expect(pads.length).toBe(PADS.length);
    pads.forEach((pad, index) => {
      expect(pad.textContent).toContain(PADS[index].key.toUpperCase());
    });
  });

  it("reflects a held pad in the DOM, however the note arrived", () => {
    const root = dom.window.document.getElementById("pads")!;
    const view = buildPads(root as unknown as HTMLElement, { onNoteOn() {}, onNoteOff() {} });
    view.press(2);
    expect(root.querySelector('[data-pad="2"]')!.getAttribute("data-held")).toBe("true");
    view.release(2);
    expect(root.querySelector('[data-pad="2"]')!.hasAttribute("data-held")).toBe(false);
  });
});

describe("clause 6: there is no way to play it wrong", () => {
  it("puts every pad in the scale, so no key can sound wrong", () => {
    // This is the clause held in code rather than in good intentions: the
    // instrument has no out-of-key note to find.
    for (const pad of PADS) {
      const degree = ((pad.midi - midiForPad(0)) % 12 + 12) % 12;
      expect(PENTATONIC, `pad ${pad.index} (${pad.name}) is outside the scale`).toContain(degree);
    }
  });

  it("keeps the pads in ascending order", () => {
    const frequencies = PADS.map((pad) => pad.frequency);
    expect(frequencies).toEqual([...frequencies].sort((a, b) => a - b));
  });

  it("keeps the bass in bass register", () => {
    expect(midiToFrequency(PADS[0].midi)).toBeGreaterThan(30);
    expect(midiToFrequency(PADS.at(-1)!.midi)).toBeLessThan(200);
  });

  it("never rolls a beat with no kick and no snare in it", () => {
    // Roll is the one control that plays for you, so it must not be able to
    // hand a player a pattern that sounds broken.
    for (let seed = 0; seed < 60; seed += 1) {
      let n = seed + 1;
      const random = (): number => {
        n = (n * 1103515245 + 12345) % 2147483648;
        return n / 2147483648;
      };
      const pattern = rollPattern(random);
      expect(pattern[0].some(Boolean), `roll ${seed} had no kick`).toBe(true);
      expect(pattern[1].some(Boolean), `roll ${seed} had no snare`).toBe(true);
    }
  });

  it("has no score, no lives and no fail state anywhere in the source", () => {
    // Comments are stripped first: the clause is about what the code does,
    // and prose about a palette that "lives in one place" is not a scoreboard.
    const stripComments = (source: string): string =>
      source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");

    const source = [
      "main.ts",
      "src/pattern.ts",
      "src/scale.ts",
      "src/timing.ts",
      "src/ui/grid.ts",
      "src/ui/pads.ts",
    ]
      .map((file) => stripComments(readFileSync(resolve(file), "utf8")))
      .join("\n");

    // Deliberately crude. It exists to fail loudly if a later change starts
    // keeping score, which is the one thing this instrument must never do.
    expect(source).not.toMatch(/\b(score|highScore|lives|gameOver|streak|combo)\b/i);
  });
});

describe("the clock", () => {
  it("puts sixteen steps in a bar at the stated tempo", () => {
    // 174 bpm: a beat is 60/174 s, a step is a quarter of that, a bar is 16.
    expect(stepDuration(174) * 16).toBeCloseTo((60 / 174) * 4, 10);
  });

  it("leaves on-grid steps alone and pushes off-grid steps later", () => {
    expect(swingOffset(0, 174, 0.5)).toBe(0);
    expect(swingOffset(2, 174, 0.5)).toBe(0);
    expect(swingOffset(1, 174, 0.5)).toBeGreaterThan(0);
  });

  it("tops out at a triplet feel, never past the next step", () => {
    const full = swingOffset(1, 174, 1);
    expect(full).toBeCloseTo(stepDuration(174) / 3, 10);
    expect(full).toBeLessThan(stepDuration(174));
  });

  it("does not swing when swing is off", () => {
    for (let step = 0; step < STEPS; step += 1) {
      expect(swingOffset(step, 174, 0)).toBe(0);
    }
  });
});

describe("the pattern", () => {
  it("gives every lane a full bar of steps", () => {
    const pattern = emptyPattern();
    expect(pattern.length).toBe(LANES.length);
    for (const row of pattern) expect(row.length).toBe(STEPS);
  });

  it("opens on the two-step the genre is built on", () => {
    const pattern = defaultPattern();
    expect(pattern[0][0], "kick on the 1").toBe(true);
    expect(pattern[1][4], "snare on the 2").toBe(true);
    expect(pattern[1][12], "snare on the 4").toBe(true);
  });
});
