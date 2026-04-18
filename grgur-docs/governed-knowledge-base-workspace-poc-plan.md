# Governed Knowledge Base Workspace

## POC Plan and Product Direction (Consolidated)

Status: Consolidated v1 direction  
Last updated: 2026-04-18  
Audience: Product, engineering, design, operations

Primary goal: prove that a real-time, role-governed documentation workspace can accept structured change proposals from humans and external agents, route them through policy-based approvals, and publish high-quality versioned knowledge faster and more safely than ad hoc docs + chats.

For this POC, success means teams can continuously evolve a shared knowledge base with clear ownership, low ambiguity, and full auditability, while keeping humans as final decision-makers.

---

## 0. Consolidated V1 Direction (Workshop-Locked)

This document is the single place where product intent is concentrated.

- Product ideas, rationale, and alternatives live here.
- V1 implementation details are generated from this plan into:
  - `grgur-docs/governed-knowledge-base-workspace-implementation-v1.md`

If any exploratory section below conflicts with this section, this section wins for v1.

### 0.1 V1 build target

- Internal local demo only (single machine).
- 3-user scenario target: 1 section owner + 2 reviewers working concurrently on the same section.
- Primary differentiator: governance + auditability.

### 0.2 Locked workflow and governance decisions

- Protected sections use owner approval only for publish in v1.
- Section owner can grant/revoke reviewer status on their own section.
- Workspace admin has global override rights for demo operation.
- Agents can perform all role-allowed actions.
- Standard edits use proposal flow.
- Owner can also use direct quick-edit path with mandatory reason and immutable revision creation.
- Demo mode lock: user-visible input is a single bottom-middle user agent; orchestrator remains background-only.
- Demo mode lock: section updates are agent-mediated for user flow (`agent-only demo mode`), while owner quick-edit remains a non-demo fallback capability.

### 0.3 Locked conflict and orchestrator behavior

- Conflict resolution is owner-driven when stale-base conflicts occur.
- Conflict UI must include:
  - side-by-side diff
  - agent explanation panel
  - manual patch editor
- Orchestrator behavior in v1 is full assistant mode:
  - triage + flags + summary + routing + review-thread assistance
- Orchestrator cannot autonomously publish protected content.

### 0.4 Locked identity/audit decisions for demo

- Shared API key is acceptable for demo speed.
- Every write action must include explicit `actor_id`.
- Backend must record `actor_id` + `source_client` on write events.
- Event store is append-only (no cryptographic tamper-proofing required in v1).
- Demo UI hides raw audit log view; orchestrator and user agents still receive audit context in background.

### 0.5 V1 go/no-go gate

Proceed only if all are demonstrated end-to-end:

1. 3 users collaborate concurrently on one section.
2. They submit and review both manual and agent-assisted changes.
3. Versioned outcomes, conflict resolution, and audit provenance are clearly visible.

### 0.6 Ownership model lock

- Each protected section has one `primary_owner`.
- Optional owner delegates are supported.

---

## 1. Product Summary

This product is a **governed knowledge base workspace**, not an execution platform.

It solves a common organizational failure mode: critical knowledge drifts across docs, chats, and private AI sessions. Different teams operate on different truths, and updates happen without clear approval paths.

The product provides one shared system where:

- humans and external agents can propose structured document changes
- each section has clear owners (person or group)
- an orchestrator triages quality/conflicts and routes proposals
- policy-based approvers decide what gets published
- every accepted change becomes an immutable, auditable revision

The output is a continuously improved, trusted knowledge base.

## 2. Product Thesis

- Writing is cheap; trust and governance are not.
- Agent-generated suggestions are useful only when routed through explicit ownership and approval.
- Teams need a single source of truth with revision provenance, not scattered “latest docs.”
- Approval policy should be product behavior (enforced), not process folklore.
- Human authority should remain final, especially for high-impact sections.

## 3. POC Goals

The first draft must validate, with at least one recorded 3-5 person session per claim:

