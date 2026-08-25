// The clock. setInterval is far too jittery to place a note on, so it is used
// only to wake up often enough to schedule the next slice of bar against the
// AudioContext's own sample clock, which is exact. Two clocks: a sloppy one
// that asks, and an exact one that plays.

import { STEPS, stepDuration, swingOffset } from "../timing.ts";

/** How often the scheduler wakes. Must be well under the horizon below. */
const TICK_MS = 25;
/** How far ahead notes get placed. Long enough to survive a stalled frame. */
const HORIZON_S = 0.12;

export interface ScheduledStep {
  readonly step: number;
  readonly time: number;
}

export class Transport {
  private readonly ctx: AudioContext;
  private readonly onStep: (step: number, when: number) => void;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextStepTime = 0;
  private step = 0;
  /** Steps already handed to the audio clock but not yet audible. */
  private readonly pending: ScheduledStep[] = [];

  bpm = 174;
  swing = 0.18;

  constructor(ctx: AudioContext, onStep: (step: number, when: number) => void) {
    this.ctx = ctx;
    this.onStep = onStep;
  }

  get running(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer) return;
    this.step = 0;
    // A beat of headroom so the first bar is scheduled as calmly as the rest.
    this.nextStepTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.pump(), TICK_MS);
    this.pump();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.pending.length = 0;
  }

  toggle(): boolean {
    if (this.running) this.stop();
    else this.start();
    return this.running;
  }

  private pump(): void {
    while (this.nextStepTime < this.ctx.currentTime + HORIZON_S) {
      const when = this.nextStepTime + swingOffset(this.step, this.bpm, this.swing);
      this.onStep(this.step, when);
      this.pending.push({ step: this.step, time: when });

      // The grid advances by the unswung step. Folding swing back into the
      // running total would drag the whole loop flat, a bar at a time.
      this.nextStepTime += stepDuration(this.bpm);
      this.step = (this.step + 1) % STEPS;
    }
  }

  /**
   * The step that is audible right now, or null. The UI is scheduled ahead of
   * what you can hear, so the playhead has to be told when to catch up rather
   * than drawn the moment a note is queued.
   */
  currentStep(): number | null {
    let audible: number | null = null;
    while (this.pending.length > 0 && this.pending[0].time <= this.ctx.currentTime) {
      audible = this.pending.shift()!.step;
    }
    return audible;
  }
}
