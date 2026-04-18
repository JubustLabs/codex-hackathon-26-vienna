---
name: converge-bridge
description: Use when working on the local Converge prototype and you need to reason about how local workspace context becomes approved deltas in the shared room.
---

# Converge Bridge

This plugin is a thin local bridge for the Converge hackathon prototype.

## Purpose

Use it to keep the local-agent story concrete:

- local participant identity
- local workspace context
- approved delta publishing
- routed conflict packets back to the participant

## MVP Contract

The bridge should stay minimal.

- Do not auto-publish raw local context into the room.
- Only human-approved deltas become shared state.
- Keep the public contract tiny:
  - `get_identity`
  - `workspace_summary`
  - `publish_delta`
  - `fetch_room_updates`

## Local Testing

The prototype room server runs on `http://localhost:3001`.

Core endpoints:

- `POST /plugin/connect`
- `POST /plugin/publish-delta`
- `POST /plugin/ack`
- `GET /room`
- `GET /health`

The room WebSocket lives at:

- `ws://localhost:3001/ws`

## Product Guardrails

- The bridge is local-first.
- The bridge is not a marketplace-ready plugin yet.
- The bridge exists to prove the concept in one seeded demo flow.
