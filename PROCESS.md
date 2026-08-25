# Process overview

> **Still yours to finish:** the ear pass. See "The listening pass" at the
> bottom — it is the one section an agent cannot write, and this week's brief
> is built around exactly that. Everything above it is a factual map of the
> build and its citations resolve.

## What I built

[**Substep**](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-Adeeth101)
is a drum-and-bass machine that runs in the page: a 16-step grid over six
synthesised drum voices, and a monophonic reese/sub bass on nine pads you play
live over the top. There is not an audio file in the repository. Every sound is
oscillators and filtered noise assembled at the moment it fires, which is the
literal reading of the brief's second clause — the browser *is* the
instrument — and the cheapest way to keep that true is to have nothing to play
back from.

## The moments that mattered

### 1. Swing that would have pushed the beat past itself

I wrote the swing function as `swing * stepDuration * (2/3)`, reasoning loosely
that a triplet sits two-thirds of the way through. That is true of the *eighth*
it divides, not of the sixteenth step being offset — at full swing it would
have shoved every off-beat two-thirds of a step late, well past where the next
note lands.

The obvious fix was to lower the slider's ceiling until it stopped sounding
broken. I did the arithmetic instead: inside one eighth note, a straight pair
splits 1/2:1/2 and a triplet pair splits 2/3:1/3, so the off-step moves from
one step to four-thirds of one — a third of a step, not two-thirds. The
constant became `(1/3)`, and the reason is now a comment above it
([`ebd1f45`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-Adeeth101/commit/ebd1f45)).

What tells me it took is not that it sounds better, but that the ceiling is
now pinned by a test: full swing must equal `stepDuration / 3` exactly *and*
be less than a whole step
([`e128094`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-Adeeth101/commit/e128094)).
A later change that reintroduces the same mistake goes red instead of just
sounding slightly wrong to whoever happens to be listening.

### 2. A test that policed my prose instead of my code

Clause 6 is "there is no way to play it wrong", so I wrote a test asserting
that no scoring vocabulary appears anywhere in the source. It immediately went
red on two comments — one of them "so the palette lives in one place". The word
was `lives`.

The obvious thing was to reword the comments. I widened the test instead: it
strips `//` and `/* */` before matching, because the clause is about what the
code *does*, and a check that constrains English would go on firing at
blameless sentences forever, training me to write worse comments to keep it
green
([`e128094`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-Adeeth101/commit/e128094)).
A sensor that punishes the wrong thing is worse than no sensor — you obey it
without noticing.

### 3. The playhead was going to run ahead of the sound

Notes are scheduled against the AudioContext clock up to 120 ms before they are
audible, because `setInterval` is far too jittery to place a note on. The naive
UI wiring lights a cell when its note is *scheduled*, which would have run the
animation a tenth of a second ahead of what you hear — the kind of thing that
feels wrong long before you can say why.

The transport therefore keeps a queue of `{step, time}` and hands the UI only
the steps whose time has actually arrived, drained each animation frame against
`ctx.currentTime`
([`d950e16`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-Adeeth101/commit/d950e16)).

### 4. Turning the autoplay restriction into the invitation

Browsers refuse to make sound before a user gesture. The standard answer is a
"click to start" screen — which is precisely the wall clause 4 forbids.

So there is no unlock control. *Every* interaction is the unlock: touching a
grid cell, holding a pad, pressing a key and hitting play all run the same
`begin()`, which builds the engine, starts the loop and retires the hint. The
grid also opens on a two-step that already exists, so a stranger's first touch
lands on a running beat rather than on silence they then have to
diagnose. The hint is one line, and a test fails if it ever grows past sixteen
words — the wall can't creep back in as helpful copy
([`d950e16...e128094`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-Adeeth101/compare/d950e16...e128094)).

### 5. Grounding the build in the brief before writing any of it

The harness went in first: the nine clauses, the scope and the cutoff written
into `CLAUDE.md` before a line of audio code existed
([`1515e55`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-Adeeth101/commit/1515e55)),
so every later decision had something to be checked against. Four of those
clauses turned out to be mechanically checkable and became `spec/instrument.test.ts`,
where each `describe` is named for the clause it stands for. The other five are
ear-and-eye judgements; asserting them in vitest would only ever have asserted
that I wrote an assertion.

## The listening pass

> **TODO — mine to write, and the point of the week.** The premise is that an
> agent can build a synth but cannot hear the result. Everything above was
> reasoned, typechecked and tested; none of it was *heard*. Record here what
> changed after playing it: which voice was too loud, whether 174 BPM felt
> right, whether the filter sweep is actually audible, what the roll button
> kept producing that I didn't want. Cite the commits those changes land in.
