// The bass pads. DOM only, like the grid, so the tests can build them.
//
// Mono voice, but a player can hold several pads at once with two hands or
// two fingers. Held notes go on a stack and the most recent one sounds; when
// it is released the one underneath comes back. That is how a monosynth
// behaves, and it means letting go of a key never leaves you in silence you
// didn't ask for.

import type { Pad } from "../scale.ts";
import { PADS } from "../scale.ts";

export interface PadHandlers {
  onNoteOn(pad: Pad): void;
  onNoteOff(): void;
}

export interface PadView {
  press(index: number): void;
  release(index: number): void;
  readonly held: readonly number[];
}

export function buildPads(root: HTMLElement, handlers: PadHandlers): PadView {
  const buttons: HTMLButtonElement[] = [];
  root.replaceChildren();

  for (const pad of PADS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pad";
    button.dataset.pad = String(pad.index);
    button.setAttribute("aria-label", `Bass note ${pad.name}, key ${pad.key.toUpperCase()}`);

    const key = document.createElement("span");
    key.className = "pad-key";
    key.textContent = pad.key.toUpperCase();

    const note = document.createElement("span");
    note.className = "pad-note";
    note.textContent = pad.name;

    button.append(key, note);
    buttons.push(button);
    root.append(button);
  }

  const stack: number[] = [];

  const sound = (): void => {
    const top = stack.at(-1);
    if (top === undefined) handlers.onNoteOff();
    else handlers.onNoteOn(PADS[top]);
  };

  const view: PadView = {
    press(index: number): void {
      if (stack.includes(index)) return;
      stack.push(index);
      buttons[index]?.setAttribute("data-held", "true");
      sound();
    },
    release(index: number): void {
      const at = stack.indexOf(index);
      if (at === -1) return;
      stack.splice(at, 1);
      buttons[index]?.removeAttribute("data-held");
      sound();
    },
    get held(): readonly number[] {
      return stack;
    },
  };

  const indexOf = (target: EventTarget | null): number | null => {
    const element = target instanceof Element ? target.closest("button.pad") : null;
    if (!(element instanceof HTMLButtonElement)) return null;
    return Number(element.dataset.pad);
  };

  root.addEventListener("pointerdown", (event) => {
    const index = indexOf(event.target);
    if (index === null) return;
    event.preventDefault();
    // Capture so a finger sliding off the pad still gets its release.
    (event.target as Element).setPointerCapture?.(event.pointerId);
    view.press(index);
  });

  const lift = (event: PointerEvent): void => {
    const index = indexOf(event.target);
    if (index === null) return;
    view.release(index);
  };
  root.addEventListener("pointerup", lift);
  root.addEventListener("pointercancel", lift);

  // Enter and Space on a focused pad: no pointer, so give it a short blip
  // rather than leaving the note stuck on with no keyup to end it.
  root.addEventListener("click", (event) => {
    if (event.detail !== 0) return;
    const index = indexOf(event.target);
    if (index === null) return;
    view.press(index);
    window.setTimeout(() => view.release(index), 220);
  });

  return view;
}