1. Participants can submit and process section-level proposals end-to-end in under 10 minutes median from submission to final state (`published` or `rejected`).
2. At least 90% of published changes have complete provenance (`proposer`, `source`, `approver`, `revision_diff`, timestamp).
3. At least 95% of protected sections enforce required approver policy with no bypass.
4. Raw proposal/noise to published change ratio is at least 5:1 (orchestrator triage denoises effectively).
5. At least 80% of participants rate “I trust this system’s approval/audit flow” as 4/5 or better.
6. At least 80% of participants can correctly identify current section owner(s) and approval status from UI within 30 seconds.
7. Baseline comparison: in a 45-minute scenario, the workspace outperforms “shared doc + chat + ad hoc AI” on review quality and governance clarity for at least 2 of 3 blind reviewers.

## 4. POC Non-Goals

Explicitly deferred:

- autonomous code execution or app building
- multi-agent public debates in shared timeline
- deep semantic merge of arbitrary prose (no CRDT prose merge in POC)
- enterprise SSO, SCIM, advanced compliance packs
- cross-workspace federation
- full policy-as-code DSL (POC ships compact rules)
- embeddings/reranking-heavy retrieval systems

## 5. Design Principles

### 5.1 Governance before publishing
Fast edits are useful only if trustworthy publication rules are enforced.

### 5.2 Humans approve
Agents propose and assist. Humans approve or reject.

### 5.3 One shared orchestrator voice
The room sees one synthesized signal layer, not many competing agent voices.

### 5.4 Ownership is explicit
Every section has visible owner(s) and policy requirements.

### 5.5 Policy is executable
Approval requirements are encoded and enforced by backend.

### 5.6 Revision history is first-class
Every accepted change creates immutable revision records with diff and provenance.

### 5.7 External-agent friendly by contract
The system accepts proposals from web UI and external agents through the same typed API/events.

## 6. Primary Users

- **Workspace admin:** configures policies, roles, section ownership.
- **Section owner:** accountable final approver for assigned sections.
- **Reviewer/approver:** required co-approver based on policy.
- **Contributor:** submits proposals directly or via own agent.
- **Observer:** read-only access.
- **External agent runtime:** user-owned tool/client (web, Cursor, CLI, etc.) that submits typed proposals under user identity and scopes.
- **Shared orchestrator:** system AI that triages/ranks/routes proposals and highlights ambiguity/conflicts.

## 7. End-to-End User Journey

### 7.1 Setup
1. Admin creates workspace and top-level knowledge base structure.
2. Admin defines roles and policy mappings (by section path/tag).
3. Admin assigns section owners (person or owner group).
4. Contributors connect via UI; optional external agents are authorized via scoped tokens.

### 7.2 Proposal flow
1. Contributor or agent submits a `change_proposal` targeting a section.
2. Orchestrator triages for quality, duplication, ambiguity, and policy impact.
3. Proposal enters `in_review` or `needs_revision`.
4. Required approvers are notified according to policy.
5. Approver decides: `approve`, `reject`, or `request_changes`.
6. On final approval, backend applies patch and creates immutable section revision.
7. Published knowledge view updates in real time.

### 7.3 Ongoing governance
1. Users browse revision timeline and diffs.
2. Conflicts or stale proposals are surfaced to owners.
3. Policies and ownership can be updated with audit logs.

## 8. Core Product Surfaces

1. **Knowledge view** — clean published documentation
2. **Section view** — ownership, policy, open proposals, revision timeline
3. **Proposal inbox** — triage queue by role and section ownership
4. **Orchestrator stream** — synthesized updates, ambiguity/conflict alerts
5. **Review pane** — approve/reject/request-changes with rationale
6. **Diff viewer** — section-level before/after and metadata
7. **Policy & roles settings** — RBAC and approval rules
8. **Agent integration settings** — scoped tokens, source clients, revocation
9. **Audit log** — immutable event timeline

## 9. POC Scope

**In:**

