# Real-Time Alignment Workspace

## POC Implementation Plan

Status: Draft 0.2
Last updated: 2026-04-18
Audience: Product, engineering, design
Primary goal: prove that a text-first real-time workspace — with one facilitator voice, a frozen alignment taxonomy, and live section-level ownership — lets 2-5 humans converge on a high-quality ADR and concrete implementation plan faster than a shared doc plus ad hoc AI.

---

## 1. Product Summary

**Agreement before generation.** Modern tooling made code, diagrams, and long-form reasoning cheap to produce. What is still slow and painful is agreeing on *what* to build, *which* tradeoffs to accept, and *how* to sequence the work. Teams burn days across fragmented meetings, side-channels, and private AI sessions, each rediscovering the same constraints.

This product is a real-time alignment workspace. It is **not** an agent debate arena. It is **not** a chat tool with AI decorations. It is a single-room workspace where humans stay the decision-makers and a curated AI layer — one facilitator voice, not many competing agents — denoises the room, surfaces common ground, and compiles the outputs the team actually needs:

- a human-approved **architecture decision record** (ADR)
- a concrete **implementation plan** derived from the approved ADR
- an optional **handoff package** for downstream agent-assisted execution

Closest mental model: a collaborative ADR workspace with Google-Docs-like shared presence and fast iteration, but **not** free-form simultaneous paragraph editing. Shared writing is coordinated through visible section ownership because silent overlap is exactly the failure mode this product is trying to remove.

The counter-design we are explicitly avoiding is *N agents talking over each other in a shared timeline while humans scroll past*. Each human may privately attach their own agents, but only typed deltas cross into the shared room, and only one synthesized facilitator voice speaks to the group.

Follow-on iterations can expand into deeper agent connectivity, richer pattern memory, and execution automation. The first thing we must prove is **human alignment**, not agent orchestration.

## 2. Product Thesis

- Generation is cheap; agreement is not.
- Shared chat amplifies noise; a structured AI layer can reduce it.
- ADRs are the right boundary between reasoning and implementation — decisions become explicit, auditable, revisitable.
- A concrete implementation plan tied to the ADR is the artifact teams want to leave the room with.
- Live ownership — who is taking which section, in real time — prevents duplicate work better than after-the-fact coordination.

## 3. POC Goals

The first draft must validate, with at least one recorded 3-person session per claim:

1. 2-5 humans can collaborate in one live room and reach an ADR approval in **under 45 minutes** on a scoped topic.
2. Shared facilitator updates arrive at **no more than 1 per 10 seconds** under typical load.
3. The raw-event to shared-event ratio is **at least 10:1** — denoising actually denoises.
4. The final ADR has **all 12 sections (§15.2) populated** before approval, at least 80% auto-drafted.
5. The implementation plan has an **explicit owner on every plan item** before handoff.
6. Section-level ownership prevents silent overlap across at least one scripted concurrent-edit scenario (§25).
7. **Baseline head-to-head:** in a **45-minute** session on the same topic, same pre-read, and same participant count, the ADR+plan produced by the workspace scores higher than "Google Doc + Claude copy-paste + facilitated meeting" on the rubric in §25 (problem framing, decision clarity, tradeoff explicitness, implementation specificity, owner clarity) by 2 of 3 blind reviewers.

Goal 7 is the load-bearing one. Without the baseline, the other metrics are self-referential.

## 4. POC Non-Goals

Explicitly deferred:

- autonomous architecture decisions by agents
- unrestricted agent-to-agent public chatter
- enterprise multi-tenancy, billing, marketplaces
- fully autonomous code execution
- audio, video, multimodal collaboration
- **CRDT-based co-editing** — we use section-level pessimistic locks via ownership claims instead (§12.4)
- external identity, SSO, advanced RBAC
- pattern-memory promotion workflows, versioning, ranking signals — POC ships a flat seeded library only

## 5. Design Principles

### 5.1 Agreement before generation
Reaching shared agreement is the product. Artifact generation is downstream of agreement, not the main value.

### 5.2 Humans decide
Agents clarify, summarize, compare, and draft. Humans approve the final ADR and the implementation plan.

### 5.3 Real-time does not mean noisy
Raw input and private agent output may be continuous, but shared publication must be filtered, deduplicated, and synthesized.

### 5.4 One facilitator voice in the shared room
The shared room exposes one high-signal AI layer, not many competing agent voices.

### 5.5 ADR is the decision boundary
Live collaboration ends in a formal ADR. Implementation planning starts from the approved ADR, not from chat fragments.

### 5.6 Live ownership must be visible
Participants see in real time who owns which section; the system enforces single-writer per section.

### 5.7 Pattern memory is a small, seeded library in the POC
A handful of hand-curated patterns retrieved by tags. Richness is deferred.

