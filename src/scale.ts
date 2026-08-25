// The bass is locked to D minor pentatonic. That is the whole of rule 6 —
// "there is no way to play it wrong" — expressed in code: there is no key on
// the instrument that produces a note outside the scale, so no combination a
// player finds can sound wrong against the drums. Pure, no Web Audio.

/** Semitones above the root. Minor pentatonic: the safe five. */
export const PENTATONIC = [0, 3, 5, 7, 10] as const;

/** MIDI 26 is D1, ~36.7 Hz — the bottom of a sub bass, not of a piano. */
export const ROOT_MIDI = 26;

/** Computer keys, left to right, low to high. Also the pad labels. */
export const KEYS = ["a", "s", "d", "f", "g", "h", "j", "k", "l"] as const;

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

/** The MIDI note the nth pad plays, walking the scale up through octaves. */
export function midiForPad(index: number): number {
  const octave = Math.floor(index / PENTATONIC.length);
  const degree = PENTATONIC[index % PENTATONIC.length];
  return ROOT_MIDI + octave * 12 + degree;
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** "D1", "F1", … for the pad's caption. */
export function midiToName(midi: number): string {
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export interface Pad {
  readonly index: number;
  readonly key: string;
  readonly midi: number;
  readonly frequency: number;
  readonly name: string;
}

export const PADS: readonly Pad[] = KEYS.map((key, index) => {
  const midi = midiForPad(index);
  return { index, key, midi, frequency: midiToFrequency(midi), name: midiToName(midi) };
});
