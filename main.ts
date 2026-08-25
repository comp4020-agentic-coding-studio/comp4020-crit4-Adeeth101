// Wiring. The page builds and renders with no AudioContext at all; the engine
// is created by the first thing the player does, whatever that turns out to
// be — a grid cell, a pad, a key, the play button.

import { BassVoice, DEFAULT_BASS, type BassSettings } from "./src/audio/bass.ts";
import { triggerDrum } from "./src/audio/drums.ts";
import { createEngine, type Engine } from "./src/audio/engine.ts";
import { Transport } from "./src/audio/transport.ts";
import { LANES, defaultPattern, emptyPattern, rollPattern } from "./src/pattern.ts";
import { KEYS } from "./src/scale.ts";
import { MAX_BPM, MIN_BPM, clamp } from "./src/timing.ts";
import { buildGrid } from "./src/ui/grid.ts";
import { buildPads } from "./src/ui/pads.ts";
import { attachScope } from "./src/ui/scope.ts";

function need<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`missing ${selector}`);
  return element;
}

const gridRoot = need<HTMLElement>('[data-testid="grid"]');
const padRoot = need<HTMLElement>('[data-testid="pads"]');
const scopeCanvas = need<HTMLCanvasElement>('[data-testid="scope"]');
const hint = need<HTMLElement>('[data-testid="hint"]');
const playButton = need<HTMLButtonElement>('[data-testid="play"]');
const rollButton = need<HTMLButtonElement>('[data-testid="roll"]');
const clearButton = need<HTMLButtonElement>('[data-testid="clear"]');

const tempo = need<HTMLInputElement>("#tempo");
const swing = need<HTMLInputElement>("#swing");
const cutoff = need<HTMLInputElement>("#cutoff");
const reese = need<HTMLInputElement>("#reese");
const drive = need<HTMLInputElement>("#drive");
const glide = need<HTMLInputElement>("#glide");

let pattern = defaultPattern();
const bassSettings: BassSettings = { ...DEFAULT_BASS };

let engine: Engine | null = null;
let bass: BassVoice | null = null;
let transport: Transport | null = null;

/**
 * Create the engine if it isn't there, start the loop if it isn't running, and
 * retire the hint. Returns whether this call started the transport, so a
 * caller can tell "I just woke it up" from "it was already going".
 */
function begin(): boolean {
  if (!engine) {
    const created = createEngine();
    engine = created;
    bass = new BassVoice(created);
    bass.apply(bassSettings);
    attachScope(scopeCanvas, created.analyser);

    transport = new Transport(created.ctx, (step, when) => {
      LANES.forEach((lane, laneIndex) => {
        if (pattern[laneIndex][step]) triggerDrum(created, lane.id, when);
      });
    });
    transport.bpm = clamp(Number(tempo.value), MIN_BPM, MAX_BPM);
    transport.swing = Number(swing.value) / 100;
    requestAnimationFrame(paint);
  }

  void engine.ctx.resume();
  hint.setAttribute("data-dismissed", "true");

  if (transport && !transport.running) {
    transport.start();
    reflectTransport();
    return true;
  }
  return false;
}

function reflectTransport(): void {
  const running = transport?.running ?? false;
  playButton.setAttribute("aria-pressed", String(running));
  const label = playButton.querySelector(".key-action-label");
  if (label) label.textContent = running ? "Stop" : "Play";
}

/** One rAF loop for everything visual: the playhead, then the cells that hit. */
function paint(): void {
  requestAnimationFrame(paint);
  if (!transport?.running) {
    grid.setPlayhead(null);
    return;
  }
  const step = transport.currentStep();
  if (step === null) return;
  grid.setPlayhead(step);
  LANES.forEach((_, laneIndex) => {
    if (pattern[laneIndex][step]) grid.flash(laneIndex, step);
  });
}

const grid = buildGrid(gridRoot, pattern, {
  onToggle(lane, step, on) {
    pattern[lane][step] = on;
    const justStarted = begin();
    // Placing a note plays it, so editing a stopped loop is still playing the
    // instrument rather than filling in a form.
    if (on && !justStarted && engine) {
      triggerDrum(engine, LANES[lane].id, engine.ctx.currentTime);
    }
  },
  onAudition(lane) {
    begin();
    if (engine) triggerDrum(engine, LANES[lane].id, engine.ctx.currentTime);
  },
});

const pads = buildPads(padRoot, {
  onNoteOn(pad) {
    begin();
    bass?.noteOn(pad.frequency);
  },
  onNoteOff() {
    bass?.noteOff();
  },
});

playButton.addEventListener("click", () => {
  if (!engine) {
    begin();
    return;
  }
  void engine.ctx.resume();
  transport?.toggle();
  reflectTransport();
});

rollButton.addEventListener("click", () => {
  pattern = rollPattern();
  grid.sync(pattern);
  begin();
});

clearButton.addEventListener("click", () => {
  pattern = emptyPattern();
  grid.sync(pattern);
});

// --- dials -----------------------------------------------------------------

function readout(input: HTMLInputElement, text: string): void {
  const output = document.querySelector<HTMLOutputElement>(`output[for="${input.id}"]`);
  if (output) output.textContent = text;
}

function syncBass(): void {
  bassSettings.cutoff = Number(cutoff.value) / 100;
  bassSettings.reese = Number(reese.value) / 100;
  bassSettings.drive = Number(drive.value) / 100;
  bassSettings.glide = Number(glide.value) / 100;
  bass?.apply(bassSettings);
}

tempo.addEventListener("input", () => {
  const value = clamp(Number(tempo.value), MIN_BPM, MAX_BPM);
  if (transport) transport.bpm = value;
  readout(tempo, `${value} bpm`);
});

swing.addEventListener("input", () => {
  if (transport) transport.swing = Number(swing.value) / 100;
  readout(swing, `${swing.value}%`);
});

for (const input of [cutoff, reese, drive, glide]) {
  input.addEventListener("input", () => {
    readout(input, `${input.value}%`);
    syncBass();
  });
}

// --- computer keyboard -----------------------------------------------------

// Widened to string: the lookup key comes from a KeyboardEvent, not from KEYS.
const keyToPad = new Map<string, number>(KEYS.map((key, index) => [key, index]));

window.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  if (event.code === "Space") {
    // Space belongs to a focused control first; only claim it otherwise.
    const target = event.target;
    if (target instanceof HTMLElement && target.matches("button, input, a, [tabindex]")) return;
    event.preventDefault();
    if (!engine) begin();
    else {
      transport?.toggle();
      reflectTransport();
    }
    return;
  }

  if (event.repeat) return;
  const pad = keyToPad.get(event.key.toLowerCase());
  if (pad === undefined) return;
  event.preventDefault();
  pads.press(pad);
});

window.addEventListener("keyup", (event) => {
  const pad = keyToPad.get(event.key.toLowerCase());
  if (pad !== undefined) pads.release(pad);
});

// Tabbing away with a key still down would otherwise leave the note sounding.
window.addEventListener("blur", () => {
  for (const index of [...pads.held]) pads.release(index);
});

grid.sync(pattern);
reflectTransport();