### 5.8 Central control plane, distributed agents
Shared truth, permissions, events, and decisions live in a central backend. Attached agents can connect from elsewhere; that protocol is a v2 concern.

## 6. Primary Users

- **Decision owners.** 1-3 humans named when the room is created. They are accountable for the final decision and form the approval set for the ADR and plan.
- **Contributors.** Humans who participate in the room, add constraints/options/questions, and may edit claimed sections, but do not block approval unless explicitly added to the decision-owner set.
- **Attached agents (v2).** Private, human-owned helpers. Contribute only through typed deltas.
- **Facilitator agent.** One shared system-owned voice that synthesizes the room.
- **Observers.** Read/comment only. Never part of the approval set.

## 7. End-to-End User Journey

### 7.1 Before the session
1. A user creates a room with a **decision brief**: topic, topic tags, decision to make, goal, non-goals, scope, success bar, and initial decision owners.
2. Participants are invited by link or email token.
3. The pattern library pre-fetches matches by topic tags.
4. (v2) Participants may attach agents.

### 7.2 During the session
1. Humans type ideas, constraints, tradeoffs.
2. The classifier (Haiku) tags each utterance with candidate alignment-node deltas.
3. The facilitator (Sonnet) runs every 10s over the last window + current alignment snapshot, emitting a single `facilitator_update`.
4. The alignment board updates with: goals, constraints, options, risks, open questions, agreements, unresolved differences.
5. Pattern panel surfaces matches with a short "why this" justification.
6. The facilitator drafts neutral wording when agreement narrows.

### 7.3 Decision point
1. The room switches to `decide` mode once the option set has been narrowed and the team is ready to make the call.
2. `Decide` mode is where the facilitator surfaces final blockers. Promotion from `decide` to `draft_adr` is blocked while any `unresolved_difference` exists without either a resolution or a linked dissent record (§15.5).
3. The ADR draft becomes the primary artifact.
4. Humans claim sections, edit, and request facilitator drafts as needed.
5. Approval is recorded with provenance: who approved, at what timestamp, based on which alignment snapshot.

### 7.4 After the session
1. Once the ADR is approved, a human triggers the plan generator to create the first draft implementation plan.
2. Humans claim workstreams, edit sequencing and acceptance details, assign owners, and approve.
3. An optional handoff package bundles ADR + plan + pattern references for downstream use.
4. Useful decisions can be manually nominated as new patterns (no auto-promotion in POC).

## 8. Core Product Surfaces

1. **Room view** — live discussion + facilitator stream
2. **Perspective pane** — per-human private view for attached agents (v2)
3. **Alignment board** — live structured panel (the 7 node types, §12.1)
4. **Pattern panel** — seeded patterns surfaced by tag match
5. **Ownership board** — live claims and overlap warnings
6. **ADR editor** — structured, section-locked
7. **Implementation plan editor** — workstream-level, section-locked

## 9. POC Scope

**In:** text-first collaboration, one workspace, one live room type, one facilitator stream, seeded pattern library, ADR drafting + approval, implementation plan generation + approval, live ownership, audit log.

**Out:** voice, video, multiple room archetypes, multi-workspace federation, external IdPs, analytics dashboards, autonomous execution, the full attached-agent protocol (kept as a stub, §19).

---

## 10. System Architecture Overview

### 10.1 High-level shape

```text
React Client(s)
  <-> Bun HTTP + WebSocket server
        -> Session Manager (room lifecycle, presence, locks)
        -> Event Store (SQLite append-only)
        -> Classifier Worker (per-utterance, Haiku)
        -> Facilitator Worker (windowed, Sonnet)
        -> ADR Compiler (on-demand)
        -> Plan Generator (on-demand)
        -> Pattern Service (tag-match over seeded JSON)
```

Everything runs in one Bun process. Workers are in-process async tasks, not separate services. This is deliberate for the POC.

### 10.2 POC stack

- **Frontend:** React 19 + React Router (already in repo) + Vite
- **Backend:** Bun server exposing HTTP + WebSocket from the same process
- **Persistence:** **SQLite** (not Postgres — zero-ops for the demo; migrate later if needed)
- **LLM:** Anthropic SDK, Claude Sonnet 4.6 for synthesis/drafting, Claude Haiku 4.5 for per-delta classification
- **Auth:** magic-link + room token. No SSO.
- **Deployment:** single host (Fly.io or equivalent). One `.env`. One process.

### 10.3 Concurrency model

**Section-level pessimistic locks** backed by ownership claims. Decision rationale: CRDTs are out of scope for a POC, and last-writer-wins produces exactly the silent overlap the product is supposed to prevent.

- A section (ADR section, plan workstream) has at most one active claimant.
- Claim TTL: 60s of inactivity auto-releases.
- Server rejects writes to an unclaimed section. Frontend disables the editor until claim is held.
- Alignment nodes are facilitator-written; humans correct via typed `alignment_correction` deltas rather than direct edit.

