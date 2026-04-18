---
name: control-room
description: Control the local georg room end to end through the plugin's MCP tools. Create rooms, join as owner, inspect readiness, draft and approve ADRs, generate plans, and ship handoffs.
---

# Control Room

Use this when Codex should act directly against the local georg API through the plugin's MCP tools.

## Prefer these tools

- `room_create_room_with_owner`
- `room_join_room`
- `room_get_room_snapshot`
- `room_add_utterance`
- `room_submit_agent_delta`
- `room_promote_agent_delta`
- `room_synthesize_now`
- `room_update_adr_section`
- `room_review_adr_section`
- `room_approve_adr`
- `room_generate_plan`
- `room_accept_all_plan_owners`
- `room_approve_plan`
- `room_generate_handoff`

## Notes

- The plugin talks to the local server at `ROOM_BASE_URL` and defaults to `http://localhost:3001`.
- Participant-specific room URLs use `ROOM_APP_URL` and default to `http://localhost:5173`.
- Use `room_get_room_snapshot` whenever you need the latest gating state before approval actions.
- Prefer `room_create_room_with_owner` when the user wants to operate as the owner immediately.
