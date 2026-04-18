# Real-Time Alignment Workspace

## POC Implementation Plan

Status: Draft 0.2
Last updated: 2026-04-18
Audience: Product, engineering, design
Primary goal: prove that a text-first real-time workspace — with one facilitator voice, a frozen alignment taxonomy, and live section-level ownership — lets 2-5 humans reach shared understanding on the problem, decision, tradeoffs, and next steps quickly enough to produce a high-quality ADR and concrete implementation plan faster than a shared doc plus ad hoc AI.

For the POC, "alignment" means participants can independently restate the problem, chosen option, key tradeoffs, and immediate workstreams closely enough that the room does not need to reopen the decision before execution starts. It does not require unanimous enthusiasm, but it does require shared clarity.

---

## 1. Product Summary

**Agreement before generation.** Modern tooling made code, diagrams, and long-form reasoning cheap to produce. What is still slow and painful is agreeing on *what* to build, *which* tradeoffs to accept, and *how* to sequence the work. Teams burn days across fragmented meetings, side-channels, and private AI sessions, each rediscovering the same constraints.

This product is a real-time alignment workspace. It is **not** an agent debate arena. It is **not** a chat tool with AI decorations. It is a single-room workspace where humans stay the decision-makers and a curated AI layer — one facilitator voice, not many competing agents — denoises the room, surfaces common ground, and compiles the outputs the team actually needs:

- a human-approved **architecture decision record** (ADR)
- a concrete **implementation plan** derived from the approved ADR
- an optional **handoff package** for downstream agent-assisted execution

The room starts with two explicit context layers before anyone drafts anything: workspace guardrails (what the team is allowed or expected to use) and an evidence-backed catalog of existing components worth reusing (what the team already has). The product should make both visible early so the discussion does not start from a blank slate.

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
4. Immediately after approval, at least **80% of participants** pass the post-session alignment check (§25): they can independently restate the problem, decision, key tradeoff, first implementation workstream, and remaining open question / owner with **4 of 5 answers** materially matching the approved ADR+plan.
5. The final ADR has **all 12 sections (§15.2) populated** before approval, and every section has been explicitly human-reviewed before approval.
6. The implementation plan has an **accepted owner on every workstream** and every open implementation question has a named resolver and next checkpoint before handoff.
7. When relevant existing components or hard workspace guardrails exist, the final ADR+plan either references them explicitly or records a human-readable justification for not using them.
8. Section-level ownership prevents silent overlap across at least one scripted concurrent-edit scenario (§25).
9. **Baseline head-to-head:** in a **45-minute** session on the same topic, same pre-read, and same participant count, the workspace beats "Google Doc + Claude copy-paste + facilitated meeting" on both: (a) blind review of the exported ADR+plan using the rubric in §25 (problem framing, decision clarity, tradeoff explicitness, implementation specificity, owner clarity) by 2 of 3 reviewers, and (b) the post-session participant alignment check.

The combined baseline comparison is the load-bearing one. Without it, the other metrics are self-referential.

## 4. POC Non-Goals

Explicitly deferred:

- autonomous architecture decisions by agents
- unrestricted agent-to-agent public chatter
- enterprise multi-tenancy, billing, marketplaces
- fully autonomous code execution
- audio, video, multimodal collaboration
- **CRDT-based co-editing for ADR / plan prose** — we use section-level pessimistic locks via ownership claims instead (§12.4); only typed subdecision fields get structured conflict detection
- external identity, SSO, advanced RBAC
- pattern-memory promotion workflows, versioning, ranking signals — POC ships a flat seeded library only
- deep semantic code-graph analysis or runtime tracing for component discovery — the POC uses evidence-backed manifest / repo discovery plus human confirmation

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

### 5.9 Alignment is shared understanding, not unanimous enthusiasm
Formal approval belongs to a named decision-owner set, but the product is optimizing for room-level clarity. Participants should leave able to restate the same problem, decision, tradeoffs, and next steps even when dissent is recorded.

### 5.10 Reuse before invention
When an existing component already fits the decision space, the room should see it before inventing something new. Reuse is not mandatory in every case, but net-new components require an explicit reason.

### 5.11 Guardrails are explicit product inputs
Technology preferences and constraints such as "we use Rust", "prefer Postgres", or "do not add a second queue" belong in structured guardrails, not buried in prompts or tribal memory.

### 5.12 Revision history is a product surface
The room should not only produce the latest ADR. It should preserve immutable ADR revisions, the version history of major subdecisions, and the provenance of approvals so teams can see how the decision changed over time.

### 5.13 Structured conflicts may be machine-detected; prose conflicts may not
For free-form ADR and plan text, the product should prevent overlap with ownership locks. For typed subdecisions, the product may detect field-level conflicts and auto-merge only when the changes are semantically disjoint.

## 6. Primary Users

- **Decision owners.** 1-3 humans named when the room is created. They are accountable for the final decision and form the formal approval set for the ADR and plan.
- **Contributors.** Humans who participate in the room, add constraints/options/questions/tradeoffs, and may edit claimed sections. They do not formally approve the ADR or plan, but disagreements they raise remain visible until resolved, recorded as dissent, or explicitly marked non-blocking.
- **Attached agents (v2).** Private, human-owned helpers. Contribute only through typed deltas.
- **Facilitator agent.** One shared system-owned voice that synthesizes the room.
- **Observers.** Read/comment only. Never part of the approval set.

## 7. End-to-End User Journey

