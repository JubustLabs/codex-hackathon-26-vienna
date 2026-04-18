# Real-Time Alignment Workspace

## POC Implementation Plan

Status: Draft 0.3
Last updated: 2026-04-18
Audience: Product, engineering, design
Primary goal: prove that a text-first real-time workspace — with private human-agent loops, one shared orchestrator, a frozen alignment taxonomy, and live section-level ownership — lets 2-5 humans reach shared understanding on the problem, decision, tradeoffs, and next steps quickly enough to produce a high-quality ADR and concrete implementation plan faster than a shared doc plus ad hoc AI.

For the POC, "alignment" means participants can independently restate the problem, chosen option, key tradeoffs, and immediate workstreams closely enough that the room does not need to reopen the decision before execution starts. It does not require unanimous enthusiasm, but it does require shared clarity.

The primary thing being proved is still human alignment. Orchestrated private-agent collaboration is the mechanism under test, not the final success criterion by itself.

---

## 1. Product Summary

**Agreement before generation.** Modern tooling made code, diagrams, and long-form reasoning cheap to produce. What is still slow and painful is agreeing on *what* to build, *which* tradeoffs to accept, and *how* to sequence the work. Teams burn days across fragmented meetings, side-channels, and private AI sessions, each rediscovering the same constraints.

This product is a real-time alignment workspace. It is **not** an unbounded agent debate arena. It is **not** a chat tool with AI decorations. It is a single-room workspace where humans stay the decision-makers, each participant may work through a private local agent, and one shared orchestrator denoises the room, surfaces common ground, redirects ideas to the right people, challenges weak proposals, and compiles the outputs the team actually needs:

- a human-approved **architecture decision record** (ADR)
- a concrete **implementation plan** derived from the approved ADR
- an optional **handoff package** for downstream agent-assisted execution

The room starts with two explicit context layers before anyone drafts anything: workspace guardrails (what the team is allowed or expected to use) and an evidence-backed catalog of existing components worth reusing (what the team already has). The product should make both visible early so the discussion does not start from a blank slate.

Closest mental model: a collaborative ADR workspace with Google-Docs-like shared presence and fast iteration, but **not** free-form simultaneous paragraph editing. Shared writing is coordinated through visible section ownership because silent overlap is exactly the failure mode this product is trying to remove.

The counter-design we are explicitly avoiding is *N agents talking over each other in a shared timeline while humans scroll past*. Each human may privately attach their own agents, but only typed deltas cross into the shared room, and only one synthesized orchestrator voice speaks to the group. The orchestrator is stronger than a summarizer: it compares what A/B/C are proposing, detects conflicts and hidden agreement, routes relevant context across participants, and tells the room when a proposal is weak against guardrails, domain needs, or existing evidence.

The first thing we must prove is **human alignment with mediated agent support**: private human-agent ping-pong locally, orchestrated convergence publicly.

## 2. Product Thesis

- Generation is cheap; agreement is not.
- Shared chat amplifies noise; a structured orchestration layer can reduce it.
- ADRs are the right boundary between reasoning and implementation — decisions become explicit, auditable, revisitable.
- A concrete implementation plan tied to the ADR is the artifact teams want to leave the room with.
- Live ownership — who is taking which section, in real time — prevents duplicate work better than after-the-fact coordination.
- Private agents are useful only if the shared orchestrator can merge, compare, and route their outputs without turning the room into noise.
- Private-agent orchestration matters only insofar as it improves human convergence, artifact quality, and clarity of next steps.

## 3. POC Goals

The first draft must validate, with at least one recorded 3-person session per claim:

1. 2-5 humans can collaborate in one live room and reach an ADR approval in **under 45 minutes** on a scoped topic.
2. Shared orchestrator updates arrive at **no more than 1 per 10 seconds** under typical load.
3. The raw-event to shared-event ratio is **at least 10:1** — denoising actually denoises.
4. Immediately after approval, at least **80% of participants** pass the post-session alignment check (§25): they can independently restate the problem, decision, key tradeoff, first implementation workstream, and remaining open question / owner with **4 of 5 answers** materially matching the approved ADR+plan.
5. The final ADR has **all 12 sections (§15.2) populated** before approval, and every section has been explicitly human-reviewed before approval.
6. The implementation plan has an **accepted owner on every workstream** and every open implementation question has a named resolver and next checkpoint before handoff.
7. When relevant existing components or hard workspace guardrails exist, the final ADR+plan either references them explicitly or records a human-readable justification for not using them.
8. Section-level ownership prevents silent overlap across at least one scripted concurrent-edit scenario (§25).
9. **Baseline head-to-head:** in a **45-minute** session on the same topic, same pre-read, and same participant count, the workspace beats "Google Doc + Claude copy-paste + facilitated meeting" on both: (a) blind review of the exported ADR+plan using the rubric in §25 (problem framing, decision clarity, tradeoff explicitness, implementation specificity, owner clarity) by 2 of 3 reviewers, and (b) the post-session participant alignment check.
10. At least **60%** of promoted agent deltas and orchestrator-routed insights are marked `relevant` by the owning / receiving human, or are incorporated into the approved alignment snapshot, ADR, or plan.

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

### 5.4 One orchestrator voice in the shared room
The shared room exposes one high-signal AI layer, not many competing agent voices.

### 5.5 ADR is the decision boundary
Live collaboration ends in a formal ADR. Implementation planning starts from the approved ADR, not from chat fragments.