- section-based KB model
- canonical content model: markdown + metadata (app-managed, not file-system-first)
- typed proposal intake from humans and external agents
- orchestrator triage + routing
- role/policy-based approval workflow
- immutable revision history with diffs
- asset attachments for images/diagrams referenced by sections
- structured content blocks (tables, JSON/YAML/code snippets, key-value blocks)
- real-time notifications + status updates
- audit logs + provenance

**Out:**

- code execution agents
- autonomous publishing without human approval on protected sections
- cross-workspace syncing
- rich enterprise identity integrations

---

## 10. System Architecture Overview

### 10.1 High-level shape

```text
React Client(s)
  <-> Bun HTTP + WebSocket server
        -> Session Manager (presence, subscriptions)
        -> KB Service (sections, docs, publish state)
        -> Proposal Intake API (human + agent)
        -> Orchestrator Worker (triage + routing)
        -> Policy Engine (RBAC + approval rules)
        -> Revision Service (immutable snapshots + diffs)
        -> Notification Service (in-app + webhook/email stub)
        -> Event Store (SQLite append-only)
```

### 10.2 POC stack

- **Frontend:** React 19 + React Router + Vite
- **Backend:** Bun (HTTP + WebSocket in one process)
- **Persistence:** SQLite
- **LLM:** OpenAI Responses API (`gpt-5.4-mini` / `gpt-5.4` for orchestration, `gpt-5.4-nano`/`gpt-5-mini` for fast triage helpers)
- **Auth:** magic-link for humans + scoped API tokens for agent clients
- **Deploy:** single host, single process, one `.env`

### 10.3 Concurrency and conflict model

POC defaults to **proposal-based updates** instead of free-form multi-user edits to reduce race complexity.

- Contributors do not directly overwrite published sections.
- Every change is a proposal against a known `base_revision_id`.
- If base revision is stale at decision time:
  - auto-rebase if patch applies cleanly
  - else mark `conflict_detected` and require owner resolution
- Owners may use a short section claim lock for manual edits during conflict resolution.

## 11. Major Backend Components

### 11.1 Proposal intake service
Accepts typed proposals from UI and agent clients, validates schema/scopes, writes `proposal.submitted` events.

### 11.2 Orchestrator worker
Runs on submission/update windows. Produces quality scores, duplicate detection, ambiguity/conflict hints, and routing suggestions.

### 11.3 Policy engine
Evaluates required approvers from section path/tag and risk class. Enforces approval gates before publish.

### 11.4 KB service
Maintains section tree, published content, metadata, and ownership bindings.

### 11.5 Revision service
Creates immutable section and document revisions. Stores patch, full snapshot hash, approver chain, and reason.

### 11.6 Notification service
Emits in-app notifications and optional email/webhook stubs for required approvers.

### 11.7 Audit/event service
Append-only event log powering replay, timeline, and compliance-style inspection.

## 12. Data and Workflow Model

### 12.1 Section model

Each knowledge base section has:

```json
{
  "id": "sec_...",
  "path": "company/security/access-policy",
  "title": "Access Policy",
  "content_markdown": "...",
  "owner_principal_ids": ["usr_ceo", "grp_security_leads"],
  "tags": ["security", "policy"],
  "risk_class": "high",
  "published_revision_id": "sec_rev_17",
  "updated_at": "2026-04-18T12:00:00Z"
}
```

### 12.2 Proposal model

```json
{
  "id": "prop_...",
  "section_id": "sec_...",
  "base_revision_id": "sec_rev_17",
  "proposed_patch": {
    "format": "markdown_diff",
    "diff": "..."
  },
  "summary": "Clarify MFA exception flow",
  "rationale": "Current wording is ambiguous for contractors",
  "source": {
    "type": "human|agent",
    "actor_id": "usr_123",
    "agent_client": "cursor|web|cli|other"
  },
  "status": "submitted|needs_revision|in_review|approved|rejected|published|conflict_detected",
  "orchestrator_score": 0.82,
  "ambiguity_flags": ["term_contractors_unscoped"],
  "created_at": "2026-04-18T12:00:00Z"
}
```