### 7.1 Before the session
1. A user creates a room with a **decision brief**: topic, topic tags, decision to make, goal, non-goals, scope, success bar, and initial decision owners. The room inherits workspace guardrails by default; the creator may add room-specific overrides with audit.
2. Participants are invited by link or email token.
3. The pattern library pre-fetches matches by topic tags.
4. The component catalog refreshes from workspace evidence sources and surfaces likely reusable components for the topic.
5. Participants can review the active guardrails before discussion starts.
6. (v2) Participants may attach agents.

### 7.2 During the session
1. Humans type ideas, constraints, tradeoffs.
2. The classifier (Haiku) tags each utterance with candidate alignment-node deltas.
3. The facilitator (Sonnet) runs every 10s over the last window + current alignment snapshot, emitting a single `facilitator_update`.
4. The alignment board updates with: goals, constraints, options, tradeoffs, risks, open questions, agreements, unresolved differences.
5. Pattern panel surfaces matches with a short "why this" justification.
6. Component catalog surfaces likely reusable services/modules/packages with evidence paths and confidence.
7. Guardrail panel shows hard constraints, soft preferences, and any active option conflicts.
8. The facilitator drafts neutral wording when agreement narrows and highlights when an option violates a hard guardrail or ignores a likely reusable component.

### 7.3 Decision point
1. The room switches to `decide` mode once the option set has been narrowed and the team is ready to make the call.
2. `Decide` mode is where the facilitator surfaces final blockers. Promotion from `decide` to `draft_adr` is blocked while any `unresolved_difference` exists without either a resolution, a linked dissent record, or an explicit `non_blocking` mark from the participant who raised it (§15.5).
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
2. **Alignment board** — live structured panel (the 8 node types, §12.1)
3. **Pattern panel** — seeded patterns surfaced by tag match
4. **Component catalog panel** — autodiscovered reusable components with evidence and human confirmation state
5. **Guardrails panel** — workspace constraints/preferences and room overrides
6. **Ownership board** — live claims and overlap warnings
7. **ADR editor** — structured, section-locked
8. **Implementation plan editor** — workstream-level, section-locked

The per-human perspective pane for attached agents is a v2 surface and is intentionally absent from the POC UI, even though the protocol stub exists (§19).

## 9. POC Scope

**In:** text-first collaboration, one workspace, one live room type, one facilitator stream, seeded pattern library, workspace guardrails, evidence-backed component autodiscovery, ADR drafting + approval, ADR revision history, typed subdecision tracking, implementation plan generation + approval, live ownership, audit log.

**Out:** voice, video, multiple room archetypes, multi-workspace federation, external IdPs, analytics dashboards, autonomous execution, the full attached-agent protocol and any participant-facing perspective pane (kept as a stub only, §19), and deep whole-codebase semantic discovery beyond evidence-backed POC heuristics.

---

## 10. System Architecture Overview

### 10.1 High-level shape