### 5.6 Live ownership must be visible
Participants see in real time who owns which section; the system enforces single-writer per section.

### 5.7 Pattern memory is a small, seeded library in the POC
A handful of hand-curated patterns retrieved by tags. Richness is deferred.

### 5.8 Central control plane, distributed agents
Shared truth, permissions, events, and decisions live in a central backend. Attached agents can connect from elsewhere in the POC, but their outputs reach the room only through typed deltas and orchestrator mediation.

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
- **Attached agents.** Private, human-owned helpers. They help their human think locally. Their deltas may be visible to the orchestrator in pending private form for routing/comparison, but only promoted deltas can influence shared alignment state or other participants.
- **Shared orchestrator.** One system-owned voice that synthesizes the room, compares participant proposals, routes insights across humans, and challenges low-quality reasoning against domain constraints, guardrails, and evidence.
- **Observers.** Read/comment only. Never part of the approval set.

## 7. End-to-End User Journey

### 7.1 Before the session
1. A user creates a room with a **decision brief**: topic, topic tags, decision to make, goal, non-goals, scope, success bar, and initial decision owners. The room inherits workspace guardrails by default; the creator may add room-specific overrides with audit.
2. Participants are invited by link or email token.
3. The pattern library pre-fetches matches by topic tags.
4. The component catalog refreshes from workspace evidence sources and surfaces likely reusable components for the topic.
5. Participants can review the active guardrails before discussion starts.
6. Participants may optionally attach one or more private agents.

### 7.2 During the session
1. Humans type ideas, constraints, tradeoffs.
2. The classifier (Haiku) tags each utterance with candidate alignment-node deltas.
3. Participant agents produce private typed-delta candidates in the perspective pane. Pending candidates are visible only to the owning human and the orchestrator. Humans approve, edit, discard, or promote them.
4. The orchestrator (Sonnet) runs every 10s over the last shared merge window + current alignment snapshot, emitting a single `orchestrator_update`.
5. The alignment board updates with: goals, constraints, options, tradeoffs, risks, open questions, agreements, unresolved differences.
6. The orchestrator highlights where one person's proposal is relevant to another person's blocker or domain concern.
7. Pattern panel surfaces matches with a short "why this" justification.
8. Component catalog surfaces likely reusable services/modules/packages with evidence paths and confidence.
9. Guardrail panel shows hard constraints, soft preferences, and any active option conflicts.
10. The orchestrator drafts neutral wording when agreement narrows, flags weak ideas, and highlights when an option violates a hard guardrail, ignores a likely reusable component, or conflicts with a domain requirement another participant raised.

### 7.3 Decision point
1. The room switches to `decide` mode once the option set has been narrowed and the team is ready to make the call.
2. `Decide` mode is where the orchestrator surfaces final blockers, strongest competing proposals, and any unresolved domain-vs-tech mismatches. Promotion from `decide` to `draft_adr` is blocked while any `unresolved_difference` exists without either a resolution, a linked dissent record, or an explicit `non_blocking` mark from the participant who raised it (§15.5).
3. The ADR draft becomes the primary artifact.
4. Humans claim sections, edit, and request orchestrator drafts as needed.
5. Approval is recorded with provenance: who approved, at what timestamp, based on which alignment snapshot.

### 7.4 After the session
1. Once the ADR is approved, a human triggers the plan generator to create the first draft implementation plan.
2. Humans claim workstreams, edit sequencing and acceptance details, assign owners, and approve.
3. An optional handoff package bundles ADR + plan + pattern references for downstream use.
4. Useful decisions can be manually nominated as new patterns (no auto-promotion in POC).

## 8. Core Product Surfaces

1. **Room view** — live discussion + orchestrator stream
2. **Alignment board** — live structured panel (the 8 node types, §12.1)
3. **Pattern panel** — seeded patterns surfaced by tag match
4. **Component catalog panel** — autodiscovered reusable components with evidence and human confirmation state
5. **Guardrails panel** — workspace constraints/preferences and room overrides
6. **Ownership board** — live claims and overlap warnings
7. **ADR editor** — structured, section-locked
8. **Implementation plan editor** — workstream-level, section-locked
9. **Perspective pane** — per-human private thread showing local agent suggestions, draft deltas, and items the orchestrator routed to that participant

## 9. POC Scope

**In:** text-first collaboration, one workspace, one live room type, one shared orchestrator stream, per-human perspective panes, flexible attached private-agent fan-in per participant, pending private agent deltas visible to owner + orchestrator, human-promoted agent deltas entering shared reasoning, seeded pattern library, workspace guardrails, evidence-backed component autodiscovery, ADR drafting + approval, ADR revision history, typed subdecision tracking, implementation plan generation + approval, live ownership, audit log.

**Out:** voice, video, multiple room archetypes, multi-workspace federation, external IdPs, analytics dashboards, autonomous execution, unrestricted public agent chatter, and deep whole-codebase semantic discovery beyond evidence-backed POC heuristics.

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
        -> Classifier Worker (per-utterance, GPT-5 mini/nano)
        -> Agent Gateway (per-human private agent sessions)
        -> Orchestrator Worker (windowed, GPT-5.4)
        -> ADR Compiler (on-demand)
        -> Plan Generator (on-demand)
        -> Pattern Service (tag-match over seeded JSON)