## 11. Major Backend Components

### 11.1 Session manager
Room lifecycle, presence, message fanout, claim bookkeeping, permission checks, audit events.

### 11.2 Classifier worker
Runs per utterance. Small Haiku prompt: given utterance + last alignment snapshot, emit zero or more typed deltas (see §13.1) with confidence and a `novelty_hash` over the normalized text. Output is pushed to the working layer, not published to the shared layer.

Cost profile: ~500 input + 200 output tokens per call. Fires only on human utterances (not facilitator output, not claim events).

### 11.3 Facilitator worker
The product's center of gravity. See §13 for the full spec. One call every 10s over the last window, or on manual "synthesize now". Emits exactly one `facilitator_update` event.

### 11.4 ADR compiler
Template-driven, LLM-filled. Input: current alignment snapshot + ADR state. Output: section-level diffs keyed by §15.2 headers. Called on demand from the UI ("regenerate section" or "draft all"), not on every tick.

### 11.5 Plan generator
One-shot from approved ADR. Template in §16. Emits a draft implementation plan with workstream-level granularity. Never runs automatically — humans trigger after ADR approval.

### 11.6 Pattern service
Reads `data/patterns.json` at boot. Tag-match + substring match over problem statement. Returns top 5 with a one-line "why this matches" from Haiku. No embeddings, no ranking, no promotion workflow in the POC.

### 11.7 Agent gateway stub (v2)
A single registered endpoint and typed-delta ingest path. Present for schema completeness so v2 can ship without breaking changes. No capability negotiation, no remote runtimes in the POC.

## 12. Realtime Collaboration Model

### 12.1 Frozen alignment taxonomy (v1)

This is the full set of alignment node types for the POC. It is intentionally small.

| Type | Meaning |
| --- | --- |
| `goal` | What the team is trying to achieve |
| `constraint` | A hard requirement or limit (budget, deadline, compliance, perf) |
| `option` | A candidate approach being considered |
| `risk` | A known danger with a proposed option |
| `open_question` | A question the room has not yet answered |
| `agreement` | A point the room has explicitly converged on |
| `unresolved_difference` | A point where humans hold incompatible positions |

Every alignment node has:

```
{
  id, type, text,
  source_utterance_ids[], source_delta_ids[],
  confidence,            // facilitator's confidence, 0–1
  supersedes_id?,        // if this replaces an older node
  created_by,            // 'facilitator' or participant id
  last_touched_at
}
```

This schema is **frozen for the POC**. Every downstream component targets it.

### 12.2 Three-layer signal model

- **Raw layer.** Every utterance, every private agent output, every classifier delta.
- **Working layer.** Deduplicated deltas, clustered by novelty hash, importance-scored. Internal — not shown to humans directly.
- **Shared layer.** Only facilitator updates, alignment snapshots, pattern suggestions, ADR/plan diffs, ownership events.

### 12.3 Room modes

- `explore` — encourage options and constraints, facilitator emphasizes breadth
- `narrow` — collapse duplicates, force tradeoff clarity, facilitator asks focusing questions
- `decide` — produce candidate wording, expose final blockers, and attach explicit dissent where needed
- `draft_adr` — focus shifts to the ADR editor; facilitator writes section drafts on request. Entry is blocked while any `unresolved_difference` remains without a linked dissent record

Normal path: `explore` -> `narrow` -> `decide` -> `draft_adr`. Humans switch modes. The facilitator can recommend a mode switch but cannot force one. A room may move backward if new blockers appear.

### 12.4 Live ownership model

Ownership is a **server-enforced single-writer lock** per ADR section and per plan workstream. UI shows:

- current owner (user id + display name)
- claim age (auto-releases after 60s inactivity)
- last commit timestamp
- overlap warnings when a human starts editing a claimed section (blocked with a nudge, not silent)

Attached agents (v2) can only act under their owning human's active claim scope.

## 13. Facilitator Engine Spec

This is the single most important component. Getting it right beats everything else.

### 13.1 Typed deltas (classifier output)

| Delta type | Payload |
| --- | --- |
| `goal_detected` | text, confidence |
| `constraint_detected` | text, confidence, hardness: `hard`/`soft` |
| `option_detected` | text, confidence, related_goal_id? |
| `risk_detected` | text, confidence, related_option_id? |
| `open_question_detected` | text, confidence |
| `agreement_signal` | pointer to option/goal id, signal strength |
| `disagreement_signal` | pointer to option/goal id, signal strength |
| `duplicate_of` | pointer to existing node id |
| `conflict_with` | pointer to existing node id |
| `pattern_match` | pattern_id, justification |
| `alignment_correction` | pointer to node id, proposed text/type change |

### 13.2 Facilitator trigger