```text
React Client(s)
  <-> Bun HTTP + WebSocket server
        -> Session Manager (room lifecycle, presence, locks)
        -> Event Store (SQLite append-only)
        -> Revision Service (ADR / subdecision / plan snapshots)
        -> Guardrail Service (workspace defaults + room overrides)
        -> Component Catalog Service (manifest/repo scan + confirmation state)
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

### 10.3 Concurrency and conflict model

**Section-level pessimistic locks** backed by ownership claims remain the default for ADR and plan prose. Decision rationale: CRDTs are out of scope for a POC, and last-writer-wins produces exactly the silent overlap the product is supposed to prevent.

- A section (ADR section, plan workstream) has at most one active claimant.
- Claim TTL: 60s of inactivity auto-releases.
- Server rejects writes to an unclaimed section. Frontend disables the editor until claim is held.
- Alignment nodes are facilitator-written; humans correct via typed `alignment_correction` deltas rather than direct edit.
- ADR and plan prose do **not** use character-level merge or CRDT conflict resolution in the POC.
- Typed subdecisions use optimistic concurrency with `base_revision_id`.
- The server may auto-merge subdecision writes only when they touch disjoint fields or additive collections.
- If two writes change the same semantic field of a subdecision, the server emits a conflict record instead of guessing a merge. Humans resolve that conflict explicitly.

## 11. Major Backend Components

### 11.1 Session manager
Room lifecycle, presence, message fanout, claim bookkeeping, permission checks, audit events.

### 11.2 Classifier worker
Runs per utterance. Small Haiku prompt: given utterance + last alignment snapshot, emit zero or more typed deltas (see §13.1) with confidence and a `novelty_hash` over the normalized text. Output is pushed to the working layer, not published to the shared layer.

Cost profile: ~500 input + 200 output tokens per call. Fires only on human utterances (not facilitator output, not claim events).

### 11.3 Facilitator worker
The product's center of gravity. See §13 for the full spec. One call every 10s over the last window, or on manual "synthesize now". Emits exactly one `facilitator_update` event.

### 11.4 ADR compiler
Template-driven, LLM-filled. Input: current alignment snapshot + ADR state + current subdecision state + active guardrails + relevant confirmed components. Output: section-level diffs keyed by §15.2 headers. Called on demand from the UI ("regenerate section" or "draft all"), not on every tick.

### 11.5 Plan generator
One-shot from an approved ADR revision. Template in §16. Emits a draft implementation plan with workstream-level granularity, reuse suggestions, and any required guardrail exception slots. Never runs automatically — humans trigger after ADR approval.

### 11.6 Pattern service
Reads `data/patterns.json` at boot. Tag-match + substring match over problem statement. Returns top 5 with a one-line "why this matches" from Haiku. No embeddings, no ranking, no promotion workflow in the POC.

### 11.7 Guardrail service
Stores workspace-level defaults and room-level overrides. For the demo, it can seed from `data/guardrails.json` and persist active values in SQLite. Exposes hard constraints, soft preferences, and reuse policy to the facilitator, ADR compiler, and plan generator.

### 11.8 Component catalog service
Builds a workspace-local catalog of likely reusable components from evidence-first sources: `Cargo.toml`, workspace manifests, `package.json`, `pyproject.toml`, lockfiles, infra manifests, conventional repo paths (`crates/`, `packages/`, `services/`), and existing ADR Markdown. Produces candidate entries with file-path evidence and confidence. Humans can confirm or ignore entries; pure LLM-only discovery is not sufficient for POC truth.

### 11.9 Revision service
Materializes immutable `adr_revision`, `subdecision_revision`, and `plan_revision` snapshots from the event stream. Creates revisions on manual checkpoint, `submit_for_review`, approval, and conflict resolution. Supports replay, diffing, and approval provenance without making mutable draft rows the source of truth.

### 11.10 Agent gateway stub (v2)
A single registered endpoint and typed-delta ingest path. Present for schema completeness so v2 can ship without breaking changes. No capability negotiation, no remote runtimes in the POC.

## 12. Realtime Collaboration Model

### 12.1 Frozen alignment taxonomy (v1)

This is the full set of alignment node types for the POC. It is intentionally small.

| Type | Meaning |
| --- | --- |
| `goal` | What the team is trying to achieve |
| `constraint` | A hard requirement or limit (budget, deadline, compliance, perf) |
| `option` | A candidate approach being considered |
| `tradeoff` | A benefit/cost exchange the team is explicitly accepting |
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
- **Shared layer.** Only facilitator updates, alignment snapshots, pattern suggestions, component suggestions, guardrail alerts, ADR/plan diffs, ownership events.

### 12.3 Room modes

- `explore` — encourage options and constraints, facilitator emphasizes breadth
- `narrow` — collapse duplicates, force tradeoff clarity, facilitator asks focusing questions
- `decide` — produce candidate wording, expose final blockers, and attach explicit dissent where needed
- `draft_adr` — focus shifts to the ADR editor; facilitator writes section drafts on request. Entry is blocked while any `unresolved_difference` remains without a linked dissent record or explicit `non_blocking` mark

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
| `tradeoff_detected` | text, confidence, related_option_id? |
| `risk_detected` | text, confidence, related_option_id? |
| `open_question_detected` | text, confidence |
| `component_reference` | component_id, relation: `reuse`/`extend`/`replace`/`new` |
| `guardrail_signal` | rule_key, disposition: `supports`/`conflicts`, severity: `hard`/`soft` |
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
- Active guardrail snapshot
- Top matched confirmed components
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
- "show guardrail conflicts"
- "show reusable components"
- "switch to decide mode"
- "suppress pattern suggestions"
- "freeze wording on section X"
- "promote draft to ADR"
- "reject last synthesis"

## 14. Patterns, Guardrails, and Components (POC scope)

The POC ships three explicit decision-context inputs: seeded patterns, explicit workspace guardrails, and an evidence-backed component catalog.

### 14.1 Pattern memory

Ship a seeded flat library. No promotion workflow, no embeddings, no ranking signals — those are v2.

- **Storage:** `data/patterns.json`, ~10 curated entries at launch.
- **Schema (POC):** `id, title, problem, tags[], approach, preferred_libraries[], anti_patterns[], references[]`. No versioning, no owner, no applicability rules.
- **Retrieval:** tag match + substring on problem statement. Haiku adds a one-line "why this matches" at display time.
- **Promotion:** out of scope. At most, a human can mark "this session produced a pattern worth capturing" → writes a TODO to a file for later human curation.

### 14.2 Workspace guardrails

Guardrails are explicit inputs that shape the decision and the generated artifacts.

- **Storage:** seeded from `data/guardrails.json` for the demo, persisted in SQLite, editable in workspace settings, and snapshotted into each room at creation.
- **Schema (POC):**

```json
{
  "allowed_languages": ["rust"],
  "preferred_frameworks": ["axum", "sqlx"],
  "preferred_libraries": ["tokio", "serde"],
  "banned_technologies": ["kafka"],
  "required_platforms": ["postgres"],
  "reuse_policy": "require_existing_or_justify",
  "notes": ["Prefer extending an existing service before adding a new one."]
}
```

- **Semantics:** hard guardrails act like formal constraints; soft guardrails act like strong defaults that can be overridden with justification.
- **Overrides:** a room may add scoped overrides, but they are audited and shown to all participants.
- **Enforcement:** the facilitator flags conflicts during discussion; ADR and plan approval are blocked on unresolved hard-guardrail conflicts unless an explicit exception is recorded.

### 14.3 Component catalog

Autodiscovery is evidence-backed, not magic.

- **Discovery sources:** `Cargo.toml`, workspace manifests, `package.json`, `pyproject.toml`, lockfiles, infra manifests, conventional directories, and existing ADR Markdown.
- **Schema (POC):** `id, name, kind, summary?, inferred_tags[], repo_paths[], evidence[], owner?, confidence, status`. Status is one of `candidate`, `confirmed`, or `ignored`.
- **Confirmation:** humans can confirm or ignore discovered entries. Only confirmed entries count as trusted reusable components in approval gating.
- **Retrieval:** match topic tags + problem statement + guardrails against component names, tags, kinds, and evidence paths; surface top matches with "why this is relevant".
- **Scope limit:** no deep static analysis, runtime traffic mining, or automatic dependency graph understanding in the POC.

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
- Only decision owners formally approve.
- Contributors and observers do not formally approve, but unresolved differences raised by any participant must still be resolved, recorded as dissent, or marked `non_blocking` before approval.
- Changes to the decision-owner set are audited and should happen before `in_review`; changing it after review starts requires moving the ADR back to `draft`.
- Approval requires unanimous approval from the current decision-owner set.
- Approval requires all 12 sections non-empty.
- Approval requires every section to have been explicitly human-reviewed, even if its initial text came from the facilitator.
- Approval is blocked if the chosen option violates an active hard guardrail without a recorded exception.
- Approval records snapshot of alignment state and the active decision-owner set at that moment (for audit).

### 15.5 Disagreement handling

This is a first-class flow, not an edge case.

- `Decide` mode may contain unresolved differences; `draft_adr` and approval are blocked while any `unresolved_difference` lacks a resolution path.
- The room can clear a blocker by: converting it to `agreement`, explicitly recording dissent linked to the specific `unresolved_difference`, or having the participant who raised it mark it `non_blocking`.
- Dissent flow: named dissenting participant + source unresolved node + short position statement → appended to ADR as a "Dissent" sub-section of "Consequences" and marked as handled for gating purposes.
- Approval with recorded dissent transitions to `approved` with sub-state `dissent_recorded`.

This matters because the product is supposed to *handle* disagreement, not assume it away.

### 15.6 Guardrail and reuse rules

- `Constraints` must reflect active hard guardrails relevant to the decision.
- `Decision` or `Implementation guidance` must name the confirmed existing components being reused, extended, or replaced when such components are materially relevant.
- If the ADR chooses a net-new component while a matching confirmed component exists, the ADR must record why reuse was rejected.
- If the ADR intentionally breaks a soft guardrail, the rationale must be written down in `Tradeoffs` or `Consequences`.

### 15.7 Historization and typed subdecisions

The ADR has two layers:

- a mutable working draft used during the live room
- immutable `adr_revision` snapshots used for review, approval, replay, and comparison

ADR revisions are created at:

- manual checkpoint
- `adr.submitted_for_review`
- `adr.approved`
- `subdecision.conflict.resolved`

Every `adr_revision` stores:

```json
{
  "id": "adr_rev_...",
  "adr_id": "adr_...",
  "revision_number": 7,
  "parent_revision_id": "adr_rev_6",
  "reason": "manual|review|approval|conflict_resolution",
  "sections": { "context": "...", "decision": "...", "...": "..." },
  "alignment_snapshot_id": "align_snap_...",
  "guardrail_snapshot_id": "guardrails_snap_...",
  "component_refs": ["comp_auth_service"],
  "subdecision_revision_ids": ["subdec_lang_rev_3", "subdec_store_rev_5"],
  "created_by": "user_123",
  "created_at": "2026-04-18T12:00:00Z"
}
```

Subdecisions are the bounded architectural choices inside the ADR that deserve their own history and conflict handling. Examples: runtime language, storage engine, queue strategy, deployment topology, rollout strategy. Wording edits, minor examples, and most narrative text are **not** subdecisions.

Each `subdecision` has immutable `subdecision_revision`s. Writes must include `base_revision_id`.

- If two edits touch disjoint fields or additive lists, the server may auto-merge and create a new revision.
- If two edits touch the same semantic field, the server emits `subdecision.conflict.detected`.
- Conflict resolution creates a new `subdecision_revision` that points at the conflicting parents.
- ADR prose still uses section locks; only structured subdecision fields get built-in conflict resolution.

This gives the product Google-Docs-like resilience only where the data is structured enough for the merge to be defensible.

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
6. **Existing components to reuse** — which confirmed components each workstream reuses, extends, or replaces
7. **Pattern references** — which patterns inform which workstreams
8. **Guardrail exceptions** — any justified deviations from workspace defaults or hard constraints
9. **Risks and rollout notes** — implementation-specific risks, migration notes, and rollout cautions distinct from decision-level risks

### 16.3 Workstream granularity

**Named workstreams, not individual tickets.** Example: "auth middleware rewrite", "data migration script", "read-path caching". Each has:

```
{
  id, title, one_paragraph_description,
  suggested_owner,          // human id
  owner_status,             // 'proposed' | 'accepted'
  size,                     // 'S' | 'M' | 'L'
  depends_on[],             // other workstream ids
  deliverables[],
  acceptance_checks[],
  component_refs[],         // [{ component_id, relation, note? }]
  guardrail_exceptions[],   // [{ rule_key, justification }]
  first_step,
  rollout_notes?,
  open_questions[],         // [{ text, resolver_id, due_before }]
  pattern_refs[]
}
```

This granularity is deliberate: finer becomes project management, coarser stops being useful. Tickets are created downstream by the owning human, not by this tool. The plan must still be specific enough that a team can start execution without reopening the architecture debate.

### 16.4 Plan states

`draft` → `in_review` → `approved` (or `superseded`)

### 16.5 Approval rules

- The plan can only be generated from an approved ADR revision.
- Only decision owners formally approve the overall plan.
- Approval requires unanimous approval from the current decision-owner set.
- Approval requires every workstream to have an accepted owner, at least one deliverable, and at least one acceptance check.
- Open implementation questions are allowed only when each question is attached to a workstream, has a named resolver, and has an explicit `due_before` checkpoint. Unowned "we'll figure it out later" questions block plan approval.
- Approval requires every net-new component or hard-guardrail exception to carry explicit justification and a named owner for validation / follow-up.
- Approval records the exact `source_adr_revision_id` and the plan snapshot used for approval.

### 16.6 Ownership and claims

Each workstream is claimable. Same lock semantics as ADR sections (§12.4). Claim ownership of a workstream section is separate from accepting responsibility for that workstream; the latter is required for plan approval.

### 16.7 Handoff package

The optional artifact — approved ADR revision + approved plan revision + referenced patterns + alignment snapshot — bundled as a single JSON payload plus a human-readable Markdown export. Consumers (human or agent team) get everything they need to start execution.

### 16.8 Plan historization

The implementation plan follows the same draft + immutable revision pattern as the ADR, but without subdecision-level conflict logic.

- `plan_revision` is created on manual checkpoint, `plan.submitted_for_review`, and `plan.approved`
- every plan revision stores `source_adr_revision_id`
- plan text stays under section / workstream locks rather than CRDT merge

## 17. Core Domain Model

| Entity | Purpose |
| --- | --- |
| `workspace` | Top-level collaboration boundary |
| `workspace_guardrail` | Structured tech constraints/preferences and reuse policy |
| `room` | A live session |
| `participant` | Human in a room |
| `agent_runtime` | (v2) Connected attached agent |
| `utterance` | Raw human contribution |
| `agent_delta` | Typed classifier or agent output. `source_event_ids[]`, `supersedes?` |
| `alignment_node` | Goal / constraint / option / tradeoff / risk / question / agreement / unresolved_difference |
| `component_catalog_entry` | Autodiscovered or confirmed reusable module/service/package |
| `component_evidence` | File-path or document evidence for a component entry |
| `facilitator_update` | Shared synthesized update. `source_event_ids[]`, `supersedes?` |
| `pattern` | Seeded library entry |
| `adr` | Formal decision record, section-keyed |
| `adr_revision` | Immutable whole-ADR snapshot used for review, approval, and diff |
| `subdecision` | Bounded architectural choice tracked inside an ADR |
| `subdecision_revision` | Immutable revision of one structured subdecision |
| `subdecision_conflict` | Explicit semantic conflict between competing subdecision revisions |
| `decision_approval` | Human approval + alignment snapshot + approved revision pointers |
| `implementation_plan` | Derived from an approved ADR revision, with explicit review state |
| `plan_revision` | Immutable whole-plan snapshot with source ADR revision pointer |
| `plan_item` | Workstream with owner proposal / acceptance state |
| `plan_question` | Open implementation question with resolver + due checkpoint |
| `ownership_claim` | Single-writer lock over an ADR section or plan item |
| `implementation_package` | Handoff bundle with approved ADR / plan revision pointers |
| `event_log` | Append-only audit + replay stream |

Every derived entity (`agent_delta`, `facilitator_update`, `alignment_node`) carries `source_event_ids[]` and optional `supersedes` so the three-layer signal flow is fully auditable and replayable.

## 18. Realtime Event Model

### 18.1 Event catalog

```
room.created
workspace.guardrails.updated       { fields, changed_by }
component.catalog.refreshed        { component_count, changed_by }
component.entry.confirmed          { component_id, changed_by }
component.entry.ignored            { component_id, changed_by }
room.brief.updated                { brief_fields, changed_by }
room.guardrails.overridden        { fields, changed_by }
room.decision_owners.updated      { decision_owner_ids[], changed_by }
room.mode_changed                 { mode: 'explore'|'narrow'|'decide'|'draft_adr' }
participant.joined
participant.left
human.utterance.created           { text, participant_id }
agent.delta.submitted             { delta_type, payload, source_utterance_id } // v2 stub only
alignment.correction.submitted    { node_id, proposed_type?, proposed_text?, source_event_ids[] }
alignment.node.updated            { op, node }
pattern.suggested                 { pattern_id, justification, source_event_ids[] }
component.suggested               { component_id, justification, source_event_ids[] }
guardrail.alerted                 { rule_key, severity, note, source_event_ids[] }
facilitator.update.published      { ...§13.4 contract }
facilitator.update.delayed        { reason }
facilitator.correction            { rejected_update_id, reason }
adr.section.claimed               { section, claim_id, ttl_ms }
adr.section.released              { section, reason: 'manual'|'timeout' }
adr.section.overlap_warning       { section, attempted_by }
adr.section.updated               { section, diff, claim_id }
adr.revision.created              { adr_revision_id, revision_number, reason }
adr.submitted_for_review          { adr_revision_id }
subdecision.created               { subdecision_id, title, kind }
subdecision.revision.created      { subdecision_id, subdecision_revision_id, base_revision_id }
subdecision.conflict.detected     { subdecision_id, left_revision_id, right_revision_id, fields[] }
subdecision.conflict.resolved     { subdecision_id, resolution_revision_id }
adr.approved                      { approver_ids[], decision_owner_ids[], alignment_snapshot_id, adr_revision_id, subdecision_revision_ids[] }
adr.dissent_recorded              { dissenter_id, source_node_id, text }
plan.generated                    { plan_id, adr_id, source_adr_revision_id }
plan.revision.created             { plan_revision_id, revision_number, reason, source_adr_revision_id }
plan.submitted_for_review         { plan_revision_id }
plan.updated                      { diff }
plan_item.claimed                 { item_id, claim_id, ttl_ms }
plan_item.released                { item_id, reason: 'manual'|'timeout' }
plan_item.overlap_warning         { item_id, attempted_by }
plan_item.owner_accepted          { item_id, owner_id }
plan.approved                     { approver_ids[], source_adr_id, source_adr_revision_id, plan_revision_id }
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