```

Everything runs in one Bun process. Workers are in-process async tasks, not separate services. This is deliberate for the POC.

### 10.2 POC stack

- **Frontend:** React 19 + React Router (already in repo) + Vite
- **Backend:** Bun server exposing HTTP + WebSocket from the same process
- **Persistence:** **SQLite** (not Postgres — zero-ops for the demo; migrate later if needed)
- **LLM:** OpenAI Responses API only. Use `gpt-5.4` or `gpt-5.4-mini` for orchestration and drafting, and `gpt-5.4-nano` or `gpt-5-mini` for per-delta classification
- **Auth:** magic-link + room token. No SSO.
- **Deployment:** single host (Fly.io or equivalent). One `.env`. One process.

### 10.3 Concurrency and conflict model

**Section-level pessimistic locks** backed by ownership claims remain the default for ADR and plan prose. Decision rationale: CRDTs are out of scope for a POC, and last-writer-wins produces exactly the silent overlap the product is supposed to prevent.

- A section (ADR section, plan workstream) has at most one active claimant.
- Claim TTL: 60s of inactivity auto-releases.
- Server rejects writes to an unclaimed section. Frontend disables the editor until claim is held.
- Alignment nodes are orchestrator-written; humans correct via typed `alignment_correction` deltas rather than direct edit.
- ADR and plan prose do **not** use character-level merge or CRDT conflict resolution in the POC.
- Typed subdecisions use optimistic concurrency with `base_revision_id`.
- The server may auto-merge subdecision writes only when they touch disjoint fields or additive collections.
- If two writes change the same semantic field of a subdecision, the server emits a conflict record instead of guessing a merge. Humans resolve that conflict explicitly.
- Pending private agent deltas do **not** participate in shared conflict handling because they are not part of shared state until promotion.

## 11. Major Backend Components

### 11.1 Session manager
Room lifecycle, presence, message fanout, claim bookkeeping, permission checks, audit events.

### 11.2 Classifier worker
Runs per utterance. Small GPT classifier prompt: given utterance + last alignment snapshot, emit zero or more typed deltas (see §13.1) with confidence and a `novelty_hash` over the normalized text. Output is pushed to the working layer, not published to the shared layer.

Cost profile: ~500 input + 200 output tokens per call. Fires only on human utterances (not orchestrator output, not claim events).

### 11.3 Agent gateway
Maintains per-human private agent sessions, auth scopes, and pending private agent deltas. Agent output never lands in the shared room directly. It first becomes a pending private delta visible to the owning human and the orchestrator. Only human promotion moves that delta into shared reasoning with owner, audience, and confidence metadata.

### 11.4 Orchestrator worker
The product's center of gravity. See §13 for the full spec. One call every 10s over the last window, or on manual "synthesize now". Emits exactly one `orchestrator_update` event plus optional targeted routing suggestions for specific participants.

### 11.5 ADR compiler
Template-driven, LLM-filled. Input: current alignment snapshot + ADR state + current subdecision state + active guardrails + relevant confirmed components. Output: section-level diffs keyed by §15.2 headers. Called on demand from the UI ("regenerate section" or "draft all"), not on every tick.

### 11.6 Plan generator
One-shot from an approved ADR revision. Template in §16. Emits a draft implementation plan with workstream-level granularity, reuse suggestions, and any required guardrail exception slots. Never runs automatically — humans trigger after ADR approval.

### 11.7 Pattern service
Reads `data/patterns.json` at boot. Tag-match + substring match over problem statement. Returns top 5 with a one-line "why this matches" from a lightweight GPT model. No embeddings, no ranking, no promotion workflow in the POC.

### 11.8 Guardrail service
Stores workspace-level defaults and room-level overrides. For the demo, it can seed from `data/guardrails.json` and persist active values in SQLite. Exposes hard constraints, soft preferences, and reuse policy to the orchestrator, ADR compiler, and plan generator.

### 11.9 Component catalog service
Builds a workspace-local catalog of likely reusable components from evidence-first sources: `Cargo.toml`, workspace manifests, `package.json`, `pyproject.toml`, lockfiles, infra manifests, conventional repo paths (`crates/`, `packages/`, `services/`), and existing ADR Markdown. Produces candidate entries with file-path evidence and confidence. Humans can confirm or ignore entries; pure LLM-only discovery is not sufficient for POC truth.

### 11.10 Revision service
Materializes immutable `adr_revision`, `subdecision_revision`, and `plan_revision` snapshots from the event stream. Creates revisions on manual checkpoint, `submit_for_review`, approval, and conflict resolution. Supports replay, diffing, and approval provenance without making mutable draft rows the source of truth.

### 11.11 Routing and merge service
Consumes human utterances, classifier deltas, and promoted agent deltas for shared reasoning; clusters them by topic and audience; and prepares merge candidates for the orchestrator. It may also inspect pending private agent deltas for owner-scoped routing/comparison, but raw private content does not enter shared merge candidates until promotion. This is where the system decides that A's proposal is relevant to B's blocker, or that C's idea conflicts with a domain rule already captured elsewhere.

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
  confidence,            // orchestrator's confidence, 0–1
  supersedes_id?,        // if this replaces an older node
  created_by,            // 'orchestrator' or participant id
  last_touched_at
}
```

This schema is **frozen for the POC**. Every downstream component targets it.

### 12.2 Three-layer signal model