Runs when **any** of:
- 10 seconds elapsed since last run AND ≥ 1 new high-signal delta
- 50 raw events in backlog
- explicit human "synthesize now"

Skips (no-op) if: zero novelty since last run (measured by novelty hashes).

### 13.3 Facilitator input

- Last N=50 raw events (utterances, deltas, claim events) from the window
- Current alignment snapshot (all nodes)
- Room mode
- Current ADR draft headers only (not full body)

### 13.4 Facilitator output contract

Exactly one event:

```json
{
  "type": "facilitator.update.published",
  "synthesis": "short paragraph, <= 80 words",
  "common_ground_changes": [{ "node_id": "...", "op": "add|update" }],
  "blocker_changes": [{ "node_id": "...", "note": "..." }],
  "alignment_node_deltas": [{ "op": "add|update|supersede", "node": { ... } }],
  "suggested_next_move": "e.g. 'narrow to 2 options' | 'draft decision on X' | null",
  "source_event_ids": ["evt_..."],
  "supersedes": "facil_update_prev_id"
}
```

Every synthesis carries pointers back to the raw events it drew from. This is how audit and "why did the facilitator say that?" work.

### 13.5 Failure modes and mitigations

- **Model timeout / 5xx.** Publish a `facilitator.update.delayed` marker. Do not retry silently. Skip one window.
- **Hallucinated agreement.** Every `agreement` node shows a "Reject" control. Rejecting demotes the node to `unresolved_difference` and records a `facilitator_correction` event that the next call sees.
- **Runaway cost.** Cap at 8 facilitator calls per minute per room. Hard stop.
- **Low-novelty loops.** Novelty-hash skip (§13.2) prevents re-synthesis of identical state.

### 13.6 Latency budget

- Classifier (Haiku): p50 ≤ 800ms, p95 ≤ 2s
- Facilitator (Sonnet): p50 ≤ 3s, p95 ≤ 6s from batch close to publish
- WebSocket fanout: ≤ 100ms

### 13.7 Denoising controls

Human-facing room controls:
- "show only blockers"
- "show only common ground"
- "switch to decide mode"
- "suppress pattern suggestions"
- "freeze wording on section X"
- "promote draft to ADR"
- "reject last synthesis"

## 14. Pattern Memory (POC scope)

Ship a seeded flat library. No promotion workflow, no embeddings, no ranking signals — those are v2.

- **Storage:** `data/patterns.json`, ~10 curated entries at launch.
- **Schema (POC):** `id, title, problem, tags[], approach, preferred_libraries[], anti_patterns[], references[]`. No versioning, no owner, no applicability rules.
- **Retrieval:** tag match + substring on problem statement. Haiku adds a one-line "why this matches" at display time.
- **Promotion:** out of scope. At most, a human can mark "this session produced a pattern worth capturing" → writes a TODO to a file for later human curation.

Richer pattern memory returns when §28 Q5 (ranking signals) has real session data to learn from.

## 15. ADR Workflow

### 15.1 Why ADRs
The ADR is the durable boundary between live reasoning and implementation. It makes decisions explicit, auditable, and revisitable.

### 15.2 ADR sections (POC, all 12)

1. Title
2. Status
3. Context
4. Goals
5. Constraints
6. Options considered
7. Decision
8. Tradeoffs
9. Consequences
10. Implementation guidance
11. Related patterns
12. Approvers

### 15.3 ADR states

`draft` → `in_review` → `approved` (or `superseded`). `dissent_recorded` is a sub-state of `approved`.

### 15.4 Approval rules

- Room creation defines a fixed **decision-owner set** of 1-3 humans.
- Only decision owners approve.
- Contributors and observers never block approval unless explicitly promoted into the decision-owner set by the room owner.
- Changes to the decision-owner set are audited and should happen before `in_review`; changing it after review starts requires moving the ADR back to `draft`.
- Approval requires unanimous approval from the current decision-owner set.
- Approval requires all 12 sections non-empty.
- Approval records snapshot of alignment state and the active decision-owner set at that moment (for audit).

### 15.5 Disagreement handling

This is a first-class flow, not an edge case.

- `Decide` mode may contain unresolved differences; `draft_adr` and approval are blocked while any `unresolved_difference` lacks a resolution path.
- The room can clear a blocker by: converting it to `agreement`, or explicitly recording dissent linked to the specific `unresolved_difference`.
- Dissent flow: named dissenting participant + source unresolved node + short position statement → appended to ADR as a "Dissent" sub-section of "Consequences" and marked as handled for gating purposes.
- Approval with recorded dissent transitions to `approved` with sub-state `dissent_recorded`.

This matters because the product is supposed to *handle* disagreement, not assume it away.

## 16. Implementation Plan and Handoff

### 16.1 Generation

One-shot, template-driven, LLM-filled. Available once the ADR is approved. A human triggers generation; it never runs automatically. It can be regenerated on explicit request.

