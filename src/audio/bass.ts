// One monophonic reese/sub voice. Three detuned saws through a resonant
// lowpass is the reese; a sine at the fundamental, routed around the filter,
// is the sub that keeps the low end solid however far the cutoff is shut.

import type { Engine } from "./engine.ts";
import { SILENCE, driveCurve } from "./engine.ts";

export interface BassSettings {
  /** 0–1, mapped exponentially onto the filter. The obvious control. */
  cutoff: number;
  /** 0–1 detune width across the saw stack. 0 is nearly a single saw. */
  reese: number;
  /** 0–1 soft clip. */
  drive: number;
  /** 0–1, mapped to portamento seconds. */
  glide: number;
}

export const DEFAULT_BASS: BassSettings = { cutoff: 0.42, reese: 0.5, drive: 0.3, glide: 0.18 };

const MIN_CUTOFF = 90;
const MAX_CUTOFF = 5200;
const MAX_GLIDE = 0.34;

export class BassVoice {
  private readonly engine: Engine;
  private readonly saws: OscillatorNode[] = [];
  private readonly sub: OscillatorNode;
  private readonly filter: BiquadFilterNode;
  private readonly shaper: WaveShaperNode;
  private readonly makeup: GainNode;
  private readonly amp: GainNode;
  private readonly lfo: OscillatorNode;
  private readonly lfoDepth: GainNode;
  private settings: BassSettings = { ...DEFAULT_BASS };
  private sounding = false;

  constructor(engine: Engine) {
    this.engine = engine;
    const { ctx } = engine;

    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.Q.value = 9;

    this.shaper = ctx.createWaveShaper();
    this.shaper.oversample = "4x";

    this.makeup = ctx.createGain();
    this.amp = ctx.createGain();
    this.amp.gain.value = SILENCE;

    // A slow wobble on the detune. Static detuning is a chord; moving
    // detuning is a reese — the movement is the sound.
    this.lfo = ctx.createOscillator();
    this.lfo.type = "sine";
    this.lfo.frequency.value = 0.13;
    this.lfoDepth = ctx.createGain();
    this.lfo.connect(this.lfoDepth);

    for (const direction of [-1, 0, 1]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = 55;
      if (direction !== 0) {
        const share = ctx.createGain();
        share.gain.value = direction;
        this.lfoDepth.connect(share).connect(osc.detune);
      }
      osc.connect(this.filter);
      this.saws.push(osc);
    }

    // The sub skips the filter entirely, so shutting the cutoff takes the
    // growl away without taking the weight with it.
    this.sub = ctx.createOscillator();
    this.sub.type = "sine";
    this.sub.frequency.value = 55;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.85;
    this.sub.connect(subGain).connect(this.shaper);

    this.filter.connect(this.shaper);
    this.shaper.connect(this.makeup).connect(this.amp).connect(engine.bus);

    this.apply(this.settings);
    const now = ctx.currentTime;
    for (const osc of this.saws) osc.start(now);
    this.sub.start(now);
    this.lfo.start(now);
  }

  apply(settings: BassSettings): void {
    this.settings = { ...settings };
    const now = this.engine.ctx.currentTime;

    const cutoff = MIN_CUTOFF * (MAX_CUTOFF / MIN_CUTOFF) ** settings.cutoff;
    this.filter.frequency.setTargetAtTime(cutoff, now, 0.02);

    // Cents, not hertz — detuning by a ratio keeps the beating rate musical
    // across the whole range instead of vanishing at the bottom.
    this.lfoDepth.gain.setTargetAtTime(4 + settings.reese * 26, now, 0.05);
    for (const [index, osc] of this.saws.entries()) {
      const direction = index - 1;
      osc.detune.setTargetAtTime(direction * settings.reese * 22, now, 0.05);
    }

    this.shaper.curve = driveCurve(settings.drive);
    this.makeup.gain.setTargetAtTime(0.42 / (1 + settings.drive * 1.1), now, 0.02);
  }

  noteOn(frequency: number): void {
    const { ctx } = this.engine;
    const now = ctx.currentTime;
    const glide = this.sounding ? this.settings.glide * MAX_GLIDE : 0;

    for (const osc of [...this.saws, this.sub]) {
      const current = Math.max(osc.frequency.value, 1);
      osc.frequency.cancelScheduledValues(now);
      osc.frequency.setValueAtTime(current, now);
      if (glide > 0) osc.frequency.exponentialRampToValueAtTime(frequency, now + glide);
      else osc.frequency.setValueAtTime(frequency, now);
    }

    // A short lift on the cutoff gives each note an edge to start on, so
    // repeated notes read as played rather than held.
    const base = MIN_CUTOFF * (MAX_CUTOFF / MIN_CUTOFF) ** this.settings.cutoff;
    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(Math.min(base * 2.4, 12000), now);
    this.filter.frequency.setTargetAtTime(base, now + 0.008, 0.09);

    this.amp.gain.cancelScheduledValues(now);
    this.amp.gain.setValueAtTime(Math.max(this.amp.gain.value, SILENCE), now);
    this.amp.gain.exponentialRampToValueAtTime(1, now + 0.012);
    this.sounding = true;
  }

  noteOff(): void {
    const now = this.engine.ctx.currentTime;
    this.amp.gain.cancelScheduledValues(now);
    this.amp.gain.setValueAtTime(Math.max(this.amp.gain.value, SILENCE), now);
    this.amp.gain.exponentialRampToValueAtTime(SILENCE, now + 0.09);
    this.sounding = false;
  }
}