- **Private layer.** Each human and their attached agent iterate locally. Pending private agent deltas are visible to the owning human and the orchestrator only.
- **Working merge layer.** Human utterances, classifier deltas over those utterances, and human-promoted agent deltas are deduplicated, clustered by novelty hash, audience-scored, and prepared for shared orchestrator reasoning. Internal — not shown directly.
- **Shared layer.** Only orchestrator updates, alignment snapshots, pattern suggestions, component suggestions, guardrail alerts, ADR/plan diffs, ownership events, and orchestrator-routed insights intentionally published to other participants.

### 12.3 Room modes

- `explore` — encourage options and constraints, orchestrator emphasizes breadth and cross-pollination
- `narrow` — collapse duplicates, force tradeoff clarity, orchestrator routes conflicts to the right participants
- `decide` — produce candidate wording, expose final blockers, and attach explicit dissent where needed
- `draft_adr` — focus shifts to the ADR editor; orchestrator writes section drafts on request. Entry is blocked while any `unresolved_difference` remains without a linked dissent record or explicit `non_blocking` mark

Normal path: `explore` -> `narrow` -> `decide` -> `draft_adr`. Humans switch modes. The orchestrator can recommend a mode switch but cannot force one. A room may move backward if new blockers appear.

### 12.4 Live ownership model

Ownership is a **server-enforced single-writer lock** per ADR section and per plan workstream. UI shows:

- current owner (user id + display name)
- claim age (auto-releases after 60s inactivity)
- last commit timestamp
- overlap warnings when a human starts editing a claimed section (blocked with a nudge, not silent)

Attached agents can only act under their owning human's active claim scope.

## 13. Orchestrator Engine Spec

This is the single most important component. Getting it right beats everything else.

### 13.1 Typed deltas (merge-layer inputs)

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

### 13.2 Orchestrator trigger

Runs when **any** of:
- 10 seconds elapsed since last run AND ≥ 1 new high-signal delta
- 50 merge-layer items in backlog
- explicit human "synthesize now"

Skips (no-op) if: zero novelty since last run (measured by novelty hashes).

### 13.3 Orchestrator input

- Last N=50 merge-layer items (human utterances, classifier deltas, promoted agent deltas, claim events) from the window
- Current alignment snapshot (all nodes)
- Room mode
- Active guardrail snapshot
- Top matched confirmed components
- Pending private agent deltas, owner-scoped, available only for private routing/comparison and promotion prioritization
- Recent routing feedback (`relevant` / `not_relevant`) for participant pairs
- Current ADR draft headers only (not full body)

Pending private agent deltas may influence private orchestrator nudges or routing candidates, but they may not create shared alignment-node changes or appear in shared synthesis until promoted by the owning human.

### 13.4 Orchestrator output contract

Exactly one event:

```json
{
  "type": "orchestrator.update.published",
  "synthesis": "short paragraph, <= 80 words",
  "common_ground_changes": [{ "node_id": "...", "op": "add|update" }],
  "blocker_changes": [{ "node_id": "...", "note": "..." }],
  "alignment_node_deltas": [{ "op": "add|update|supersede", "node": { ... } }],
  "targeted_feedback": [{ "participant_id": "usr_b", "message": "A's proposal may address your blocker on onboarding state.", "delivery_scope": "private" }],
  "routed_insights": [{ "from_actor_id": "usr_a", "to_actor_id": "usr_b", "reason": "relevant_domain_constraint" }],
  "suggested_next_move": "e.g. 'narrow to 2 options' | 'draft decision on X' | null",
  "source_event_ids": ["evt_..."],
  "supersedes": "orch_update_prev_id"
}
```

Every synthesis carries pointers back to the raw events it drew from. This is how audit and "why did the orchestrator say that?" work.

### 13.5 Failure modes and mitigations

- **Model timeout / 5xx.** Publish an `orchestrator.update.delayed` marker. Do not retry silently. Skip one window.
- **Hallucinated agreement.** Every `agreement` node shows a "Reject" control. Rejecting demotes the node to `unresolved_difference` and records an `orchestrator.correction` event that the next call sees.
- **Bad routing.** Humans can mark targeted feedback as `not_relevant`; repeated misses lower routing confidence for that participant pair.
- **Pre-approval leakage.** Pending private deltas can inform only private orchestrator nudges; they cannot update shared alignment state or be shown to other participants until promoted.
- **Runaway cost.** Cap at 8 orchestrator calls per minute per room. Hard stop.
- **Low-novelty loops.** Novelty-hash skip (§13.2) prevents re-synthesis of identical state.

### 13.6 Latency budget

- Classifier (Haiku): p50 ≤ 800ms, p95 ≤ 2s
- Orchestrator (Sonnet): p50 ≤ 3s, p95 ≤ 6s from batch close to publish
- Classifier (OpenAI `gpt-5.4-nano` or `gpt-5-mini`, with `reasoning.effort` set to `none` or `minimal`): target the same p50 ≤ 800ms, p95 ≤ 2s budget
- Orchestrator (OpenAI `gpt-5.4-mini` or `gpt-5.4`, with `reasoning.effort` set to `low` unless evals justify more): target the same p50 ≤ 3s, p95 ≤ 6s from batch close to publish
- Private agent delta generation (perspective pane only): p50 ≤ 4s, p95 ≤ 8s; this is non-blocking for the shared room
- Promotion-to-merge ingestion after human approval: p50 ≤ 200ms, p95 ≤ 500ms
- WebSocket fanout: ≤ 100ms

