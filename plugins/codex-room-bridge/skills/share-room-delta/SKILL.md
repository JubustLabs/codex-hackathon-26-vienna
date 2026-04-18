---
name: share-room-delta
description: Submit a concise private delta from a local Codex session into the georg room over the dedicated agent WebSocket bridge.
---

# Share Room Delta

Use this when you want to push one distilled insight from the local agent context into the live room without exposing the full session.

## Inputs

- `roomId`
- `participantId`
- `sourceAgent`
- one concise delta sentence

## Command

```bash
cd georg
just bridge-submit ROOM_ID PARTICIPANT_ID SOURCE_AGENT "Keep the Bun server as the single realtime process."
```

For an interactive lane instead of a one-shot submit:

```bash
cd georg
just bridge-watch ROOM_ID PARTICIPANT_ID SOURCE_AGENT
```