### 12.3 Approval model

```json
{
  "proposal_id": "prop_...",
  "required_approvals": [
    { "role": "section_owner", "principal_id": "usr_ceo" },
    { "role": "reviewer", "principal_id": "usr_ciso" }
  ],
  "decisions": [
    {
      "principal_id": "usr_ceo",
      "decision": "approve|reject|request_changes",
      "note": "...",
      "timestamp": "2026-04-18T12:05:00Z"
    }
  ]
}
```

### 12.4 State machine

`submitted -> needs_revision|in_review`  
`needs_revision -> submitted`  
`in_review -> approved|rejected|needs_revision|conflict_detected`  
`approved -> published`

## 13. Orchestrator Engine Spec

### 13.1 Responsibilities

- quality triage (is proposal coherent/actionable)
- dedupe against open proposals
- ambiguity detection
- policy/risk hints for routing priority
- concise review summary generation

### 13.2 Input

- proposal payload + base section snapshot
- open proposals for target section
- section policy + owner metadata
- recent section revisions

### 13.3 Output contract

```json
{
  "type": "orchestrator.proposal_triaged",
  "proposal_id": "prop_...",
  "quality_score": 0.0,
  "routing": {
    "required_approver_ids": ["usr_ceo"],
    "suggested_reviewer_ids": ["usr_legal_lead"]
  },
  "flags": {
    "duplicate_of": ["prop_..."] ,
    "ambiguities": ["term_not_defined"],
    "conflicts_with_revision": ["sec_rev_18"]
  },
  "review_summary": "Short neutral summary <= 80 words",
  "source_event_ids": ["evt_..."]
}
```

### 13.4 Guardrails

- orchestrator never directly publishes protected content
- orchestrator suggestions are advisory; policy engine is authoritative
- humans can override triage score with explicit rationale (logged)

## 14. RBAC and Policy

### 14.1 Role set (POC)

- `workspace_admin`
- `section_owner`
- `reviewer`
- `contributor`
- `viewer`

### 14.2 Policy schema (POC)

```json
{
  "rules": [
    {
      "match": { "section_tag": "strategy" },
      "requires": ["section_owner", "role:ceo"]
    },
    {
      "match": { "section_path_prefix": "company/security/" },
      "requires": ["section_owner", "role:security_lead"]
    },
    {
      "match": { "risk_class": "high" },
      "requires": ["section_owner", "reviewer"]
    }
  ],
  "default_requires": ["section_owner"]
}
```

### 14.3 Approval enforcement

A proposal can transition to `approved` only when all required principals have approved. Any explicit reject in required set transitions proposal to `rejected`.

## 15. Agent Integration Model

### 15.1 Product stance

The system is **agent-agnostic intake**: proposals can come from first-party web agent tooling or third-party clients (Cursor, custom CLI, other).

### 15.2 Protocol (POC)

- Primary intake: HTTP API (`POST /api/proposals`)
- Optional realtime intake: authenticated WebSocket event `agent.proposal.submit`
- Agent identity: scoped token bound to user + workspace + allowed actions
- Required payload: typed proposal schema with `source` metadata and `base_revision_id`

### 15.3 Security constraints

- tokens are revocable and short-lived
- agent cannot approve unless user has approver role and explicit permission scope
- all agent-originated actions are tagged and auditable

## 16. Knowledge Base Versioning

### 16.1 Revision layers

- `section_revision`: immutable change to one section
- `document_revision`: optional aggregate snapshot of whole KB release points

### 16.2 Publish behavior

On successful approval:

1. patch is applied to latest valid base
2. `section_revision` is created
3. section `published_revision_id` advances
4. `proposal.published` event emitted

### 16.3 Rollback

POC supports owner-triggered rollback to previous `section_revision_id` with mandatory reason.

## 17. Core Domain Model

