# Governed Knowledge Base Workspace

## Implementation Plan v1 (Derived from Consolidated POC Plan)

Status: Ready for implementation agents  
Date: 2026-04-18  
Source of truth for intent: `grgur-docs/governed-knowledge-base-workspace-poc-plan.md` (Section 0 wins on conflicts)
Runtime note: implementation has been migrated to Node.js (Express + WebSocket + SQLite) for execution reliability.

## 1. Objective

Implement a local-demo-ready governed documentation workspace where 3 users (1 owner, 2 reviewers) can collaborate on one section simultaneously, using both manual and agent-assisted workflows, with strong auditability.

## 2. Non-Negotiable Contracts

1. Protected-section publish requires owner approval only.
2. Standard edits go through proposal workflow.
3. Owner quick-edit path is allowed with mandatory reason and immutable revision.
4. Shared API key is used in v1, but every write must include `actor_id`.
5. Event log is append-only and available to orchestrator and agents; hidden from demo UI.
6. Conflict resolution is owner-driven with diff + agent explanation + manual patch editor.
7. Orchestrator runs as full assistant (triage + review-thread support), never autonomous publisher.
8. Demo mode uses a single visible user agent input in the center-bottom panel; orchestrator is non-user-facing background control-plane.
9. In demo mode, proposal creation is agent-sourced only (`source_type = agent`).

## 3. Delivery Phases

### Phase 1: Foundations

### Scope

- Boot frontend and backend locally.
- Create SQLite schema and migrations.
- Create seed workspace and principals.
- Establish section model and rendering.

### Tasks

1. Initialize app shell and local env config.
2. Implement core schema tables (`sections`, `proposals`, `proposal_reviews`, `section_revisions`, `events`, role/ownership tables).
3. Add section CRUD + section tree endpoints.
4. Build section browser + section detail page base layout.
5. Seed mixed demo content:
- security policy section
- engineering runbook section
- product spec section

### Exit criteria

- App runs locally end-to-end.
- Users can browse seeded sections and metadata.

### Phase 2: Proposal and Review Core

### Scope

- End-to-end proposal submission and review actions.
- Proposal state machine.
- Owner-only publish gate.

### Tasks

1. Implement `POST /api/proposals` with `actor_id` validation.
2. Implement proposal state transitions.
3. Implement review actions (`approve`, `reject`, `request_changes`) with required notes for reject/request changes.
4. Enforce owner-only publish requirement for protected sections.
5. Build proposal list, diff viewer, and review panel.

### Exit criteria

- Contributor/reviewer can submit and review proposals.
- Owner approval publishes revision.

### Phase 3: Owner Quick Edit and Revision Integrity

### Scope

- Direct owner edit path with audit parity.
- Immutable revisions and rollback.

### Tasks

1. Add owner quick-edit endpoint and UI action.
2. Require non-empty reason for owner quick edits.
3. Ensure every publish/quick edit creates immutable `section_revision`.
4. Add rollback endpoint with mandatory reason.
5. Add revision timeline UI.

### Exit criteria

- Owner can quick-edit with reason and generate revision.
- Rollback works and is auditable.

### Phase 4: Conflict Handling + Orchestrator Assistant

### Scope

- Stale-base conflict detection and owner resolution.
- Full assistant behavior in review flow.

### Tasks

1. Detect stale `base_revision_id` at decision/apply time.
2. Mark proposal as `conflict_detected` when unresolved automatically.
3. Build conflict UI with:
- side-by-side diff
- agent explanation panel
- manual patch editor
4. Implement owner conflict resolution action.
5. Implement orchestrator outputs: quality score, ambiguity flags, summary, routing suggestions.
6. Add review-thread assistant panel for owner/reviewer support.

### Exit criteria

- Conflict scenario completes with owner-resolved publish.
- Orchestrator assistance is visible in proposal/review flow.

### Phase 5: Realtime + Audit + Demo Hardening

### Scope

- Multi-user realtime behavior.
- Audit page and filters.
- Demo path reliability.

### Tasks

1. WebSocket fanout for proposal/review/publish/revision/audit events.
2. Ensure events include `actor_id` and `source_client` on all writes.
3. Build audit page with filters: actor, source, event type, time.
4. Add section-level owner reviewer-grant controls.
5. Create scripted demo scenario for 3 concurrent users.

### Exit criteria

- 3-user collaborative scenario works on same section.
- Audit timeline clearly shows provenance for all writes.

## 4. API and Event Minimum Set

### Required API endpoints

- `GET /api/sections`
- `GET /api/sections/:id`
- `GET /api/sections/:id/revisions`
- `POST /api/proposals`
- `POST /api/proposals/:id/reviews`
- `POST /api/proposals/:id/request-changes`
- `POST /api/proposals/:id/resolve-conflict`
- `POST /api/sections/:id/owner-quick-edit`
- `POST /api/sections/:id/rollback`
- `PUT /api/sections/:id/reviewers`

### Required event types

- `proposal.submitted`
- `proposal.triaged`
- `proposal.in_review`
- `proposal.approval.recorded`
- `proposal.rejected`
- `proposal.conflict_detected`
- `proposal.approved`
- `proposal.published`
- `section.revision.created`
- `section.quick_edit.performed`
- `section.rollback.performed`

## 5. Test and Demo Checklist

### Functional checks

1. Submit manual proposal and publish via owner.
2. Submit agent-assisted proposal and publish via owner.
3. Reject/request-changes paths enforce note requirements.
4. Owner quick-edit requires reason and produces revision.
5. Conflict resolution path works with required UI components.
6. Rollback works with mandatory reason.

### Collaboration checks

1. Three users on same section receive live updates.
2. Concurrent proposal activity produces expected states.
3. Owner reviewer-role grants are reflected in UI flow.

### Audit checks

1. Every write event includes `actor_id`.
2. Every write event includes `source_client`.
3. Audit filters return expected subsets.

## 6. Definition of Done

Implementation is complete only when:

1. All phase exit criteria are met.
2. 3-user scenario succeeds in one uninterrupted live run.
3. Produced revisions and events are inspectable and coherent.
4. No publish of protected section happens without owner approval.

## 7. Agent Execution Guidance

1. Implement in phase order unless blocked.
2. Do not weaken immutable revision or audit contracts for speed.
3. If conflicts with older sections of the source plan arise, follow Section 0 locked decisions in the source plan.