**POC ships a stub, not the full protocol.** The schema for `agent_runtime`, the WebSocket auth flow, and the `agent.delta.submitted` path exist so v2 can land without breaking changes. Everything else — capability negotiation, heartbeats, tool-permission boundaries, distributed runtimes, and any participant-facing perspective-pane UI — is deferred.

Rationale: the agent integration protocol is a multi-week project. If we do it before the human alignment loop is proven, we spend the POC on the wrong problem.

### 19.1 Privacy enforcement (when v2 ships)

- Perspective-pane subscriptions are **per-user on the server**. The backend filters non-owner private deltas out before fanout. No client-side "hide" that relies on frontend trust.
- Shared synthesis never includes raw private agent content — only novelty-gated deltas that cross into the working layer.
- Attached agents can only act under their owning human's active claim.

## 20. Permissions and Governance

- Room owners create the decision brief, nominate the initial decision-owner set, invite participants, and start decision mode
- Room owners can create scoped guardrail overrides for their room; those overrides are visible and audited
- Workspace owners define default guardrails and can refresh / confirm the component catalog
- Participants contribute; (v2) attach their own agents
- **Only human decision owners** approve ADRs and plans
- Any participant may raise an unresolved difference; it must be resolved, recorded as dissent, or marked `non_blocking` before approval can proceed
- Observers can read/comment but never claim sections or block approval
- Changes to the decision-owner set are visible to the room and fully audited
- Only humans trigger handoff and promote patterns
- Ownership claims are visible to all room participants
- Full audit log: who said what, which agent produced which delta, why a facilitator update published, which patterns surfaced, who approved