| Entity | Purpose |
| --- | --- |
| `workspace` | collaboration boundary |
| `principal` | user or group identity |
| `role_binding` | role assignment in workspace |
| `policy_rule` | approval routing rule |
| `kb_section` | canonical section node |
| `change_proposal` | candidate section update |
| `proposal_review` | individual reviewer decision |
| `section_revision` | immutable section snapshot |
| `document_revision` | optional full-KB snapshot |
| `ownership_claim` | temporary lock for manual resolution |
| `orchestrator_result` | triage/routing output |
| `notification` | approver alerts |
| `event_log` | append-only audit stream |

## 18. Realtime Event Model

### 18.1 Event catalog

```
workspace.created
policy.updated
role_binding.updated
section.created
section.ownership.updated
proposal.submitted
proposal.triaged
proposal.needs_revision
proposal.in_review
proposal.approval.recorded
proposal.rejected
proposal.conflict_detected
proposal.approved
proposal.published
section.revision.created
section.rollback.performed
notification.sent
orchestrator.override.recorded
```

### 18.2 Envelope

```json
{
  "id": "evt_...",
  "type": "proposal.submitted",
  "workspace_id": "ws_...",
  "actor_id": "usr_123",
  "source": "agent:cursor",
  "timestamp": "2026-04-18T12:00:00Z",
  "payload": { "proposal_id": "prop_..." }
}
```

## 19. API Surface (POC)

### 19.1 Human/UI APIs

- `GET /api/sections`
- `GET /api/sections/:id`
- `GET /api/sections/:id/revisions`
- `POST /api/proposals`
- `POST /api/proposals/:id/reviews`
- `POST /api/proposals/:id/request-changes`
- `POST /api/sections/:id/rollback`

### 19.2 Admin APIs

- `PUT /api/policies`
- `PUT /api/roles/bindings`
- `PUT /api/sections/:id/owners`
- `POST /api/agent-tokens`
- `DELETE /api/agent-tokens/:id`

### 19.3 WebSocket channels

- `ws://.../workspace/:id/stream` for proposals, approvals, notifications, orchestrator updates

## 20. Frontend Plan

### 20.1 Route map

```
/                       workspace overview
/sections               section browser
/sections/:sectionId    section detail + proposals + revisions
/proposals              my inbox / queue
/reviews                approvals queue
/audit                  workspace audit timeline
/settings/roles         role management
/settings/policies      policy rules
/settings/agents        agent token management
```

### 20.2 Core screens

- Section detail with current published content, owners, policy badge
- Proposal composer and proposal diff panel
- Reviewer decision panel (approve/reject/request changes)
- Timeline with immutable revision history
- Audit log with filter by actor/source/type

### 20.3 V1 user experience model

The product should feel like a clean documentation workspace, not a file browser.

- **Primary reading surface:** section tree in the left sidebar, rendered published content in the main pane, ownership/policy/revision metadata in the right pane.
- **Primary interaction surface:** the main pane includes a persistent bottom **agent/proposal composer box** where users type prompts or paste agent-drafted suggestions and submit a structured `change_proposal`.
- **Change workflow surface:** propose changes through a dedicated proposal composer; reviewers evaluate in side-by-side diff view with explicit decision actions (`approve`, `reject`, `request_changes`).
- **Status visibility:** proposal state badges and required-approver indicators should be visible at section and proposal levels.
- **Import/export stance:** markdown import/export is supported for interoperability, but the workspace database is the source of truth.

### 20.4 V1 content format model

V1 should support rich-but-governable content with a narrow format set:

- **Canonical section content:** Markdown with section metadata (owners, tags, risk class, revision pointer).
- **Images/diagrams:** stored as managed attachments and referenced in markdown.
- **Graphs/charts:** represented as static image assets in V1 (PNG/SVG) with caption and source note.
- **Structured data:** supported via markdown tables and fenced `json`/`yaml` blocks; optional typed key-value blocks for policy/process fields.
- **Out of scope for V1:** interactive chart editing and arbitrary embedded app widgets.

