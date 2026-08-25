// Six drum voices, each built from oscillators and filtered noise at the
// moment it fires. Nothing is sampled; nothing is pre-rendered.

import type { LaneId } from "../pattern.ts";
import type { Engine } from "./engine.ts";
import { SILENCE, noiseSource } from "./engine.ts";

/** attack-then-exponential-decay, the shape behind every voice here. */
function envelope(engine: Engine, when: number, peak: number, decay: number): GainNode {
  const gain = engine.ctx.createGain();
  gain.gain.setValueAtTime(SILENCE, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.003);
  gain.gain.exponentialRampToValueAtTime(SILENCE, when + decay);
  return gain;
}

function kick(engine: Engine, out: AudioNode, when: number): void {
  const { ctx } = engine;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  // The pitch drop is the kick. Start high enough to have an attack, land low
  // enough to be a sub.
  osc.frequency.setValueAtTime(150, when);
  osc.frequency.exponentialRampToValueAtTime(44, when + 0.06);

  const body = envelope(engine, when, 1.1, 0.44);

  // A hair of noise on the transient so it reads on a laptop speaker, where
  // the 44 Hz fundamental is doing nothing at all.
  const click = noiseSource(engine, when, 0.02);
  const clickFilter = ctx.createBiquadFilter();
  clickFilter.type = "highpass";
  clickFilter.frequency.value = 1200;
  const clickGain = envelope(engine, when, 0.22, 0.018);

  osc.connect(body).connect(out);
  click.connect(clickFilter).connect(clickGain).connect(out);
  osc.start(when);
  osc.stop(when + 0.5);
}

function snare(engine: Engine, out: AudioNode, when: number): void {
  const { ctx } = engine;

  const noise = noiseSource(engine, when, 0.3);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1900;
  band.Q.value = 0.7;
  const noiseGain = envelope(engine, when, 0.85, 0.17);

  // Two detuned tones underneath give it a pitch, which is the difference
  // between a snare and a burst of static.
  for (const [frequency, level] of [
    [186, 0.5],
    [331, 0.32],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = frequency;
    const gain = envelope(engine, when, level, 0.1);
    osc.connect(gain).connect(out);
    osc.start(when);
    osc.stop(when + 0.15);
  }

  noise.connect(band).connect(noiseGain).connect(out);
}

function clap(engine: Engine, out: AudioNode, when: number): void {
  const { ctx } = engine;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1150;
  band.Q.value = 1.4;
  band.connect(out);

  // Three fast slaps then a tail: a clap is several hands not quite together,
  // and the spacing is what your ear reads as a room full of them.
  for (const [delay, peak, decay] of [
    [0, 0.55, 0.014],
    [0.011, 0.6, 0.014],
    [0.023, 0.65, 0.016],
    [0.037, 0.5, 0.16],
  ] as const) {
    const at = when + delay;
    const noise = noiseSource(engine, at, decay + 0.02);
    noise.connect(envelope(engine, at, peak, decay)).connect(band);
  }
}

function hat(engine: Engine, out: AudioNode, when: number, open: boolean): void {
  const { ctx } = engine;
  const decay = open ? 0.32 : 0.045;
  const noise = noiseSource(engine, when, decay + 0.05);

  const high = ctx.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = open ? 6800 : 8200;

  const peak = ctx.createBiquadFilter();
  peak.type = "peaking";
  peak.frequency.value = 11000;
  peak.gain.value = 6;

  noise.connect(high).connect(peak).connect(envelope(engine, when, open ? 0.34 : 0.4, decay)).connect(out);
}

function ride(engine: Engine, out: AudioNode, when: number): void {
  const { ctx } = engine;

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 4200;
  band.Q.value = 0.6;

  const high = ctx.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = 5200;

  const gain = envelope(engine, when, 0.2, 0.7);
  band.connect(high).connect(gain).connect(out);

  // Six square waves at deliberately inharmonic ratios — the 808 cymbal
  // trick. Harmonic ratios would give you a chord; these give you metal.
  for (const ratio of [1, 1.3428, 1.2312, 1.6532, 1.9523, 2.1523]) {
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 318 * ratio;
    osc.connect(band);
    osc.start(when);
    osc.stop(when + 0.75);
  }
}

/** Fire one lane at an absolute AudioContext time. */
export function triggerDrum(engine: Engine, lane: LaneId, when: number): void {
  const out = engine.bus;
  switch (lane) {
    case "kick":
      return kick(engine, out, when);
    case "snare":
      return snare(engine, out, when);
    case "clap":
      return clap(engine, out, when);
    case "closed":
      return hat(engine, out, when, false);
    case "open":
      return hat(engine, out, when, true);
    case "ride":
      return ride(engine, out, when);
  }
}
