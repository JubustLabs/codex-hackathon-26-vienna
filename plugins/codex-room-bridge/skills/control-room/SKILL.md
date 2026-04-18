---
name: control-room
description: Control the local georg room end to end through the plugin's MCP tools. Create rooms, join as owner, inspect readiness, draft and approve ADRs, generate plans, and ship handoffs.
---

# Control Room

Use this when Codex should act directly against the local georg API through the plugin's MCP tools.

## Prefer these tools

- `georg_create_room_with_owner`
- `georg_join_room`
- `georg_get_room_snapshot`
- `georg_add_utterance`
- `georg_submit_agent_delta`
- `georg_promote_agent_delta`
- `georg_synthesize_now`
- `georg_update_adr_section`
- `georg_review_adr_section`
- `georg_approve_adr`
- `georg_generate_plan`
- `georg_accept_all_plan_owners`
- `georg_approve_plan`
- `georg_generate_handoff`

## Notes

- The plugin talks to the local server at `GEORG_BASE_URL` and defaults to `http://localhost:3001`.
- Participant-specific room URLs use `GEORG_APP_URL` and default to `http://localhost:5173`.
- Use `georg_get_room_snapshot` whenever you need the latest gating state before approval actions.
- Prefer `georg_create_room_with_owner` when the user wants to operate as the owner immediately.