These are product latency targets, not vendor guarantees. OpenAI model selection should prefer the smallest model that meets orchestrator-quality evals and the routing guidance in §23.1. Shared-room latency targets assume the reference evaluation profile in §23.3, only promoted deltas enter shared reasoning, and workspace backpressure keeps merge-layer volume in the same order of magnitude as human utterance volume.

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
- **Retrieval:** tag match + substring on problem statement. A lightweight GPT model adds a one-line "why this matches" at display time.
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
- **Enforcement:** the orchestrator flags conflicts during discussion; ADR and plan approval are blocked on unresolved hard-guardrail conflicts unless an explicit exception is recorded.

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
- Approval requires every section to have been explicitly human-reviewed, even if its initial text came from the orchestrator.
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
| `agent_delta` | Typed agent output with `approval_state` (`pending` | `promoted` | `discarded`) and visibility (`owner_orchestrator` | `shared_merge`) |
| `alignment_node` | Goal / constraint / option / tradeoff / risk / question / agreement / unresolved_difference |
| `component_catalog_entry` | Autodiscovered or confirmed reusable module/service/package |
| `component_evidence` | File-path or document evidence for a component entry |
| `orchestrator_update` | Shared synthesized update. `source_event_ids[]`, `supersedes?` |
| `routing_feedback` | Human relevance signal on an orchestrator-routed insight |
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

