# Codex Room Bridge

This repo-local plugin bridge connects a local Codex-style runtime to the `georg` demo server over the dedicated agent WebSocket protocol at `/agent-ws`.

## What it does

- opens an owner-scoped socket for one room participant
- submits typed private deltas without exposing full local session context
- prints `pending`, `promoted`, and `discarded` status changes as the human reviews them in the browser

## Quick start

Start the app first:

```bash
cd georg
export ALLOW_LOCAL_HEURISTIC_FALLBACK=1
just dev
```

In the browser room UI, copy the `Room id` and `Your participant id` from the `Bridge ids` panel.

Open a live bridge:

```bash
cd georg
just bridge-watch ROOM_ID PARTICIPANT_ID alice-codex
```

Every non-empty line you type becomes a pending private delta. Promote or discard it in the UI and the terminal will print the resulting status.

For a one-shot submit instead of an interactive session:

```bash
cd georg
just bridge-submit ROOM_ID PARTICIPANT_ID alice-codex "Keep the private agent lane separate from shared room state."
```

## Protocol

Connection query params:

- `roomId`
- `participantId`
- `sourceAgent`

Client messages:

- `agent.delta.submit`
- `ping`

Server messages:

- `agent.socket.ready`
- `agent.delta.accepted`
- `agent.delta.status`
- `room.invalidate`
- `socket.error`
- `pong`
