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

<p class="ra-tagline mt-6 text-3xl">Agreement before generation.</p>

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

# Every AI coding tool skips the hardest part.

<h1 class="mt-10" style="font-size: 6rem; color: var(--ra-accent); font-style: italic;">Agreement.</h1>

---

# The pain we kept hitting

<div class="ra-grid-2 mt-8">

<div>

<v-clicks>

- **Four engineers** on one decision
- **Three LLMs** running in parallel
- **Zero shared context** across any of it
- Everyone ships different code
- Nobody trusts any of it

</v-clicks>

</div>

<div class="ra-card">

**What happens today**

1. Slack thread drifts
2. Agents generate in isolation
3. Code review becomes re-litigation
4. Nobody remembers *why* the choice was made
5. The ADR, if one exists, is stale by Monday

</div>

</div>

---

# Our thesis

<v-clicks depth="2">

- **Shared room** — humans + agents see the same synthesized state
- **Private work** — agents drop deltas only you see, then you promote
- **Orchestrator** — synthesizes, nudges, routes insights
- **Gates, not drift** — ADR approved → plan generated → handoff shipped
- **Evidence, not vibes** — every node traces back to an event in the log

</v-clicks>

<div v-click class="mt-10 ra-tagline text-2xl">
  Agreement before generation.
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

**Promote** to share, **discard** when it misses. No leakage.

</div>

<div class="ra-card">

### Orchestrator

Synthesizes recent events, suggests the next move, and routes private nudges to the participant who needs them.

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

- **Trust** — nothing is generated until humans agree
- **Speed** — quorum and readiness are *visual* · no meetings to re-check status
- **No drift** — orchestrator re-anchors to the ADR every synthesis
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

<p class="ra-tagline mt-6 text-3xl">Agreement before generation.</p>

<div class="pt-10 opacity-60 text-sm">
  Q &amp; A · <kbd>esc</kbd> to exit · <kbd>p</kbd> for presenter mode
</div>