## 21. API Surface

```
POST /api/workspaces
GET  /api/workspaces/:id/guardrails
PATCH /api/workspaces/:id/guardrails
GET  /api/workspaces/:id/components
POST /api/workspaces/:id/components/refresh
POST /api/workspaces/:id/components/:componentId/confirm
POST /api/workspaces/:id/components/:componentId/ignore
POST /api/rooms
GET  /api/rooms/:id
PATCH /api/rooms/:id/brief
PATCH /api/rooms/:id/guardrails
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
POST /api/rooms/:id/adr/checkpoints
GET  /api/adrs/:adrId/revisions
GET  /api/adrs/:adrId/revisions/:revisionId
GET  /api/adrs/:adrId/subdecisions
POST /api/adrs/:adrId/subdecisions
POST /api/adrs/:adrId/subdecisions/:subdecisionId/write   { base_revision_id, patch }
POST /api/adrs/:adrId/subdecisions/:subdecisionId/resolve-conflict
POST /api/rooms/:id/plan/generate
POST /api/rooms/:id/plan/submit
POST /api/rooms/:id/plan/items/:itemId/claim
POST /api/rooms/:id/plan/items/:itemId/release
POST /api/rooms/:id/plan/items/:itemId/accept-owner
POST /api/rooms/:id/plan/items/:itemId/write
POST /api/rooms/:id/plan/approve
GET  /api/plans/:planId/revisions
GET  /api/plans/:planId/revisions/:revisionId
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
/components           workspace component catalog
/patterns             seeded pattern library
/adrs/:adrId          ADR detail (read-only view outside a room)
/plans/:planId        plan detail (read-only view outside a room)
/handoff/:packageId   implementation package
/settings             workspace guardrails + room + agent settings
```