### 16.2 Fixed plan template

Every plan has exactly these sections:

1. **Summary** — 3–5 sentences on what is being built and why
2. **Workstreams** — named, owner-suggested, sized S/M/L, with dependencies
3. **Sequence and dependencies** — explicit cross-workstream order, external dependencies, and critical path
4. **Deliverables and acceptance checks** — what "done" means for each workstream
5. **Open implementation questions** — carried forward from alignment state
6. **Pattern references** — which patterns inform which workstreams
7. **Risks and rollout notes** — implementation-specific risks, migration notes, and rollout cautions distinct from decision-level risks

### 16.3 Workstream granularity

**Named workstreams, not individual tickets.** Example: "auth middleware rewrite", "data migration script", "read-path caching". Each has:

```
{
  id, title, one_paragraph_description,
  suggested_owner,          // human id
  size,                     // 'S' | 'M' | 'L'
  depends_on[],             // other workstream ids
  deliverables[],
  acceptance_checks[],
  first_step,
  rollout_notes?,
  open_questions[],
  pattern_refs[]
}
```

This granularity is deliberate: finer becomes project management, coarser stops being useful. Tickets are created downstream by the owning human, not by this tool. The plan must still be specific enough that a team can start execution without reopening the architecture debate.

### 16.4 Ownership and claims

Each workstream is claimable. Same lock semantics as ADR sections (§12.4). Plan approval and handoff are gated on every workstream having an owner, at least one deliverable, and at least one acceptance check.

### 16.5 Handoff package

The optional artifact — approved ADR + approved plan + referenced patterns + alignment snapshot — bundled as a single JSON payload plus a human-readable Markdown export. Consumers (human or agent team) get everything they need to start execution.

## 17. Core Domain Model

| Entity | Purpose |
| --- | --- |
| `workspace` | Top-level collaboration boundary |
| `room` | A live session |
| `participant` | Human in a room |
| `agent_runtime` | (v2) Connected attached agent |
| `utterance` | Raw human contribution |
| `agent_delta` | Typed classifier or agent output. `source_event_ids[]`, `supersedes?` |
| `alignment_node` | Goal / constraint / option / risk / question / agreement / unresolved_difference |
| `facilitator_update` | Shared synthesized update. `source_event_ids[]`, `supersedes?` |
| `pattern` | Seeded library entry |
| `adr` | Formal decision record, section-keyed |
| `decision_approval` | Human approval + alignment snapshot |
| `implementation_plan` | Derived from approved ADR |
| `plan_item` | Workstream |
| `ownership_claim` | Single-writer lock over an ADR section or plan item |
| `implementation_package` | Handoff bundle |
| `event_log` | Append-only audit + replay stream |

Every derived entity (`agent_delta`, `facilitator_update`, `alignment_node`) carries `source_event_ids[]` and optional `supersedes` so the three-layer signal flow is fully auditable and replayable.

## 18. Realtime Event Model

### 18.1 Event catalog

```
room.created
room.brief.updated                { brief_fields, changed_by }
room.decision_owners.updated      { decision_owner_ids[], changed_by }
room.mode_changed                 { mode: 'explore'|'narrow'|'decide'|'draft_adr' }
participant.joined
participant.left
human.utterance.created           { text, participant_id }
agent.delta.submitted             { delta_type, payload, source_utterance_id }
alignment.correction.submitted    { node_id, proposed_type?, proposed_text?, source_event_ids[] }
alignment.node.updated            { op, node }
pattern.suggested                 { pattern_id, justification, source_event_ids[] }
facilitator.update.published      { ...§13.4 contract }
facilitator.update.delayed        { reason }
facilitator.correction            { rejected_update_id, reason }
adr.section.claimed               { section, claim_id, ttl_ms }
adr.section.released              { section, reason: 'manual'|'timeout' }
adr.section.overlap_warning       { section, attempted_by }
adr.section.updated               { section, diff, claim_id }
adr.submitted_for_review
adr.approved                      { approver_ids[], decision_owner_ids[], alignment_snapshot_id }
adr.dissent_recorded              { dissenter_id, source_node_id, text }
plan.generated                    { plan_id, adr_id }
plan.updated                      { diff }
plan_item.claimed                 { item_id, claim_id, ttl_ms }
plan_item.released                { item_id, reason: 'manual'|'timeout' }
plan_item.overlap_warning         { item_id, attempted_by }
plan.approved                     { approver_ids[] }
implementation.package.generated  { package_id }
```

### 18.2 Envelope

```json
{
  "id": "evt_...",
  "type": "agent.delta.submitted",
  "roomId": "room_123",
  "actorId": "agent_alice_primary",
  "timestamp": "2026-04-18T12:00:00Z",
  "source_event_ids": ["evt_utt_77"],
  "supersedes": null,
  "payload": {
    "deltaType": "constraint_detected",
    "text": "Low-latency responses are a hard requirement.",
    "confidence": 0.86,
    "hardness": "hard"
  }
}
```