## 21. Implementation Phases

### Phase 0 — Bootstrap (1–2 days)
- App shell, Bun server, SQLite schema, WebSocket baseline
- Auth scaffold (magic link + local token issue)
- Exit: project boots, authenticated session works

### Phase 1 — KB foundations (2 days)
- Section CRUD and published content rendering
- Ownership assignment and display
- Revision table scaffold
- Exit: admin can create section tree and assign owners

### Phase 2 — Proposal intake + review (2–3 days)
- Proposal schema/API
- Proposal state machine
- Review endpoints and status transitions
- Diff rendering
- Exit: contributor submits proposal, owner can approve/reject

### Phase 3 — Policy enforcement + RBAC (2 days)
- Role bindings and policy rules
- Required approver resolution
- Gate transitions by policy checks
- Exit: protected sections enforce required approvals

### Phase 4 — Orchestrator triage + notifications (2–3 days)
- Orchestrator triage worker and summary contract
- Duplicate/ambiguity flags
- In-app notifications to required approvers
- Exit: proposals are auto-routed and triaged in queue

### Phase 5 — Immutable revision + audit (2 days)
- Section revision creation on publish
- Audit event stream views
- Rollback flow with reason
- Exit: all published changes are replayable and reversible

### Phase 6 — External agent integration hardening (1–2 days)
- Scoped agent tokens
- Agent source metadata and permission checks
- Basic rate limiting and token revocation
- Exit: external clients can propose safely under user scope

## 22. Testing Strategy

### Automated
- Unit: policy rule resolution, state machine transitions, stale-base conflict detection, orchestrator triage parsing
- Integration: submit -> review -> publish flow, required approvals, rollback, token scope enforcement
- Contract: orchestrator output schema, proposal intake schema, event envelope
- UI: proposal queue, reviewer decisions, revision diff rendering, audit filters

### Manual scripted scenarios
- S1: contributor proposes low-risk update -> owner approves -> published
- S2: high-risk section requires owner + reviewer -> single approval not enough
- S3: two proposals against same base revision -> one publishes, second conflicts
- S4: agent token revoked mid-session -> intake denied
- S5: ambiguous proposal gets `needs_revision` and actionable feedback
- S6: rollback of bad published revision with reason and audit entry

### Baseline protocol
- Compare against shared doc + chat + ad hoc AI process on same prompt/timebox
- Blind reviewers score governance clarity, change quality, and provenance completeness

## 23. Success Metrics

Primary:

- proposal cycle time (submitted -> published/rejected)
- policy enforcement success rate
- provenance completeness rate
- reviewer workload (proposals per approver per hour)
- duplicate/ambiguous proposal reduction after orchestrator triage
- user trust score for approval/audit clarity

Secondary:

- rollback frequency
- stale-conflict rate
- notification response time
- cost per processed proposal

## 24. Key Risks and Mitigations

### 24.1 Approval fatigue
Mitigation: routing quality, queue prioritization, and reviewer load visibility.

### 24.2 Policy complexity overwhelms users
Mitigation: compact rule schema, templates, and policy lint checks.

### 24.3 Orchestrator overreaches
Mitigation: advisory-only triage, explicit human override paths, full logs.

### 24.4 External agent misuse
Mitigation: scoped tokens, revocation, audit tags, and rate limits.

### 24.5 Knowledge base fragmentation
Mitigation: section ownership map, duplicate detection, and periodic owner review prompts.

## 25. Recommended Build Order

1. Bootstrap and KB foundations
2. Proposal + approval workflow
3. RBAC/policy enforcement
4. Orchestrator triage and notification routing
5. Revision history + audit + rollback
6. External agent integration hardening

This sequence ensures we ship a usable governance core early and add AI and external-agent power safely.

## 26. Final Recommendation

Treat V1 as a governance product:

- one shared knowledge base
- one typed proposal intake for humans and agents
- one enforceable approval policy engine
- one orchestrator for triage and routing (not autonomous publishing)
- one immutable revision and audit history