### 22.3 Panels inside a room

Human discussion | Facilitator stream | Alignment board | Pattern suggestions | Component catalog | Guardrails | Ownership board | ADR draft pane | Implementation plan pane

The perspective pane remains v2-only and does not ship as a room panel in the POC.

The ADR draft pane should expose:

- a revision timeline for whole-ADR checkpoints
- a subdecision list for major architectural choices
- explicit conflict badges when a subdecision needs human resolution

## 23. LLM Orchestration & Cost Model

### 23.1 Model routing

- **Classifier per utterance:** Claude Haiku 4.5 — fast, cheap, small prompt
- **Facilitator synthesis:** Claude Sonnet 4.6 — better instruction-following on structured output
- **ADR section draft:** Claude Sonnet 4.6 — one-shot, on demand
- **Plan generation:** Claude Sonnet 4.6 — one-shot, on an approved ADR revision

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
- Seed workspace guardrails and component-catalog tables
- Add basic evidence-scan job for component refresh
- Wire HTTP + WebSocket in one process
- Exit: static room page renders against real server, WebSocket round-trip works

### Phase 1 — Realtime room foundation (1–2 days)
- Room create + join + leave
- Presence over WebSocket
- Human utterances persisted as append-only events
- Room state includes active guardrail snapshot and basic component matches
- Basic room timeline UI
- Exit: two browsers see each other's messages live

### Phase 2 — Facilitator engine v0 (2–3 days) — **core value**
- Classifier worker (Haiku) turning utterances into typed deltas
- Alignment snapshot reducer targeting the frozen v1 taxonomy (§12.1)
- Facilitator worker (Sonnet) with full output contract (§13.4)
- Novelty gating, batching, cap (§13.2, §13.5)
- Guardrail snapshot + matched component inputs wired into facilitator context
- Alignment board UI with 8 node types
- Exit: a 10-minute scripted brainstorm produces a coherent alignment snapshot and ≤ 1 facilitator update per 10s