All events carry `source_event_ids[]` and optional `supersedes` where applicable.

## 19. Attached Agents (v2 stub)

**POC ships a stub, not the full protocol.** The schema for `agent_runtime`, the WebSocket auth flow, and the `agent.delta.submitted` path exist so v2 can land without breaking changes. Everything else — capability negotiation, heartbeats, tool-permission boundaries, distributed runtimes — is deferred.

Rationale: the agent integration protocol is a multi-week project. If we do it before the human alignment loop is proven, we spend the POC on the wrong problem.

### 19.1 Privacy enforcement (when v2 ships)

- Perspective-pane subscriptions are **per-user on the server**. The backend filters non-owner private deltas out before fanout. No client-side "hide" that relies on frontend trust.
- Shared synthesis never includes raw private agent content — only novelty-gated deltas that cross into the working layer.
- Attached agents can only act under their owning human's active claim.

## 20. Permissions and Governance

- Room owners create the decision brief, nominate the initial decision-owner set, invite participants, and start decision mode
- Participants contribute; (v2) attach their own agents
- **Only human decision owners** approve ADRs and plans
- Observers can read/comment but never claim sections or block approval
- Changes to the decision-owner set are visible to the room and fully audited
- Only humans trigger handoff and promote patterns
- Ownership claims are visible to all room participants
- Full audit log: who said what, which agent produced which delta, why a facilitator update published, which patterns surfaced, who approved

## 21. API Surface

```
POST /api/workspaces
POST /api/rooms
GET  /api/rooms/:id
PATCH /api/rooms/:id/brief
POST /api/rooms/:id/join
POST /api/rooms/:id/decision-owners       { decision_owner_ids[] }
POST /api/rooms/:id/utterances
POST /api/rooms/:id/mode                  { mode }
GET  /api/rooms/:id/alignment
POST /api/rooms/:id/alignment/corrections { node_id, proposed_type?, proposed_text? }
GET  /api/rooms/:id/patterns
POST /api/rooms/:id/facilitator/synthesize
POST /api/rooms/:id/facilitator/reject    { update_id, reason }
POST /api/rooms/:id/adr/sections/:section/claim
POST /api/rooms/:id/adr/sections/:section/release
POST /api/rooms/:id/adr/sections/:section/write  { diff }
POST /api/rooms/:id/adr/submit
POST /api/rooms/:id/adr/approve
POST /api/rooms/:id/adr/dissent           { text }
POST /api/rooms/:id/plan/generate
POST /api/rooms/:id/plan/items/:itemId/claim
POST /api/rooms/:id/plan/items/:itemId/release
POST /api/rooms/:id/plan/items/:itemId/write
POST /api/rooms/:id/plan/approve
GET  /api/rooms/:id/package
WS   /api/realtime
```

WebSocket carries both user events and (v2) agent-runtime events on the same channel with actor-typed envelopes.

## 22. Frontend Plan and Repo Transition

### 22.1 Repo transition

The repo currently ships the "Predictive Bug Fix" scaffold (React + Vite, no backend). Phase 0 converts this into the alignment workspace scaffold:

- Rename package, update `README.md` to reflect the new product
- Keep `biome.json`, `vite.config.js`, Justfile, pre-commit config
- Retire `src/predictive_bug_fix/` and the `routes`/`catalog`/`hooks` demo pages in `src/app/pages.jsx`
- Replace the route tree in `src/router/tree.js` with the route map below
- Add a new Bun server entrypoint (`src/server/index.js`) with SQLite schema + WebSocket handler
- Keep the existing route-tree introspection pattern — CLI can still walk the tree

### 22.2 Route map

```
/                     workspace overview
/rooms/new            create room
/rooms/:roomId        live brainstorm room
/patterns             seeded pattern library
/adrs/:adrId          ADR detail (read-only view outside a room)
/plans/:planId        plan detail (read-only view outside a room)
/handoff/:packageId   implementation package
/settings             room + agent settings
```

### 22.3 Panels inside a room

Human discussion | Facilitator stream | Alignment board | Pattern suggestions | Ownership board | ADR draft pane | Implementation plan pane | (v2) Perspective pane

## 23. LLM Orchestration & Cost Model

### 23.1 Model routing

- **Classifier per utterance:** Claude Haiku 4.5 — fast, cheap, small prompt
- **Facilitator synthesis:** Claude Sonnet 4.6 — better instruction-following on structured output
- **ADR section draft:** Claude Sonnet 4.6 — one-shot, on demand
- **Plan generation:** Claude Sonnet 4.6 — one-shot, on approved ADR

