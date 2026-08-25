// The master chain. Everything the instrument makes is generated here at run
// time — there is not an audio file in the repo, and rule 2 depends on that
// staying true.

export interface Engine {
  readonly ctx: AudioContext;
  /** Where every voice connects. Compressed and limited downstream. */
  readonly bus: GainNode;
  /** Shared white noise, built once — every hat and snare reads from it. */
  readonly noise: AudioBuffer;
  readonly analyser: AnalyserNode;
}

function buildNoise(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function createEngine(): Engine {
  const ctx = new AudioContext({ latencyHint: "interactive" });

  const bus = ctx.createGain();
  bus.gain.value = 0.9;

  // Glue, and a floor under the clipping you'd otherwise get the moment a
  // player fills every lane on the same step.
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -10;
  compressor.knee.value = 12;
  compressor.ratio.value = 6;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.16;

  const master = ctx.createGain();
  master.gain.value = 0.85;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.6;

  bus.connect(compressor).connect(master);
  master.connect(analyser);
  master.connect(ctx.destination);

  return { ctx, bus, noise: buildNoise(ctx), analyser };
}

/** A one-shot noise source reading the shared buffer from a random offset. */
export function noiseSource(engine: Engine, when: number, duration: number): AudioBufferSourceNode {
  const source = engine.ctx.createBufferSource();
  source.buffer = engine.noise;
  const offset = Math.random() * (engine.noise.duration - duration - 0.01);
  source.start(when, Math.max(0, offset), duration);
  return source;
}

/**
 * A soft-clip curve. At `amount` 0 it is the identity, so the drive control
 * is genuinely transparent at the bottom of its travel rather than quietly
 * colouring everything.
 */
export function driveCurve(amount: number): Float32Array<ArrayBuffer> {
  const size = 1024;
  const curve = new Float32Array(size);
  const k = amount * 60;
  for (let i = 0; i < size; i += 1) {
    const x = (i * 2) / (size - 1) - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

/**
 * Exponential ramps cannot touch zero, so silence is this rather than 0.
 * Small enough to be inaudible, non-zero enough for the ramp to be legal.
 */
export const SILENCE = 0.0001;