If this POC proves that organizations can keep knowledge clean, current, and trusted with this workflow, we have a strong foundation for broader enterprise documentation governance.

## 27. Authoritative Build Spec (Single-File Contract)

This section is normative for implementation agents. If a previous section conflicts with this section, this section wins.

### 27.1 Product contract

- The app is a web workspace for governed documentation.
- Canonical content is section-based markdown plus metadata.
- All content changes pass through proposal workflow.
- Human approvals are required by policy before publish.
- Orchestrator triages and routes; it does not final-approve protected content.

### 27.2 Core user flows

1. Browse section -> read published content -> inspect metadata.
2. Submit proposal from bottom composer (manual text or agent-derived text).
3. Orchestrator triages -> proposal enters queue with flags.
4. Required approvers review -> approve/reject/request changes.
5. Publish creates immutable revision and emits realtime updates.
6. Owner can rollback with reason.

## 28. Screen Layout Contracts

### 28.1 `/sections/:sectionId` layout

Desktop (3-column + bottom composer):

```text
------------------------------------------------------------
| Left: Section Tree | Middle: Published Section | Right:  |
| + filters/search   | + proposal context/diffs  | Policy  |
|                    |                           | Owners  |
|                    |                           | Status  |
------------------------------------------------------------
| Bottom in middle column: Agent/Proposal Composer          |
| [prompt input] [rationale] [submit proposal]              |
------------------------------------------------------------
```

Mobile:

- tab 1: section content
- tab 2: proposals/review
- tab 3: metadata/policy
- sticky bottom composer stays visible on section content and proposal tabs

### 28.2 Composer box requirements

- Input `prompt_or_change_text` (required)
- `rationale` (optional, encouraged)
- `target_section_id` (auto-filled from route, editable)
- `source_mode` toggle: `human` or `agent-assisted`
- `submit` button creates draft proposal then submits

### 28.3 Review panel requirements

- Show before/after diff
- Show policy-required approvers and current decisions
- Actions: `approve`, `reject`, `request_changes`
- Require note on `reject` and `request_changes`

## 29. Component Inventory (Frontend)

Required React components:

- `SectionTreeNav`
- `SectionContentView`
- `SectionMetaPanel`
- `ProposalComposerBox`
- `ProposalList`
- `ProposalDiffViewer`
- `ReviewDecisionPanel`
- `RevisionTimeline`
- `AuditLogTable`
- `PolicyRuleEditor`
- `RoleBindingEditor`
- `AgentTokenManager`

Each component must support loading, empty, error, and success states.

## 30. Persistence Schema (SQLite, V1)

The following SQL is the baseline schema for first runnable implementation.

