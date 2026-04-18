# Codex Room Bridge

This repo-local plugin now has two parts:

- a local stdio MCP server that talks to the `georg` HTTP API on `localhost`
- the original live bridge for private agent deltas over `/agent-ws`

## What it does

- lets Codex create rooms, join as owner, inspect room snapshots, and drive ADR/plan/handoff actions through MCP tools
- opens an owner-scoped socket for one room participant
- submits typed private deltas without exposing full local session context
- prints `pending`, `promoted`, and `discarded` status changes as the human reviews them in the browser

## Quick start

Install plugin dependencies once:

```bash
cd plugins/codex-room-bridge
bun install
```

Start the app first:

```bash
cd georg
export ALLOW_LOCAL_HEURISTIC_FALLBACK=1
just dev
```

## Using it as a plugin in Codex

The plugin is already listed in the repo-local marketplace at `.agents/plugins/marketplace.json`.

Once installed in Codex, it starts the local MCP server declared in `.mcp.json` and exposes `georg_*` tools such as:

- `georg_health`
- `georg_create_room_with_owner`
- `georg_get_room_snapshot`
- `georg_submit_agent_delta`
- `georg_approve_adr`
- `georg_generate_plan`
- `georg_approve_plan`
- `georg_generate_handoff`

Example prompts:

- `Create a new georg room and join me as the decision owner.`
- `Inspect the current room snapshot and tell me the next gated action.`
- `Submit a private delta to the room and promote it if it helps.`

If you want to verify the MCP server locally without the Codex UI:

```bash
cd plugins/codex-room-bridge
bun run smoke
```

## Live bridge usage

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