### Phase 3 — ADR editor and approval (2–3 days)
- 12-section ADR model and editor
- Section-level claim / release / auto-release (§12.4)
- "Regenerate section" button → ADR compiler call
- `decide`-mode gate on unresolved differences (§15.5)
- Guardrail-conflict and reuse-justification gates
- Immutable ADR revision snapshots on checkpoint / review / approval
- Typed subdecision editor with optimistic concurrency and conflict resolution
- Dissent recording flow
- Approval with alignment snapshot
- Exit: a room can end in an approved ADR, with a scripted dissent case working

### Phase 4 — Plan editor and approval (1–2 days)
- Plan generation from an approved ADR revision
- Workstream-level claim / release
- Existing-component references and guardrail-exception fields per workstream
- Immutable plan revision snapshots on checkpoint / review / approval
- Approval gated on every workstream having an owner
- Exit: an approved ADR revision produces a reviewed plan with owners

### Phase 5 — Decision context management (1 day)
- `data/patterns.json` with ~10 entries
- `data/guardrails.json` with demo defaults
- Human confirm / ignore / merge actions for autodiscovered components
- Dedicated component catalog route and guardrail settings UI
- Tag + substring retrieval
- Haiku "why this matches" on display
- Exit: relevant patterns, reusable components, and workspace guardrails surface during a brainstorm with dedicated management flows

### Phase 6 — Handoff package (0.5 day)
- One-shot bundler: ADR + plan + patterns + alignment snapshot → JSON + Markdown export
- Exit: a demo run produces a downloadable package

### Phase 7+ (post-POC) — Attached-agent protocol
Deferred. See §19.

## 25. Testing Strategy

### Automated
- Unit: alignment reducer, novelty hashing, claim TTL, dissent gate, guardrail gating, component scan normalization, ADR revision creation, subdecision conflict detection
- Integration: room lifecycle, claim contention, WebSocket event ordering, component refresh, guardrail snapshotting, revision replay from event log
- Contract: facilitator output conforms to §13.4 schema on golden transcripts
- UI: ADR approval flow, plan approval flow, owner-acceptance gating, ownership overlap warnings, subdecision conflict resolution

### Manual (scripted scenarios)
- **S1:** two humans, one disagrees on an option → room enters `decide` mode → `draft_adr` is blocked until the room records dissent → approval with `dissent_recorded`
- **S2:** three humans, scripted concurrent edits on the same ADR section → overlap warning blocks second editor
- **S3:** noisy 10-minute brainstorm → raw:shared ratio measured ≥ 10:1 (§3 goal 3)
- **S4:** reconnect mid-session → client replays event log and restores state
- **S5:** post-session alignment check — participants independently restate problem, decision, key tradeoff, first workstream, and remaining open question / owner
- **S6:** workspace with active guardrails ("Rust only", preferred libraries, banned tech) → facilitator surfaces conflicts and approval is blocked until the ADR / plan records an exception or switches options
- **S7:** repo with a relevant existing component → component catalog surfaces it, and the plan either reuses it or explicitly justifies a net-new replacement
- **S8:** two humans edit different fields of the same subdecision from the same base revision → server auto-merges into a new subdecision revision
- **S9:** two humans edit the same field of the same subdecision from the same base revision → `subdecision.conflict.detected` appears and requires explicit resolution
- **S10:** baseline head-to-head (§3 goal 9) — same prompt, same pre-read, same participant count, same 45-minute timebox, 3 blind reviewers + the same participant alignment check in both conditions

### Alignment check protocol
- Immediately after ADR + plan approval, each participant privately answers five prompts without looking at the exported artifact.
- Prompts: what problem are we solving, what decision was made, what key tradeoff was accepted, what is the first implementation workstream, and what open question still remains with which owner / resolver.
- Score 1 point per answer that materially matches the approved ADR+plan.
- Session pass threshold: at least 80% of participants score 4/5 or better.

### Baseline evaluation protocol
- The workspace condition and baseline condition use the same briefing pack, participant roster size, and facilitator role.
- The baseline is: shared Google Doc + private Claude/ChatGPT use + live meeting.
- Reviewers only see the exported ADR + plan, anonymized and randomized.
- Each reviewer scores 1-5 on: problem framing, decision clarity, tradeoff explicitness, implementation specificity, and owner clarity.
- Each participant also completes the alignment check in both conditions.
- Success: the workspace wins on median total score for at least 2 of 3 reviewers and on the participant alignment check.

## 26. Success Metrics

Primary:
- **Goal 9 (combined baseline head-to-head).** If this fails, the POC failed.
- Baseline rubric score by dimension
- Participant alignment-check pass rate
- Time from room start to ADR approval
- Time from ADR approval to plan approval
- Raw-to-shared event ratio
- Unresolved differences at session end
- Overlap warnings that prevented duplicate edits
- Percent ADR sections explicitly human-reviewed before approval
- Percent plan items with owner accepted before handoff
- Percent open implementation questions with resolver + checkpoint before handoff
- Percent approved ADRs referencing confirmed existing components when relevant
- Percent hard-guardrail exceptions with explicit justification
- Percent approved ADRs with replayable revision history and linked subdecision revisions
- Time to resolve a structured subdecision conflict
- LLM cost per session

Qualitative (from participants):
- "Was the facilitator useful or noise?"
- "Did the ADR match what you actually agreed on?"
- "Did you leave knowing what happens next without reopening the debate?"
- "Would you use this over a shared doc?"

## 27. Key Risks

### 27.1 Facilitator produces false agreements
Mitigation: human "reject synthesis" control that demotes to `unresolved_difference` and logs a correction the next call sees.

