# Realtime Decision Alignment

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
- opens the slides at `http://localhost:3030`

If the video already exists and you just want the deck:

```bash
just demo-pitch-quick
```

Deck only:

```bash
just slides-dev
```

On first run, the slide commands will auto-install missing slide/video dependencies and render the demo video asset if needed.

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

On first run, this may auto-install video dependencies and download Remotion's headless browser once.

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

Installs app, slide, and video dependencies.

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

Direct bridge commands if you want to drive it manually:

```bash
just bridge-watch ROOM_ID PARTICIPANT_ID alice-codex
just bridge-submit ROOM_ID PARTICIPANT_ID alice-codex "Keep humans in control of promotion."
```

## Notes

- Shared room sockets use `/ws`.
- Local agent runtimes use `/agent-ws`.
- Pending private deltas stay private until a human promotes them.
- The browser UI is snapshot-driven and refreshes over WebSocket invalidation.
