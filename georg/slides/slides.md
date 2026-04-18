---
theme: seriph
title: Realtime Alignment Workspace
info: Agreement before generation. Codex Hackathon · Vienna · 2026
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
  <span class="uppercase tracking-widest text-sm opacity-70">POC · vertical slice</span>
</div>

# Realtime Alignment Workspace

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

<h1 class="mt-10" style="font-size: 5rem; color: var(--ra-accent); font-style: italic; line-height: 1.05;">
  Agreeing on <em>what</em> to build<br/>is still hard.
</h1>

---
layout: center
class: text-center
---

# And right now?

<h1 class="mt-10" style="font-size: 4.2rem; color: var(--ra-ink); line-height: 1.1;">
  Your agents are <span style="color: var(--ra-accent); font-style: italic;">fighting</span><br/>
  your colleague's agents.
</h1>

<p class="mt-8 text-xl opacity-70">Four engineers. Three LLMs. Zero shared context.</p>

---

# The pain we kept hitting

<div class="ra-grid-2 mt-8">

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

<p class="ra-tagline text-2xl mt-2">Real-time decision alignment — steered by humans — is possible.</p>

<v-clicks depth="2">

- **One shared room** — humans + agents see the same synthesized state
- **Private work stays private** — your agents drop deltas only you see, then *you* promote
- **Orchestrator, not autopilot** — synthesizes, nudges, routes insights · never decides
- **Gates, not drift** — ADR approved → plan generated → handoff shipped
- **Evidence, not vibes** — every node traces back to an event in the log

</v-clicks>

<div v-click class="mt-8 ra-tagline text-2xl">
  Agreement <em>before</em> generation.
</div>

---
layout: two-cols-header
---

# The three primitives

::left::

<div class="ra-card">

### Shared room

The alignment board with eight color-coded columns:<br>
*goal · constraint · option · tradeoff · risk · open · agreement · blocker*

Every utterance is classified into a node with confidence and an event trail.

</div>

::right::

<div class="ra-card mb-4">

### Private work

Your codex plugin drops deltas visible only to you and the orchestrator.

**You** promote the good, discard the noise. Agents never leak into the room on their own.

</div>

<div class="ra-card">

### Orchestrator

Synthesizes recent events, suggests the next move, routes private nudges to the person who needs them.

Assists — never decides. **Humans stay in the loop.**

</div>

---
layout: center
---

# Short video demo

<video
  src="/hackathon-video.mp4"
  controls
  autoplay
  loop
  muted
  playsinline
  class="w-full rounded-xl shadow-2xl"
  style="max-height: 62vh; border: 1px solid var(--ra-line);"
/>

<p class="text-center opacity-70 text-sm mt-4">
  44 seconds · a room converges on an ADR, generates a plan, ships a handoff
</p>

<!--
If the video is missing, run from georg/: `just demo` (renders with Remotion, copies into slides/public, then starts the deck).
-->

---

# Live demo — the path we'll walk

<div class="ra-grid-2 mt-4">

<div>

<v-clicks>

1. Open <kbd>http://localhost:5173</kbd>
2. **Create a room** with a bounded decision
3. Post two utterances → watch the alignment board populate
4. Submit a **private delta** → **promote** it
5. **Claim** an ADR section → **Regenerate** → **Review** → **Approve**
6. **Generate plan** → **Accept owner** → **Approve plan**
7. **Generate handoff** → download the JSON package

</v-clicks>

</div>

<div>

<div class="ra-card">

**What to look for**

- The pulsing accent dot = live orchestrator
- Presence pills with initials = who's here
- Readiness chips flipping green = gates closing
- Quorum pips next to *Approve* = N of M owners
- The **Next move** hint = what to do right now

</div>

<div v-click class="ra-card mt-4">

**Failure demo**

Switch mode to *draft_adr* with an unresolved blocker — the system refuses until you resolve, dissent, or mark it non-blocking.

</div>

</div>

</div>

---

# Architecture

```mermaid {scale: 0.9}
flowchart LR
  subgraph client[Browser]
    H[Humans<br/>presence + composer]
    A[Private agents<br/>pending deltas]
  end
  subgraph server[Bun + SQLite]
    R[Shared room<br/>alignment board]
    O[Orchestrator<br/>synthesis · routing]
    ADR[ADR editor<br/>claim · review · approve]
    PL[Plan<br/>workstreams · owners]
    HO[Handoff package<br/>JSON export]
  end
  H -->|utterances| R
  A -->|private deltas| R
  R <--> O
  R --> ADR --> PL --> HO
```

<div class="mt-6 grid grid-cols-4 gap-3 text-xs">
  <div class="ra-card">Bun + WebSockets · sub-second presence</div>
  <div class="ra-card">SQLite · append-only event log</div>
  <div class="ra-card">OpenAI Responses · swappable provider</div>
  <div class="ra-card">React 19 · Vite · Slidev · Remotion</div>
</div>

---

# Why this wins

<v-clicks>

- **Humans stay in the loop** — nothing is generated until people agree
- **Agents collaborate, don't compete** — every private delta is funneled through one shared room
- **No drift** — orchestrator re-anchors to the ADR every synthesis
- **Speed** — quorum and readiness are *visual* · no meetings to re-check status
- **Realtime** — Bun + WebSockets · changes reach every participant in < 1s
- **Portable output** — the handoff package is a single JSON envelope downstream tools can replay
- **Agent-ready** — a bridge plugin lets Codex, Claude, or any local agent submit deltas

</v-clicks>

---

# What we cut (and why)

<div class="ra-grid-2 mt-8">

<div class="ra-card">

### Out of scope for the slice

- CRDT co-editing
- Voice / video
- Autonomous agent decisions
- Multi-workspace management UI
- Streaming synthesis (SSE)

</div>

<div class="ra-card">

### Why

Every item we cut was something the **alignment primitive** doesn't need to prove.

The slice has to show that *agreement before generation* survives contact with real humans and real LLMs. Everything else is an extension.

</div>

</div>

---

# What's next

<v-clicks>

- **Streaming orchestrator** via server-sent events — synthesis appears token-by-token
- **Multi-room workspaces** with cross-room evidence graphs
- **First-class agent bridges** — Codex, Claude Code, Cursor
- **Guardrail enforcement** at approval time (policy-as-code)
- **Time-travel** — replay a decision by scrubbing the event log
- **Exports** — Linear, Jira, GitHub issues from workstreams

</v-clicks>

---
layout: center
class: text-center
---

<div class="flex items-center justify-center gap-4 mb-6">
  <span class="ra-live-dot"></span>
  <span class="uppercase tracking-widest text-sm opacity-70">thanks</span>
</div>

# Realtime Alignment Workspace

<p class="ra-tagline mt-6 text-3xl">Humans steer. Agents collaborate. Agreement before generation.</p>

<div class="pt-10 opacity-60 text-sm">
  Q &amp; A · <kbd>esc</kbd> to exit · <kbd>p</kbd> for presenter mode
</div>
