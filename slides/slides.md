---
theme: seriph
title: "Tackling multiplayer — Realtime Decision Alignment"
info: Humans steer. Agents collaborate. Codex Hackathon · Vienna · 2026
class: text-center
transition: slide-left
mdc: true
highlighter: shiki
fonts:
  sans: Inter
  serif: Fraunces
  mono: JetBrains Mono
  weights: "400,500,600,700"
  italic: true
---

<div class="flex items-center justify-center gap-4 mb-6">
  <span class="ra-live-dot"></span>
  <span class="uppercase tracking-widest text-sm opacity-70">Tackling multiplayer</span>
</div>

# Realtime Decision Alignment

<p class="ra-tagline mt-6 text-3xl">Humans steer. Agents collaborate.</p>

<div class="pt-10 text-sm opacity-60">
  Codex Hackathon · Vienna · 2026
</div>

<div class="pt-2 text-xs opacity-50">
  Press <kbd>→</kbd> to start · <kbd>o</kbd> for overview · <kbd>d</kbd> for dark mode
</div>

---
layout: center
class: text-center
---

# Generating code has never been easier.

<h1 class="mt-8" style="font-size: 4.6rem; color: var(--ra-accent); font-style: italic; line-height: 1.05;">
  Agreeing on <em>what</em> to build<br/>is still hard.
</h1>

<p class="mt-10 text-lg opacity-70">Scoping is the multiplayer problem.</p>

---
layout: center
class: text-center
---

# Today, it's not collaboration —

<h1 class="mt-6" style="font-size: 3.8rem; color: var(--ra-ink); line-height: 1.15;">
  your agents are <span style="color: var(--ra-accent); font-style: italic;">fighting</span><br/>
  your colleague's agents.
</h1>

<p class="mt-8 text-xl opacity-70">Four engineers. Three LLMs. Zero shared context.</p>

---

# The pain we kept hitting

<div class="ra-grid-2 mt-6">

<div>

<v-clicks>

- Private agents drafting in isolation
- Slack threads drifting in parallel
- Everyone ships different code
- Nobody trusts any of it
- The ADR — if one exists — is stale by Monday

</v-clicks>

</div>

<div class="ra-card">

**What's missing**

1. A **shared room** where state is synthesized live
2. **Human control** over what enters it
3. A **ratchet** from decision → ADR → plan → handoff
4. **Evidence** every step traces back to

</div>

</div>

---

# Our thesis

<p class="ra-tagline text-2xl mt-1">Realtime decision alignment — steered by humans — is possible.</p>

<v-clicks depth="2">

- **One shared room** — humans + agents see the same synthesized state
- **Private work stays private** — your agents drop deltas only you see, then *you* promote
- **Orchestrator, not autopilot** — synthesizes, nudges, routes insights · never decides
- **Gates, not drift** — ADR approved → plan generated → handoff shipped
- **Evidence, not vibes** — every node traces back to an event in the log

</v-clicks>

<div v-click class="mt-6 ra-tagline text-2xl">
  Agreement <em>before</em> generation.
</div>

---

# The three primitives

<div class="grid grid-cols-3 gap-5 mt-6">

<div class="ra-card">

### Shared room

The alignment board with eight color-coded columns:<br>
*goal · constraint · option · tradeoff · risk · open · agreement · blocker*

Every utterance becomes a node with confidence and an event trail.

</div>

<div class="ra-card">

### Private work

Your codex plugin drops deltas visible only to you and the orchestrator.

**You** promote the good, discard the noise. Agents never leak into the room on their own.

</div>

<div class="ra-card">

### Orchestrator

Synthesizes recent events, suggests the next move, routes private nudges to the person who needs them.

Assists — never decides. **Humans stay in the loop.**

</div>

</div>

---
layout: center
---

<video
  src="/hackathon-video.mp4"
  controls
  autoplay
  loop
  muted
  playsinline
  class="rounded-xl shadow-2xl"
  style="max-height: 78vh; max-width: 100%; border: 1px solid var(--ra-line); display: block; margin: 0 auto;"
/>

<p class="text-center opacity-70 text-xs mt-3" style="margin-bottom: 0;">
  44 seconds · a room converges on an ADR, generates a plan, ships a handoff
</p>

<!--
If the video is missing, run from the repo root: `just demo` (renders with Remotion, copies into slides/public, then starts the deck).
-->

---

# Live demo — the path we'll walk

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

<v-clicks>

1. Open <kbd>http://localhost:5173</kbd>
2. **Create a room** with a bounded decision
3. Post two utterances → alignment board populates
4. Submit a **private delta** → **promote** it
5. **Claim** ADR → **Regenerate** → **Review** → **Approve**
6. **Generate plan** → **Accept owner** → **Approve**
7. **Generate handoff** → download JSON

</v-clicks>

</div>

<div>

<div class="ra-card">

**What to look for**

- Pulsing accent dot = live orchestrator
- Presence pills = who's here
- Readiness chips flipping green = gates closing
- Quorum pips = N of M owners approved
- **Next move** hint = what to do right now

</div>

<div v-click class="ra-card mt-3 text-sm">

**Failure demo** — switch to *draft_adr* with an unresolved blocker and the system refuses until you resolve, dissent, or mark it non-blocking.

</div>

</div>

</div>

---

# Architecture

<div class="mt-2 text-sm opacity-75">One shared room · private deltas · one ratchet from decision to handoff.</div>

<div class="flex justify-center mt-4">

```mermaid {scale: 0.55}
flowchart LR
  subgraph client[Browser]
    H[Humans]
    A[Private agents]
  end
  subgraph server[Bun + SQLite]
    R[Shared room]
    O[Orchestrator]
    ADR[ADR]
    PL[Plan]
    HO[Handoff]
  end
  H -->|utterances| R
  A -->|deltas| R
  R <--> O
  R --> ADR --> PL --> HO
```

</div>

<div class="mt-6 grid grid-cols-4 gap-3 text-xs">
  <div class="ra-card">Bun + WebSockets · sub-second presence</div>
  <div class="ra-card">SQLite · append-only event log</div>
  <div class="ra-card">OpenAI Responses · swappable provider</div>
  <div class="ra-card">React 19 · Vite · Slidev · Remotion</div>
</div>

---
layout: center
class: text-center
---

<div class="flex items-center justify-center gap-4 mb-6">
  <span class="ra-live-dot"></span>
  <span class="uppercase tracking-widest text-sm opacity-70">thanks</span>
</div>

# Realtime Decision Alignment

<p class="ra-tagline mt-6 text-3xl">Humans steer. Agents collaborate.</p>
<p class="ra-tagline mt-2 text-xl">Agreement <em>before</em> generation.</p>

<div class="pt-10 opacity-60 text-sm">
  Q &amp; A · <kbd>esc</kbd> to exit · <kbd>p</kbd> for presenter mode
</div>