### 27.2 Alignment taxonomy too rigid or too loose
Mitigation: frozen at 8 types for POC. Measure session-level "this didn't fit anywhere" corrections. Re-tune after 5 real sessions.

### 27.3 Cost runaway
Mitigation: 8-call/min facilitator cap (§13.5), novelty-gate skips, prompt caching.

### 27.4 Ownership locks feel heavy
Mitigation: 60s inactivity auto-release, visible claimant, overlap warning (not silent block with no recourse).

### 27.5 Plan generator produces generic project management
Mitigation: workstream-level granularity (§16.3), reject individual-ticket output in the template.

### 27.6 The room feels like chat with decorations
Mitigation: alignment board and ADR draft are always visible primary panels, not side panels.

### 27.7 Component autodiscovery is noisy or hallucinates modules that are not really reusable
Mitigation: evidence-first discovery only, visible file-path evidence, human confirmation state, and approval gating based only on confirmed entries.

### 27.8 Guardrails become invisible prompt lore instead of product behavior
Mitigation: explicit guardrails panel, room snapshotting, facilitator conflict surfacing, and approval-time enforcement.

### 27.9 Subdecision modeling becomes too granular and turns the room into paperwork
Mitigation: restrict subdecisions to bounded architectural choices that merit independent history. Do not create them for prose-only edits, examples, or routine drafting.

### 27.10 Built-in conflict handling creates false confidence
Mitigation: allow automatic merge only for disjoint structured fields. Same-field changes always produce explicit human-resolved conflicts.

## 28. Known Dials (not open questions)

These were "open questions" in v0.1. They are tunable parameters now.

- **Q1. Private agent detail in live session.** Dial: perspective-pane verbosity slider (per-user). Default: medium. Test both extremes in scripted sessions.
- **Q2. Alignment taxonomy.** Frozen at 8 types for POC (§12.1). Revisit after 5 sessions.
- **Q3. Facilitator cadence.** Hybrid: 10s window OR 50-event backlog OR manual. §13.2. Tunable via `FACILITATOR_WINDOW_MS` env var.
- **Q4. Approval model for 2–5 humans.** Fixed decision-owner set declared at room creation. Default: unanimous approval from that set, with unresolved differences from any participant requiring resolution, dissent, or `non_blocking` triage. Revisit if rooms get larger.
- **Q5. Pattern ranking.** Tag + substring only (§14). Embeddings + ranking are v2.
- **Q6. Plan granularity.** Workstreams, not tickets (§16.3). If users complain it's too coarse, add a "break down" action that expands one workstream into sub-items.
- **Q7. Component discovery confidence threshold.** Default: only `confirmed` components participate in approval gating. Candidate-only matches remain advisory.
- **Q8. Subdecision threshold.** Default: create subdecisions only for architectural choices likely to change independently or deserve explicit conflict handling.

## 29. Recommended Build Order

Same as §24 phases, because §24 was already ordered by demo value:

1. Phase 0: Repo pivot
2. Phase 1: Realtime room
3. **Phase 2: Facilitator engine v0 — the product**
4. Phase 3: ADR editor + dissent
5. Phase 4: Plan editor
6. Phase 5: Decision context management
7. Phase 6: Handoff package
8. (Post-POC) Attached-agent protocol

This order preserves a demoable human-centered product by the end of Phase 5 (~6–9 days). Phase 6 is export polish. Agent connectivity is v2.

## 30. Prior Art and Positioning

What this is **not** reinventing, and why it is still different:

- **Miro / FigJam** — freeform visual collaboration. No structured decision artifact, no denoising layer. We target the *output* (ADR + plan), not the canvas.
- **Notion AI / Coda AI** — async doc + AI. No realtime synthesis across multiple humans talking at once.
- **Linear Canvas / Stately** — planning and state machines. No decision-reasoning layer, no facilitator voice.
- **tldraw + AI / Excalidraw + AI** — visual-first, no consensus model.
- **Roam / Obsidian + AI** — single-user knowledge, not multi-human alignment.
- **Shared Google Doc + ChatGPT/Claude copy-paste** — our explicit baseline (§3 goal 9). Cheap, available today, and what teams actually do. We must be meaningfully better than this.

The differentiators we are betting on: **one facilitator voice**, **three-layer signal model**, **frozen alignment taxonomy**, **section-level single-writer locks**, and **ADR-as-decision-boundary**.
The supporting advantage is that the room starts with explicit context: known guardrails and reusable components, not just opinions and generated text.
The history advantage is that the room preserves immutable ADR revisions and typed subdecision revisions instead of flattening everything into one mutable document.

## 31. Final Recommendation

Treat the first draft as a focused product experiment:

- one central realtime room
- one facilitator voice (Sonnet, 10s windows, full §13.4 contract)
- one alignment model (the 8-type v1 taxonomy)
- one seeded pattern library (flat JSON, tag retrieval)
- one explicit guardrail layer (workspace defaults + room overrides)
- one evidence-backed component catalog (autodiscovered, then human-confirmed)
- one ADR as the decision artifact (12 sections, dissent-aware)
- immutable ADR revisions plus typed subdecision revisions
- one implementation plan (workstream-level, owner-accepted, open-question-triaged)
- one live ownership model (section-level single-writer locks)
- one optional handoff package
- attached personal agent teams as v2, not the foundation

If Phases 0–5 hold and the combined baseline result lands, we have evidence that curated AI + structured human alignment beats the shared-doc baseline. That evidence earns the right to build v2 — richer agent connectivity, deeper memory, downstream execution automation. Without that result, the rest is decoration.