No routing to Opus in the POC. Opus can be A/B'd later for facilitator only.

### 23.2 Prompt caching

Every facilitator call reuses the same system prompt + alignment-schema stanza — cache those. Rolling window context is non-cacheable; minimize it (§13.3 caps at N=50 events).

### 23.3 Back-of-envelope session cost

A 45-minute session, 3 humans, moderate activity:

- ~120 utterances × Haiku classifier (~500 in / 200 out each) ≈ $0.10
- ~30 facilitator calls (windows with novelty, out of 270 possible) × Sonnet (~3k in / 500 out each) ≈ $0.45
- 1 ADR draft-all + 4 section regens × Sonnet ≈ $0.15
- 1 plan generation × Sonnet ≈ $0.05

Target: **under $1 per session** at POC scale. If this blows out, the facilitator trigger (§13.2) is the first lever — raise the novelty threshold, lengthen the window.

### 23.4 Observability

Log every LLM call with: room_id, mode, model, input_tokens, output_tokens, latency_ms, novelty_score, triggered_by. This is how §26 metrics get computed and how §28 Q3 gets answered.

## 24. Implementation Phases

Demo-first ordering. The facilitator engine is second, not fifth — it is the product.

### Phase 0 — Repo pivot (1–2 days)
- Retire Predictive Bug Fix pages and skill
- Rewrite `README.md`, route tree, package metadata
- Add Bun server entrypoint with SQLite schema
- Wire HTTP + WebSocket in one process
- Exit: static room page renders against real server, WebSocket round-trip works

### Phase 1 — Realtime room foundation (1–2 days)
- Room create + join + leave
- Presence over WebSocket
- Human utterances persisted as append-only events
- Basic room timeline UI
- Exit: two browsers see each other's messages live

### Phase 2 — Facilitator engine v0 (2–3 days) — **core value**
- Classifier worker (Haiku) turning utterances into typed deltas
- Alignment snapshot reducer targeting the frozen v1 taxonomy (§12.1)
- Facilitator worker (Sonnet) with full output contract (§13.4)
- Novelty gating, batching, cap (§13.2, §13.5)
- Alignment board UI with 7 node types
- Exit: a 10-minute scripted brainstorm produces a coherent alignment snapshot and ≤ 1 facilitator update per 10s

### Phase 3 — ADR editor and approval (1–2 days)
- 12-section ADR model and editor
- Section-level claim / release / auto-release (§12.4)
- "Regenerate section" button → ADR compiler call
- `decide`-mode gate on unresolved differences (§15.5)
- Dissent recording flow
- Approval with alignment snapshot
- Exit: a room can end in an approved ADR, with a scripted dissent case working

### Phase 4 — Plan editor and approval (1 day)
- Plan generation from approved ADR
- Workstream-level claim / release
- Approval gated on every workstream having an owner
- Exit: approved ADR produces a reviewed plan with owners

### Phase 5 — Seeded pattern library (0.5 day)
- `data/patterns.json` with ~10 entries
- Tag + substring retrieval
- Haiku "why this matches" on display
- Exit: relevant patterns surface during a brainstorm

### Phase 6 — Handoff package (0.5 day)
- One-shot bundler: ADR + plan + patterns + alignment snapshot → JSON + Markdown export
- Exit: a demo run produces a downloadable package

### Phase 7+ (post-POC) — Attached-agent protocol
Deferred. See §19.

## 25. Testing Strategy

### Automated
- Unit: alignment reducer, novelty hashing, claim TTL, dissent gate
- Integration: room lifecycle, claim contention, WebSocket event ordering
- Contract: facilitator output conforms to §13.4 schema on golden transcripts
- UI: ADR approval flow, plan approval flow, ownership overlap warnings

### Manual (scripted scenarios)
- **S1:** two humans, one disagrees on an option → room enters `decide` mode → `draft_adr` is blocked until the room records dissent → approval with `dissent_recorded`
- **S2:** three humans, scripted concurrent edits on the same ADR section → overlap warning blocks second editor
- **S3:** noisy 10-minute brainstorm → raw:shared ratio measured ≥ 10:1 (§3 goal 3)
- **S4:** reconnect mid-session → client replays event log and restores state
- **S5:** baseline head-to-head (§3 goal 7) — same prompt, same pre-read, same participant count, same 45-minute timebox, 3 blind reviewers

### Baseline evaluation protocol
- The workspace condition and baseline condition use the same briefing pack, participant roster size, and facilitator role.
- The baseline is: shared Google Doc + private Claude/ChatGPT use + live meeting.
- Reviewers only see the exported ADR + plan, anonymized and randomized.
- Each reviewer scores 1-5 on: problem framing, decision clarity, tradeoff explicitness, implementation specificity, and owner clarity.
- Success: the workspace wins on median total score for at least 2 of 3 reviewers.

