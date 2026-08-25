// The sequencer grid. DOM only — no Web Audio in here, so the spec tests can
// build a real grid in jsdom and check what a player can reach.

import type { Pattern } from "../pattern.ts";
import { LANES } from "../pattern.ts";
import { STEPS } from "../timing.ts";

export interface GridHandlers {
  /** A step was set to `on`. */
  onToggle(lane: number, step: number, on: boolean): void;
  /** The lane's label was pressed: audition that drum. */
  onAudition(lane: number): void;
}

export interface GridView {
  /** Redraw pressed states from the pattern. */
  sync(pattern: Pattern): void;
  /** Move the playhead. `null` parks it. */
  setPlayhead(step: number | null): void;
  /** Flash a lane's cell — called when that step actually sounds. */
  flash(lane: number, step: number): void;
}

export function buildGrid(root: HTMLElement, pattern: Pattern, handlers: GridHandlers): GridView {
  const cells: HTMLButtonElement[][] = [];
  root.replaceChildren();

  LANES.forEach((lane, laneIndex) => {
    const row = document.createElement("div");
    row.className = "lane";
    row.style.setProperty("--hue", String(lane.hue));

    const name = document.createElement("button");
    name.type = "button";
    name.className = "lane-name";
    name.textContent = lane.label;
    // Discoverable without a legend: pressing the name plays the drum, which
    // is how you find out what "Ride" sounds like before you place one.
    name.setAttribute("aria-label", `Play ${lane.label}`);
    name.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      handlers.onAudition(laneIndex);
    });
    name.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") handlers.onAudition(laneIndex);
    });
    row.append(name);

    const steps = document.createElement("div");
    steps.className = "steps";
    const laneCells: HTMLButtonElement[] = [];

    for (let step = 0; step < STEPS; step += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "step";
      cell.dataset.lane = String(laneIndex);
      cell.dataset.step = String(step);
      // Every fourth step starts a beat; the grid says so visually.
      cell.dataset.beat = step % 4 === 0 ? "true" : "false";
      cell.setAttribute("aria-pressed", String(pattern[laneIndex][step]));
      cell.setAttribute("aria-label", `${lane.label}, step ${step + 1}`);
      laneCells.push(cell);
      steps.append(cell);
    }

    cells.push(laneCells);
    row.append(steps);
    root.append(row);
  });

  // One pointer path for mouse, pen and touch. Painting across cells needs
  // elementFromPoint because touch implicitly captures the pointer to the
  // element it started on, so pointerenter never fires on the neighbours.
  let painting: boolean | null = null;

  const cellAt = (target: EventTarget | null): HTMLButtonElement | null => {
    const element = target instanceof Element ? target.closest("button.step") : null;
    return element instanceof HTMLButtonElement ? element : null;
  };

  const paint = (cell: HTMLButtonElement, on: boolean): void => {
    const lane = Number(cell.dataset.lane);
    const step = Number(cell.dataset.step);
    if (cell.getAttribute("aria-pressed") === String(on)) return;
    cell.setAttribute("aria-pressed", String(on));
    handlers.onToggle(lane, step, on);
  };

  root.addEventListener("pointerdown", (event) => {
    const cell = cellAt(event.target);
    if (!cell) return;
    event.preventDefault();
    painting = cell.getAttribute("aria-pressed") !== "true";
    paint(cell, painting);
  });

  root.addEventListener("pointermove", (event) => {
    if (painting === null) return;
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const cell = cellAt(under);
    if (cell) paint(cell, painting);
  });

  const release = (): void => {
    painting = null;
  };
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);

  // Keyboard reaches the same cells: buttons fire click on Enter and Space,
  // and pointerdown never ran, so this is the path that keeps rule 5 honest.
  root.addEventListener("click", (event) => {
    if (event.detail !== 0) return; // a real pointer already handled it
    const cell = cellAt(event.target);
    if (!cell) return;
    paint(cell, cell.getAttribute("aria-pressed") !== "true");
  });

  let playhead: number | null = null;

  return {
    sync(next: Pattern): void {
      cells.forEach((row, lane) => {
        row.forEach((cell, step) => {
          cell.setAttribute("aria-pressed", String(next[lane][step]));
        });
      });
    },
    setPlayhead(step: number | null): void {
      if (step === playhead) return;
      for (const row of cells) {
        if (playhead !== null) row[playhead].removeAttribute("data-playing");
        if (step !== null) row[step].setAttribute("data-playing", "true");
      }
      playhead = step;
    },
    flash(lane: number, step: number): void {
      const cell = cells[lane]?.[step];
      if (!cell) return;
      cell.removeAttribute("data-hit");
      // Force a reflow so the animation restarts on consecutive hits.
      void cell.offsetWidth;
      cell.setAttribute("data-hit", "true");
    },
  };
}