```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE principals (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('user','group')),
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE role_bindings (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('workspace_admin','section_owner','reviewer','contributor','viewer')),
  created_at TEXT NOT NULL
);

CREATE TABLE sections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  parent_section_id TEXT,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  risk_class TEXT NOT NULL CHECK (risk_class IN ('low','medium','high')),
  published_revision_id TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_sections_workspace_path ON sections(workspace_id, path);

CREATE TABLE section_owners (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE proposals (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  base_revision_id TEXT,
  proposed_patch_format TEXT NOT NULL CHECK (proposed_patch_format IN ('markdown_diff','full_markdown')),
  proposed_patch TEXT NOT NULL,
  summary TEXT NOT NULL,
  rationale TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('human','agent')),
  source_actor_id TEXT NOT NULL,
  source_client TEXT,
  status TEXT NOT NULL CHECK (status IN ('submitted','needs_revision','in_review','approved','rejected','published','conflict_detected')),
  orchestrator_score REAL,
  ambiguity_flags_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_proposals_section_status ON proposals(section_id, status);

CREATE TABLE proposal_reviews (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approve','reject','request_changes')),
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE policy_rules (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  priority INTEGER NOT NULL,
  match_json TEXT NOT NULL,
  requires_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE section_revisions (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  parent_revision_id TEXT,
  content_markdown TEXT NOT NULL,
  patch TEXT NOT NULL,
  reason TEXT NOT NULL,
  proposal_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_section_revisions_unique ON section_revisions(section_id, revision_number);

CREATE TABLE agent_tokens (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  owner_principal_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  scopes_json TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  source TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

## 31. API Contracts (Detailed)

### 31.1 Submit proposal

`POST /api/proposals`

Request:

```json
{
  "section_id": "sec_access_policy",
  "base_revision_id": "sec_rev_17",
  "proposed_patch": {
    "format": "markdown_diff",
    "diff": "@@ -12,7 +12,9 @@ ..."
  },
  "summary": "Clarify MFA exceptions",
  "rationale": "Current text is ambiguous for contractors",
  "source": {
    "type": "agent",
    "client": "cursor"
  }
}
```

Response `201`:

```json
{
  "proposal_id": "prop_123",
  "status": "submitted"
}
```

### 31.2 Review decision

`POST /api/proposals/:id/reviews`

Request:

```json
{
  "decision": "approve",
  "note": "Approved after legal wording check"
}
```

Response `200`:

```json
{
  "proposal_id": "prop_123",
  "status": "in_review",
  "required_remaining": ["usr_ceo"]
}
```

### 31.3 Request changes shortcut

`POST /api/proposals/:id/request-changes`

Request:

```json
{
  "note": "Please define contractor type and onboarding boundary."
}
```

### 31.4 Rollback

`POST /api/sections/:id/rollback`

Request:

```json
{
  "target_revision_id": "sec_rev_15",
  "reason": "Published revision contained incorrect legal clause."
}
```

## 32. External Agent Contract (V1)

### 32.1 Token scopes

- `proposal:create`
- `proposal:read`
- `section:read`
- `review:create` (optional, only for approver principals)

### 32.2 Agent constraints

- Agent may only act as bound principal.
- Agent cannot bypass policy engine.
- Agent proposals must include `base_revision_id`.
- Every agent action logs `source_client`.

### 32.3 Supported clients

- First-party web composer
- Cursor extension/script using HTTP API
- CLI script using HTTP API

MCP bridge can be added later; it is not required for V1.

## 33. Permission Matrix (V1)

| Action | Admin | Section Owner | Reviewer | Contributor | Viewer |
| --- | --- | --- | --- | --- | --- |
| Read sections | yes | yes | yes | yes | yes |
| Submit proposal | yes | yes | yes | yes | no |
| Approve own section proposal | yes | yes | no* | no | no |
| Review as required reviewer | yes | yes** | yes | no | no |
| Edit policy rules | yes | no | no | no | no |
| Assign section owners | yes | no | no | no | no |
| Rollback section | yes | yes | no | no | no |
| Manage agent tokens | yes | limited*** | no | limited*** | no |

`*` reviewer can approve only when policy requires reviewer role for that section.  \n`**` if owner is also assigned reviewer by policy.  \n`***` only for tokens owned by that principal.

## 34. Realtime Behavior Contract

- Proposal submission triggers immediate websocket events:
  - `proposal.submitted`
  - `proposal.triaged` (after orchestrator pass)
- Review actions trigger:
  - `proposal.approval.recorded`
  - `proposal.approved` or `proposal.rejected` when terminal
- Publish triggers:
  - `section.revision.created`
  - `proposal.published`
  - section content refresh event for active viewers

## 35. Definition of Done (V1)

The V1 build is complete only when all are true:

1. A contributor can submit proposal from the bottom composer on section page.
2. Orchestrator triage output appears in proposal details.
3. Policy-required approvers are resolved and enforced.
4. Approval path to published revision works end-to-end.
5. Rejection/request-changes path is functional with required notes.
6. Every published change has immutable revision + event provenance.
7. Rollback to previous revision works with audit reason.
8. External token-authenticated client can submit proposal safely.
9. Audit page can filter by actor, source, event type, and time.
10. Manual test scenarios in section 22 pass.
