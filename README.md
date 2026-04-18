# Governed Knowledge Base Workspace (Demo v1)

Local demo app for a governance-first documentation workflow.

## Stack

- Backend: Node.js + Express + WebSocket (`ws`) + SQLite (`better-sqlite3`)
- Frontend: React + Vite (Shadcn-style component patterns)
- AI orchestration: OpenAI Responses API

## Setup

1. Install deps:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Set your OpenAI key in `.env`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.4-mini
DEMO_SHARED_API_KEY=demo-shared-key
DEMO_AGENT_ONLY=true
VITE_DEMO_AGENT_ONLY=true
PORT=3001
```

## Run

Terminal 1 (API):

```bash
npm run dev:server
```

Terminal 2 (Web):

```bash
npm run dev:web
```

Open `http://localhost:5173`.

## Demo Notes

- Seed principals:
  - `usr_owner` (owner)
  - `usr_rev1` (reviewer)
  - `usr_rev2` (reviewer)
  - `usr_admin` (admin)
- Seed sections: security policy, engineering runbook, product spec.
- UI actor switcher simulates 3-user role flow.
- Write actions require `actor_id` and include `source_client` in audit events.
- In demo mode (`DEMO_AGENT_ONLY=true`) the visible user input path is the single bottom-middle agent chatbox.
- The orchestrator runs in the background on each agent chat request and proposal submission.

## Implemented Core Flows

- Proposal submission with orchestrator triage.
- Owner-only protected publish gate.
- Reviewer decisions and request-changes path.
- Conflict detection + owner resolution (diff + explanation + manual patch editor).
- Owner quick edit with mandatory reason (disabled when `DEMO_AGENT_ONLY=true`).
- Rollback with mandatory reason.
- Append-only event log retained for orchestrator/agent context (hidden from demo UI).
- WebSocket update fanout.

## Scripts

- `npm run dev:server` - start API
- `npm run dev:web` - start frontend
- `npm run dev` - run both
- `npm run check` - TypeScript check frontend
- `npm run build:web` - production frontend build
