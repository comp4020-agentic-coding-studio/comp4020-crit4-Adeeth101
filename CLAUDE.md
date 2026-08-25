# COMP4020 Crit 4 — "An Instrument"

Your starter repo for **Crit 4, week 5: An instrument**. A static site in
HTML/CSS/TypeScript that builds to plain HTML/CSS/JS and deploys to GitHub
Pages. The deployed site is what gets marked, not this repo.

Cutoff for the baishi crit group: **Wed 2026-08-26, 07:00 Canberra time**
(2 hours before the 09:00–10:30 tutorial, Marie Reay 155 room 4.03, tutor
Tom Griffiths). Verified live against the course site on 2026-08-25.

## What we're building

A browser-based **drum-and-bass instrument**: an 808-style step sequencer
driving a small drum kit (kick, snare/clap, hi-hats, maybe a ride/perc) at a
DnB tempo (~160–175 BPM, breakbeat-ish swing), paired with a simple
monophonic sub/reese-style synth voice the player can play live over the top
(a small on-screen keyboard or pad row is enough — no piano-roll needed).
Everything is generated live in the browser with the Web Audio API; nothing
is a pre-rendered audio file played back.

Keep the scope small and playable rather than feature-complete:
- a step sequencer grid (e.g. 16 steps × a handful of drum lanes) the player
  can toggle to build their own beat, looping continuously
- a couple of drum voices synthesised (or sampled short one-shots) covering
  kick/snare/hats at minimum
- one synth voice (sub bass / reese-ish) playable via keys, on-screen pads,
  or clicks, with at least one control that shapes its tone (filter cutoff,
  envelope, distortion — pick one and make it obviously audible)
- basic global tempo/swing control is a bonus, not a requirement

## The rubric (Crit 4 spec — every clause must hold)

1. deployed and live at its public GitHub Pages URL by the cutoff
2. the browser *is* the instrument — sound is made live in the page by the
   player, not played back from pre-rendered audio
3. it is expressive: the player's choices shape what they hear, and two
   players sound different
4. a stranger can play it uninstructed — the opening screen invites the
   first sound (no "click play" wall of instructions)
5. playable with whatever is at hand — mouse, keyboard, or touch all work
6. there is no way to play it wrong — no score, no fail state, nothing to
   "lose"
7. the starter's invariant checks pass (`pnpm check`)
8. the repo shows the process — commits that grew with the work, a process
   overview in `PROCESS.md`, and the week's reflection in
   `reflections/crit-4.md`
9. you can account for how you directed, grounded and corrected the work

Premise from the course site: *"Judgement week: an agent can build a synth
but can't hear the result, so your ear is the harness."* — meaning the agent
can wire up oscillators and sequencers, but only you, listening, can judge
whether it actually sounds and feels right. Playtest by ear constantly, not
just by reading the code.

The full course site (including this page's live version) is at
[the course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/04-instrument/);
a structured snapshot ingested 2026-08-25 also lives in
`../course-site/README.md` and `../course-site/api/index.json` in the parent
folder, if the live site is unreachable.

## How to work in here

- Keep the dev server running (`pnpm dev`) so you see changes as you make them.
- Run `pnpm check` before you push.
- Open the page in a browser and look at it. The rendered page is the truth;
  your mental model of it isn't.
- When a check fails, read its output before you change anything.
- Never commit a red state.

## The link-preview card

`public/card.png` (1200x630) is the image a shared link shows; `index.html`'s
head points at it. Replace it and the `description` meta, and copy the head
block into any new page. The card URL resolves against the page that names it,
like any link --- `./card.png` is wrong one directory down, and nothing in CI
checks it, so look at the deployed head when you add pages.

## The checks

`pnpm check` runs them (`pnpm check:evidence` is the extra gate before you
ship); CI runs the same plus links, secrets and the deploy. Read the failure.

`spec/README.md`, `PROCESS.md` and `reflections/README.md` are in this repo and
say what they are for.

## This file is yours

A starting point, not a rulebook. As you learn what your prototype needs --- a
convention the work has to hold to, a sensor that keeps catching you out (a
linter, say), a fact about the stack that is easy to get wrong --- write it down
here and wire it into `check`. Growing this file is the work.