Every derived entity (`agent_delta`, `orchestrator_update`, `alignment_node`) carries `source_event_ids[]` and optional `supersedes` so the three-layer signal flow is fully auditable and replayable. `pending` agent deltas are audited too, but remain visible only to the owning human and the orchestrator.

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
classifier.delta.created          { delta_type, payload, source_utterance_id }
agent.delta.submitted             { delta_id, delta_type, payload, owner_id, approval_state: 'pending', visibility: 'owner_orchestrator' }
agent.delta.promoted              { delta_id, approved_by, approval_state: 'promoted', visibility: 'shared_merge' }
agent.delta.discarded             { delta_id, discarded_by, approval_state: 'discarded' }
alignment.correction.submitted    { node_id, proposed_type?, proposed_text?, source_event_ids[] }
alignment.node.updated            { op, node }
pattern.suggested                 { pattern_id, justification, source_event_ids[] }
component.suggested               { component_id, justification, source_event_ids[] }
guardrail.alerted                 { rule_key, severity, note, source_event_ids[] }
orchestrator.update.published     { ...§13.4 contract }
orchestrator.update.delayed       { reason }
orchestrator.correction           { rejected_update_id, reason }
routing.feedback.recorded         { routing_id, participant_id, disposition: 'relevant'|'not_relevant' }
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
  "type": "agent.delta.promoted",
  "roomId": "room_123",
  "actorId": "user_alice",
  "timestamp": "2026-04-18T12:00:00Z",
  "source_event_ids": ["evt_agent_delta_77"],
  "supersedes": null,
  "payload": {
    "deltaType": "constraint_detected",
    "text": "Low-latency responses are a hard requirement.",
    "confidence": 0.86,
    "hardness": "hard",
    "approvedBy": "user_alice"
  }
}
```

All events carry `source_event_ids[]` and optional `supersedes` where applicable.

## 19. Attached Agents and Private Collaboration

**POC ships the minimal real protocol, not a stub.** Each participant may connect one or more private agent sessions. The product does not expose raw agent chatter in the shared room. Instead, agent output first appears as pending private deltas visible to the owning human and the orchestrator. Pending deltas may inform private orchestrator nudges, but only promoted deltas can affect shared reasoning or other participants.

Rationale: the product concept is the ping-pong loop between human, private agent, and shared orchestrator. The load-bearing boundary is still human approval before shared influence. Without that boundary, the POC proves the wrong thing and weakens privacy / accountability.

### 19.1 Privacy enforcement

- Perspective-pane subscriptions are **per-user on the server**. The backend filters non-owner private deltas out before fanout. No client-side "hide" that relies on frontend trust.
- Pending private deltas are visible only to the owning human and the orchestrator.
- Shared synthesis never includes raw private agent content — only promoted typed deltas and orchestrator conclusions that reference them.
- Attached agents can only act under their owning human's active claim.
- Every promoted delta records human owner, agent id, and whether the human explicitly approved it before it entered the merge layer.

### 19.2 Minimal POC protocol

- agent runtime connects over WebSocket with scoped room + owner identity
- agent may submit `agent.delta.submitted` events with typed payloads; default state is `pending`
- pending deltas are visible to owner + orchestrator only
- human can approve, edit, or discard pending deltas before promotion
- only `agent.delta.promoted` enters shared reasoning
- orchestrator may route relevant deltas to another participant, but never exposes the source participant's full private transcript

## 20. Permissions and Governance

- Room owners create the decision brief, nominate the initial decision-owner set, invite participants, and start decision mode
- Room owners can create scoped guardrail overrides for their room; those overrides are visible and audited
- Workspace owners define default guardrails and can refresh / confirm the component catalog
- Participants contribute and may attach their own agents
- Only the owning human may promote or discard that human's pending private agent deltas
- **Only human decision owners** approve ADRs and plans
- Any participant may raise an unresolved difference; it must be resolved, recorded as dissent, or marked `non_blocking` before approval can proceed
- Observers can read/comment but never claim sections or block approval
- Changes to the decision-owner set are visible to the room and fully audited
- Only humans trigger handoff and promote patterns
- Ownership claims are visible to all room participants
- Full audit log: who said what, which agent produced which delta, why an orchestrator update published, which patterns surfaced, who approved

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
GET  /api/rooms/:id/perspectives/:participantId
POST /api/rooms/:id/orchestrator/synthesize
POST /api/rooms/:id/orchestrator/reject   { update_id, reason }
POST /api/rooms/:id/perspectives/:participantId/promote-delta
POST /api/rooms/:id/perspectives/:participantId/discard-delta
POST /api/rooms/:id/routings/:routingId/feedback   { disposition: 'relevant'|'not_relevant' }
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

WebSocket carries both user events and agent-runtime events on the same channel with actor-typed envelopes.

## 22. Frontend Plan and Project Bootstrap

### 22.1 Project bootstrap

This plan assumes an empty-slate repo. Phase 0 bootstraps the alignment workspace foundation:

- Create package metadata and `README.md` for the new product
- Scaffold the frontend app shell and route tree from the route map below
- Add a Bun server entrypoint (`src/server/index.js`) with SQLite schema + WebSocket handler
- Add baseline tooling/config only as needed for local development and demo reliability

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

Human discussion | Orchestrator stream | Alignment board | Pattern suggestions | Component catalog | Guardrails | Ownership board | Perspective pane | ADR draft pane | Implementation plan pane

The perspective pane is a first-class POC panel. It shows pending private agent deltas, private orchestrator nudges visible only to that participant, promoted-delta history, routed insights that need acknowledgment, and explicit approve / edit / discard / promote controls.

The ADR draft pane should expose:

- a revision timeline for whole-ADR checkpoints
- a subdecision list for major architectural choices
- explicit conflict badges when a subdecision needs human resolution

## 23. LLM Orchestration & Cost Model

### 23.1 Model routing

- **Classifier per utterance:** `gpt-5.4-nano` first, `gpt-5-mini` as fallback when the nano path misses extraction quality; keep `reasoning.effort` at `none` or `minimal`
- **Orchestrator synthesis:** `gpt-5.4-mini` first for lower latency; escalate to `gpt-5.4` only if evals show materially better synthesis / blocker detection; start with `reasoning.effort: low`
- **ADR section draft:** `gpt-5.4-mini` for fast drafts, `gpt-5.4` for higher-stakes sections such as `Decision`, `Tradeoffs`, and `Implementation guidance`
- **Plan generation:** `gpt-5.4-mini` by default, `gpt-5.4` when the workstream breakdown is too generic at mini quality

OpenAI docs currently position `gpt-5.4` as the starting point for complex reasoning/coding and `gpt-5.4-mini` / `gpt-5.4-nano` for lower-latency, lower-cost workloads. `gpt-5-mini` remains a viable low-latency fallback in this plan when the smallest path is too weak for classification quality.

No routing to Opus in the POC. Opus can be A/B'd later for orchestrator only.

### 23.2 Prompt caching

Every orchestrator call reuses the same system prompt + alignment-schema stanza — cache those. Rolling window context is non-cacheable; minimize it (§13.3 caps at N=50 events).

### 23.3 Back-of-envelope session cost

A 45-minute session, 3 humans, moderate activity, reference eval profile with 4 attached private agents:

- ~120 human utterances × Haiku classifier (~500 in / 200 out each) ≈ $0.10
- ~48 private-agent turns producing pending deltas (~1k in / 250 out each on a small model) ≈ $0.24-$0.40
- ~30 orchestrator calls (windows with novelty, out of 270 possible) × Sonnet (~3k in / 500 out each) ≈ $0.45
- 1 ADR draft-all + 4 section regens × Sonnet ≈ $0.15
- 1 plan generation × Sonnet ≈ $0.05

Reference target: **under $1.25 per session** at the eval profile above. Actual cost scales with attached-agent activity; the product model stays flexible, and workspace policy should tune agent-turn budgets / backpressure rather than impose a hard participant-level cap. If this blows out, the first levers are: raise the orchestrator novelty threshold, lengthen the window, reduce agent-turn budgets, and tighten promotion throttles so the merge layer stays close to human event volume.

### 23.4 Observability

Log every LLM call with: room_id, mode, model, input_tokens, output_tokens, latency_ms, novelty_score, triggered_by. This is how §26 metrics get computed and how §28 Q3 gets answered.

## 24. Implementation Phases

Demo-first ordering. The orchestrator engine is second, not fifth — it is the product.

### Phase 0 — Project bootstrap (1–2 days)
- Create package metadata and `README.md`
- Scaffold frontend app shell and route tree
- Add Bun server entrypoint with SQLite schema
- Seed workspace guardrails and component-catalog tables
- Add basic evidence-scan job for component refresh
- Wire HTTP + WebSocket in one process
- Exit: app shell loads, server boots cleanly, and a browser client can complete a WebSocket round-trip

### Phase 1 — Realtime room foundation (1–2 days)
- Room create + join + leave
- Presence over WebSocket
- Human utterances persisted as append-only events
- Room state includes active guardrail snapshot and basic component matches
- Private perspective pane shell per participant
- Basic room timeline UI
- Exit: two browsers see each other's messages live

### Phase 2 — Orchestrator engine v0 (2–3 days) — **core value**
- Classifier worker (Haiku) turning utterances into typed deltas
- Agent gateway with configurable private agent sessions
- Routing and merge service for cross-participant relevance detection
- Alignment snapshot reducer targeting the frozen v1 taxonomy (§12.1)
- Orchestrator worker (Sonnet) with full output contract (§13.4)
- Novelty gating, batching, cap (§13.2, §13.5)
- Guardrail snapshot + matched component inputs wired into orchestrator context
- Alignment board UI with 8 node types
- Exit: a 10-minute scripted brainstorm with 2 humans and multiple attached private agents active produces a coherent alignment snapshot, shows no pending-private leakage into shared state before promotion, and stays at ≤ 1 orchestrator update per 10s

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

### Phase 7+ (post-POC) — Advanced agent protocol
Capability negotiation, tool-permission boundaries, and remote runtimes. See §19.

## 25. Testing Strategy

### Automated
- Unit: alignment reducer, novelty hashing, claim TTL, dissent gate, guardrail gating, component scan normalization, ADR revision creation, subdecision conflict detection, promotion eligibility rules, pending-delta visibility rules
- Integration: room lifecycle, claim contention, WebSocket event ordering, component refresh, guardrail snapshotting, revision replay from event log, pending-private deltas never mutating shared alignment before promotion
- Contract: orchestrator output conforms to §13.4 schema on golden transcripts
- UI: ADR approval flow, plan approval flow, owner-acceptance gating, ownership overlap warnings, perspective-pane approve / discard / promote flow, routed-insight relevance feedback, subdecision conflict resolution

### Manual (scripted scenarios)
- **S1:** two humans, one disagrees on an option → room enters `decide` mode → `draft_adr` is blocked until the room records dissent → approval with `dissent_recorded`
- **S2:** three humans, scripted concurrent edits on the same ADR section → overlap warning blocks second editor
- **S3:** noisy 10-minute brainstorm → raw:shared ratio measured ≥ 10:1 (§3 goal 3)
- **S4:** reconnect mid-session → client replays event log and restores state
- **S5:** post-session alignment check — participants independently restate problem, decision, key tradeoff, first workstream, and remaining open question / owner
- **S6:** workspace with active guardrails ("Rust only", preferred libraries, banned tech) → orchestrator surfaces conflicts and approval is blocked until the ADR / plan records an exception or switches options
- **S7:** repo with a relevant existing component → component catalog surfaces it, and the plan either reuses it or explicitly justifies a net-new replacement
- **S8:** two humans edit different fields of the same subdecision from the same base revision → server auto-merges into a new subdecision revision
- **S9:** two humans edit the same field of the same subdecision from the same base revision → `subdecision.conflict.detected` appears and requires explicit resolution
- **S10:** A's agent identifies a relevant risk for B's proposal in A's perspective pane → A promotes it → orchestrator routes it to B → B marks it `relevant` and the routed insight is linked into shared reasoning
- **S11:** baseline head-to-head (§3 goal 9) — same prompt, same pre-read, same participant count, same 45-minute timebox, 3 blind reviewers + the same participant alignment check in both conditions

### Alignment check protocol
- Immediately after ADR + plan approval, each participant privately answers five prompts without looking at the exported artifact.
- Prompts: what problem are we solving, what decision was made, what key tradeoff was accepted, what is the first implementation workstream, and what open question still remains with which owner / resolver.
- Score 1 point per answer that materially matches the approved ADR+plan.
- Session pass threshold: at least 80% of participants score 4/5 or better.

### Baseline evaluation protocol
- The workspace condition and baseline condition use the same briefing pack, participant roster size, and neutral moderator role.
- The baseline is: shared Google Doc + private Claude/ChatGPT use + live meeting.
- The thing being tested is not "who has AI." Both conditions permit private AI help. The delta under test is structured promotion, one shared orchestrator, explicit guardrails/component context, and approval-backed decision artifacts.
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
- Promotion rate for pending private agent deltas
- Relevance rate for promoted agent deltas and orchestrator-routed insights
- Pending-private leakage incidents into shared state
- LLM cost per session

Qualitative (from participants):
- "Was the orchestrator useful or noise?"
- "Did the ADR match what you actually agreed on?"
- "Did you leave knowing what happens next without reopening the debate?"
- "Would you use this over a shared doc?"

## 27. Key Risks

### 27.1 Orchestrator produces false agreements
Mitigation: human "reject synthesis" control that demotes to `unresolved_difference` and logs a correction the next call sees.

### 27.2 Alignment taxonomy too rigid or too loose
Mitigation: frozen at 8 types for POC. Measure session-level "this didn't fit anywhere" corrections. Re-tune after 5 real sessions.

### 27.3 Cost runaway
Mitigation: 8-call/min orchestrator cap (§13.5), novelty-gate skips, prompt caching, and workspace-configurable agent-turn budgets / promotion backpressure.

### 27.4 Ownership locks feel heavy
Mitigation: 60s inactivity auto-release, visible claimant, overlap warning (not silent block with no recourse).

### 27.5 Plan generator produces generic project management
Mitigation: workstream-level granularity (§16.3), reject individual-ticket output in the template.

### 27.6 The room feels like chat with decorations
Mitigation: alignment board and ADR draft are always visible primary panels, not side panels.

### 27.7 Component autodiscovery is noisy or hallucinates modules that are not really reusable
Mitigation: evidence-first discovery only, visible file-path evidence, human confirmation state, and approval gating based only on confirmed entries.

### 27.8 Guardrails become invisible prompt lore instead of product behavior
Mitigation: explicit guardrails panel, room snapshotting, orchestrator conflict surfacing, and approval-time enforcement.

### 27.9 Subdecision modeling becomes too granular and turns the room into paperwork
Mitigation: restrict subdecisions to bounded architectural choices that merit independent history. Do not create them for prose-only edits, examples, or routine drafting.

### 27.10 Built-in conflict handling creates false confidence
Mitigation: allow automatic merge only for disjoint structured fields. Same-field changes always produce explicit human-resolved conflicts.

### 27.11 Private agents create a second layer of noise instead of better thinking
Mitigation: private suggestions require human approval before promotion, routing relevance is explicitly scored, and the shared room only sees orchestrated outputs.

### 27.12 Orchestrator visibility into pending private deltas breaks user trust
Mitigation: make owner + orchestrator visibility explicit in the UI, constrain pending-delta use to private routing/comparison only, forbid shared publication before promotion, audit every access/promotion/discard event, and allow stricter workspace settings if trust requirements are higher than routing quality needs.

## 28. Known Dials (not open questions)

These were "open questions" in v0.1. They are tunable parameters now.

- **Q1. Private agent detail in live session.** Dial: perspective-pane verbosity slider (per-user). Default: medium. Test both extremes in scripted sessions.
- **Q2. Alignment taxonomy.** Frozen at 8 types for POC (§12.1). Revisit after 5 sessions.
- **Q3. Orchestrator cadence.** Hybrid: 10s window OR 50-event backlog OR manual. §13.2. Tunable via `ORCHESTRATOR_WINDOW_MS` env var.
- **Q4. Approval model for 2–5 humans.** Fixed decision-owner set declared at room creation. Default: unanimous approval from that set, with unresolved differences from any participant requiring resolution, dissent, or `non_blocking` triage. Revisit if rooms get larger.
- **Q5. Pattern ranking.** Tag + substring only (§14). Embeddings + ranking are v2.
- **Q6. Plan granularity.** Workstreams, not tickets (§16.3). If users complain it's too coarse, add a "break down" action that expands one workstream into sub-items.
- **Q7. Component discovery confidence threshold.** Default: only `confirmed` components participate in approval gating. Candidate-only matches remain advisory.
- **Q8. Subdecision threshold.** Default: create subdecisions only for architectural choices likely to change independently or deserve explicit conflict handling.
- **Q9. Pending private delta visibility.** Default: owner + orchestrator only. The orchestrator may use them for private routing/comparison, never shared synthesis. If privacy expectations are stricter, disable orchestrator access and accept weaker cross-participant routing.
- **Q10. Promotion backpressure.** Default: no hard product cap on attached agents. Use workspace-configurable soft budgets and queue backpressure so the merge layer stays near human event volume. Start evals at 3 promoted deltas per participant per 5 minutes, then scale up if routing quality holds.

## 29. Recommended Build Order

Same as §24 phases, because §24 was already ordered by demo value:

1. Phase 0: Project bootstrap
2. Phase 1: Realtime room
3. **Phase 2: Orchestrator engine v0 — the product**
4. Phase 3: ADR editor + dissent
5. Phase 4: Plan editor
6. Phase 5: Decision context management
7. Phase 6: Handoff package
8. (Post-POC) Advanced agent protocol

This order preserves a demoable human-centered product by the end of Phase 5 (~6–9 days). Phase 6 is export polish. Advanced capability negotiation and remote agent runtimes are v2.

## 30. Prior Art and Positioning

What this is **not** reinventing, and why it is still different:

- **Miro / FigJam** — freeform visual collaboration. No structured decision artifact, no denoising layer. We target the *output* (ADR + plan), not the canvas.
- **Notion AI / Coda AI** — async doc + AI. No realtime synthesis across multiple humans talking at once.
- **Linear Canvas / Stately** — planning and state machines. No decision-reasoning layer, no orchestrator voice.
- **tldraw + AI / Excalidraw + AI** — visual-first, no consensus model.
- **Roam / Obsidian + AI** — single-user knowledge, not multi-human alignment.
- **Shared Google Doc + ChatGPT/Claude copy-paste** — our explicit baseline (§3 goal 9). Cheap, available today, and what teams actually do. We must be meaningfully better than this.

The differentiators we are betting on: **one shared orchestrator voice**, **private human-agent loops**, **a mediated merge layer**, **frozen alignment taxonomy**, **section-level single-writer locks**, and **ADR-as-decision-boundary**.
The supporting advantage is that the room starts with explicit context: known guardrails and reusable components, not just opinions and generated text.
The history advantage is that the room preserves immutable ADR revisions and typed subdecision revisions instead of flattening everything into one mutable document.

## 31. Final Recommendation

Treat the first draft as a focused product experiment:

- one central realtime room
- one shared orchestrator voice (Sonnet, 10s windows, full §13.4 contract)
- one private perspective pane per participant, with flexible attached-agent fan-in
- one alignment model (the 8-type v1 taxonomy)
- one seeded pattern library (flat JSON, tag retrieval)
- one explicit guardrail layer (workspace defaults + room overrides)
- one evidence-backed component catalog (autodiscovered, then human-confirmed)
- one ADR as the decision artifact (12 sections, dissent-aware)
- immutable ADR revisions plus typed subdecision revisions
- one implementation plan (workstream-level, owner-accepted, open-question-triaged)
- one live ownership model (section-level single-writer locks)
- one optional handoff package
- private human-agent ping-pong with orchestrated cross-participant routing as part of the POC foundation

If Phases 0–5 hold and the combined baseline result lands, we have evidence that the workspace improves human alignment over the shared-doc baseline, with orchestrated private-agent collaboration as part of the mechanism. That evidence earns the right to build v2 — richer agent connectivity, deeper memory, downstream execution automation. Without that result, the rest is decoration.