## 26. Success Metrics

Primary:
- **Goal 7 (baseline head-to-head).** If this fails, the POC failed.
- Baseline rubric score by dimension
- Time from room start to ADR approval
- Time from ADR approval to plan approval
- Raw-to-shared event ratio
- Unresolved differences at session end
- Overlap warnings that prevented duplicate edits
- Percent ADR sections auto-drafted before approval
- Percent plan items with explicit owner before handoff
- LLM cost per session

Qualitative (from participants):
- "Was the facilitator useful or noise?"
- "Did the ADR match what you actually agreed on?"
- "Would you use this over a shared doc?"

## 27. Key Risks

### 27.1 Facilitator produces false agreements
Mitigation: human "reject synthesis" control that demotes to `unresolved_difference` and logs a correction the next call sees.

### 27.2 Alignment taxonomy too rigid or too loose
Mitigation: frozen at 7 types for POC. Measure session-level "this didn't fit anywhere" corrections. Re-tune after 5 real sessions.

### 27.3 Cost runaway
Mitigation: 8-call/min facilitator cap (§13.5), novelty-gate skips, prompt caching.

### 27.4 Ownership locks feel heavy
Mitigation: 60s inactivity auto-release, visible claimant, overlap warning (not silent block with no recourse).

### 27.5 Plan generator produces generic project management
Mitigation: workstream-level granularity (§16.3), reject individual-ticket output in the template.

### 27.6 The room feels like chat with decorations
Mitigation: alignment board and ADR draft are always visible primary panels, not side panels.

## 28. Known Dials (not open questions)

These were "open questions" in v0.1. They are tunable parameters now.

- **Q1. Private agent detail in live session.** Dial: perspective-pane verbosity slider (per-user). Default: medium. Test both extremes in scripted sessions.
- **Q2. Alignment taxonomy.** Frozen at 7 types for POC (§12.1). Revisit after 5 sessions.
- **Q3. Facilitator cadence.** Hybrid: 10s window OR 50-event backlog OR manual. §13.2. Tunable via `FACILITATOR_WINDOW_MS` env var.
- **Q4. Approval model for 2–5 humans.** Fixed decision-owner set declared at room creation. Default: unanimous approval from that set. Revisit if rooms get larger.
- **Q5. Pattern ranking.** Tag + substring only (§14). Embeddings + ranking are v2.
- **Q6. Plan granularity.** Workstreams, not tickets (§16.3). If users complain it's too coarse, add a "break down" action that expands one workstream into sub-items.

## 29. Recommended Build Order

Same as §24 phases, because §24 was already ordered by demo value:

1. Phase 0: Repo pivot
2. Phase 1: Realtime room
3. **Phase 2: Facilitator engine v0 — the product**
4. Phase 3: ADR editor + dissent
5. Phase 4: Plan editor
6. Phase 5: Pattern library
7. Phase 6: Handoff package
8. (Post-POC) Attached-agent protocol

This order preserves a demoable human-centered product by the end of Phase 4 (~5–8 days). Phases 5–6 are polish. Agent connectivity is v2.

## 30. Prior Art and Positioning

What this is **not** reinventing, and why it is still different:

- **Miro / FigJam** — freeform visual collaboration. No structured decision artifact, no denoising layer. We target the *output* (ADR + plan), not the canvas.
- **Notion AI / Coda AI** — async doc + AI. No realtime synthesis across multiple humans talking at once.
- **Linear Canvas / Stately** — planning and state machines. No decision-reasoning layer, no facilitator voice.
- **tldraw + AI / Excalidraw + AI** — visual-first, no consensus model.
- **Roam / Obsidian + AI** — single-user knowledge, not multi-human alignment.
- **Shared Google Doc + ChatGPT/Claude copy-paste** — our explicit baseline (§3 goal 7). Cheap, available today, and what teams actually do. We must be meaningfully better than this.

The differentiators we are betting on: **one facilitator voice**, **three-layer signal model**, **frozen alignment taxonomy**, **section-level single-writer locks**, and **ADR-as-decision-boundary**.

## 31. Final Recommendation

Treat the first draft as a focused product experiment:

- one central realtime room
- one facilitator voice (Sonnet, 10s windows, full §13.4 contract)
- one alignment model (the 7-type v1 taxonomy)
- one seeded pattern library (flat JSON, tag retrieval)
- one ADR as the decision artifact (12 sections, dissent-aware)
- one implementation plan (workstream-level, owner-required)
- one live ownership model (section-level single-writer locks)
- one optional handoff package
- attached personal agent teams as v2, not the foundation

If Phases 0–4 hold and goal 7 lands, we have evidence that curated AI + structured human alignment beats the shared-doc baseline. That evidence earns the right to build v2 — richer agent connectivity, deeper memory, downstream execution automation. Without goal 7, the rest is decoration.
