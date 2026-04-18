# Tackling multiplayer: Realtime Decision Alignment

It has never been easier to generate code.
But agreeing on what to do (scoping) is stil hard.
Often, agents of one person are fighting instead of collaborating with agents of another person.
This demo intends to show that real-time decision alignment is possible steered by humans.

## A. Launch The Slides

Fastest pitch path:

```bash
just demo-pitch
```

This:

- renders the latest video
- copies it into the deck
- opens the deck in your browser

If the video already exists and you just want the deck:

```bash
just demo-pitch-quick
```

Deck only:

```bash
just slides-dev
```

Slide commands auto-install missing dependencies and render the demo video asset if needed.
If the default Slidev port is already taken, use the URL printed in the terminal.

Useful slide commands:

```bash
just slides-build
just slides-export
```

## B. Render The Video

```bash
just video-render
```

Output:

- `video/out/realtime-alignment.mp4`

On first run, this may auto-install video dependencies and download Remotion's browser once.

Optional:

```bash
just video-still
just video-dev
```

- `just video-still`: renders `video/out/thumbnail.png`
- `just video-dev`: opens the Remotion studio

## C. Basic App Flow

Run these from `georg/`.

### Setup

```bash
just setup
```

Installs app, slide, and video dependencies up front.

### Validate

```bash
just check
```

Runs:

- lint
- typecheck
- production build

### Develop

Local heuristic mode:

```bash
export ALLOW_LOCAL_HEURISTIC_FALLBACK=1
just dev
```

Open:

- app UI: `http://localhost:5173`
- Bun server: `http://localhost:3001`

OpenAI-backed mode:

```bash
export OPENAI_API_KEY=your_key_here
just dev
```

### Build

```bash
just build
```

### Serve

```bash
just start
```

### Reset State

```bash
just clean
```

Removes the local SQLite state files in `db/`.

## D. Trigger The Live Demo

This is the live multi-agent wow moment:

```bash
just clean
just demo
```

Requirements:

- `tmux` installed
- ports `3001` and `5173` free

What `just demo` does:

- wipes old room state
- starts the app in `tmux`
- creates a fresh room with Alice and Bob
- starts two local agent bridge panes
- prints participant-specific room URLs

What to do next:

1. Open the Alice and Bob room URLs.
2. Type one insight in the `alice-codex` pane.
3. Type one insight in the `bob-codex` pane.
4. In the browser, show that each delta stays private in the owner’s `Pending` list.
5. Promote one delta.
6. Show it entering shared reasoning and pushing the room toward a shared ADR.

Suggested lines:

- `alice-codex`: Keep private agent output pending until a human promotes it.
- `bob-codex`: The room should converge on one ADR, not a noisy transcript.

Stop the session:

```bash
just demo-stop
```

### Zero-touch variant

Prefer to just point the browser at the room and watch it converge?

```bash
just clean
just demo-interactive
```

Same scaffolding as `just demo` (fresh DB, app server, two bridge panes, two room URLs) plus an autopilot pane that walks the room from first utterance all the way to handoff — no typing needed. The whole pass takes about 60–80 seconds at default tempo. Tune it with:

```bash
just demo-interactive realtime-alignment-demo-auto 2500 0   # faster
just demo-interactive realtime-alignment-demo-auto 3500 1   # keep looping the flow
```

Open the printed **Alice URL** (it has `?participantId=<aliceId>` pinned) — that makes you Alice the decision owner, with full steer/approve rights. If you land on the Join overlay instead, you opened a URL that wasn't the one the script printed.

### Co-pilot variant — you press the final buttons

Same scripted flow, but the autopilot stops right before Alice approves the ADR, so you get to click the last-mile buttons yourself:

```bash
just clean
just demo-copilot
```

You take over as Alice and do: **Approve ADR → Generate plan → Accept owner** (per workstream) **→ Approve plan → Generate handoff**. The room is fully primed — ADR sections filled, reviews in, no blockers — the gates are just waiting for your human approval.

Stop any variant with:

```bash
just demo-stop realtime-alignment-demo-auto    # or -copilot, or your custom session
```
