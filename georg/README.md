# Realtime Alignment Workspace POC

This folder contains a self-contained implementation of the docs-only plan in [`docs/realtime-alignment-workspace-poc-plan.md`](../docs/realtime-alignment-workspace-poc-plan.md).

It ships a vertical slice with:

- Bun HTTP + WebSocket server
- React + Vite client
- SQLite persistence
- realtime room timeline and alignment board
- private pending deltas plus promotion into shared reasoning
- ADR drafting with section claims, review markers, and approval gates
- plan generation with workstream owner acceptance
- human-triggered handoff package export

## Run it

From the repo root:

```bash
cd georg
just install
just dev
```

Open `http://localhost:5173`.

The Vite client runs on port `5173`. The Bun server runs on port `3001` by default and honors `PORT` if you need a different local port. The SQLite database is created at `georg/db/workspace.sqlite`.

## Useful commands

```bash
cd georg
just check
just build
just start
```

`just start` serves the built frontend from Bun after `just build`.

## OpenAI requirement

The product path for this POC is OpenAI Responses only. Set an API key before running the end-to-end room flow:

```bash
cd georg
export OPENAI_API_KEY=your_key_here
just dev
```

If you only need a local smoke test without a provider, set `ALLOW_LOCAL_HEURISTIC_FALLBACK=1` explicitly. That fallback exists only for local development verification and is not the intended product path.

## Pre-commit

This folder includes a scoped pre-commit config based on the reference setup, but limited to `georg/` files.

Install and run it from the repo root:

```bash
just -f georg/justfile precommit-install
just -f georg/justfile precommit-run
```

The hooks cover:

- Prettier formatting
- ESLint autofix
- TypeScript typecheck
- merge-conflict marker detection
- max-lines guard

## Notes

- The room is snapshot-driven on the client: writes go through HTTP, and the UI refetches on WebSocket invalidation.
- Section claims auto-release after 60 seconds of inactivity on the server.
- Handoff packages are generated explicitly by a human after ADR and plan approval.
