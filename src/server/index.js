import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { db } from "./db.js";
import { runAgentChat, runOrchestrator } from "./orchestrator.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
const DEMO_AGENT_ONLY = process.env.DEMO_AGENT_ONLY !== "false";

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function slugify(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload, timestamp: now() });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

function event(type, actorId, payload, sourceClient = "web") {
  const e = {
    id: id("evt"),
    type,
    actor_id: actorId,
    source_client: sourceClient,
    payload_json: JSON.stringify(payload),
    created_at: now()
  };
  db.prepare(
    "INSERT INTO events (id, type, actor_id, source_client, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(e.id, e.type, e.actor_id, e.source_client, e.payload_json, e.created_at);
  broadcast(type, payload);
}

function requireSharedKey(req, res) {
  const expected = process.env.DEMO_SHARED_API_KEY;
  if (!expected) return true;
  const got = req.header("x-api-key");
  if (got === expected) return true;
  res.status(401).json({ error: "Invalid key" });
  return false;
}

function requireActor(body, res) {
  if (!body?.actor_id) {
    res.status(400).json({ error: "actor_id is required" });
    return null;
  }
  return { actorId: body.actor_id, sourceClient: body.source_client || "web" };
}

function getSectionById(sectionId) {
  return db.prepare("SELECT * FROM sections WHERE id = ?").get(sectionId);
}

function isOwnerOrAdmin(actorId, section) {
  const principal = db.prepare("SELECT role FROM principals WHERE id = ?").get(actorId);
  if (!principal) return false;
  return principal.role === "workspace_admin" || section.primary_owner_id === actorId;
}

function latestRevision(sectionId) {
  return db.prepare("SELECT * FROM section_revisions WHERE section_id = ? ORDER BY revision_number DESC LIMIT 1").get(sectionId);
}

function auditContextForSection(sectionId, limit = 20) {
  const sectionScoped = db
    .prepare(
      `SELECT type, actor_id, source_client, payload_json, created_at
       FROM events
       WHERE payload_json LIKE ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(`%"section_id":"${sectionId}"%`, limit);

  if (sectionScoped.length > 0) return sectionScoped;

  return db
    .prepare(
      `SELECT type, actor_id, source_client, payload_json, created_at
       FROM events
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(Math.max(8, Math.floor(limit / 2)));
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/principals", (_req, res) => {
  const rows = db.prepare("SELECT id, display_name, role FROM principals ORDER BY display_name").all();
  res.json(rows);
});

app.get("/api/events", (_req, res) => {
  const rows = db.prepare("SELECT * FROM events ORDER BY created_at DESC LIMIT 200").all();
  res.json(rows.map((r) => ({ ...r, payload: JSON.parse(r.payload_json) })));
});

app.get("/api/sections", (_req, res) => {
  const sections = db.prepare("SELECT * FROM sections ORDER BY path").all();
  res.json(sections.map((s) => ({ ...s, delegate_owner_ids: JSON.parse(s.delegate_owner_ids_json) })));
});

app.post("/api/sections", (req, res) => {
  if (!requireSharedKey(req, res)) return;
  const actor = requireActor(req.body, res);
  if (!actor) return;

  const title = String(req.body.title || "").trim();
  const topic = slugify(req.body.topic || "general");
  const riskClass = ["low", "medium", "high"].includes(req.body.risk_class) ? req.body.risk_class : "medium";
  const initialMarkdown = String(req.body.initial_markdown || "").trim() || `# ${title}\n\nWrite section content here.`;
  if (!title) return res.status(400).json({ error: "title is required" });

  const sectionId = id("sec");
  const path = `${topic}/${slugify(title)}`;
  const existing = db.prepare("SELECT id FROM sections WHERE path = ?").get(path);
  if (existing) return res.status(409).json({ error: "section path already exists" });

  const t = now();
  const revisionId = id("sec_rev");
  db.prepare(
    `INSERT INTO sections
    (id, path, title, topic, content_markdown, risk_class, primary_owner_id, delegate_owner_ids_json, published_revision_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    sectionId,
    path,
    title,
    topic,
    initialMarkdown,
    riskClass,
    actor.actorId,
    JSON.stringify([]),
    revisionId,
    t,
    t
  );

  db.prepare(
    `INSERT INTO section_revisions
    (id, section_id, revision_number, parent_revision_id, content_markdown, patch, reason, proposal_id, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(revisionId, sectionId, 1, null, initialMarkdown, "create_section", "Section created", null, actor.actorId, t);

  event("section.created", actor.actorId, { section_id: sectionId, path, topic, title }, actor.sourceClient);
  event("section.revision.created", actor.actorId, { section_id: sectionId, revision_id: revisionId }, actor.sourceClient);
  res.status(201).json({ section_id: sectionId, path, owner: actor.actorId });
});

app.get("/api/sections/:sectionId", (req, res) => {
  const section = getSectionById(req.params.sectionId);
  if (!section) return res.status(404).json({ error: "Section not found" });

  const proposals = db
    .prepare("SELECT * FROM proposals WHERE section_id = ? ORDER BY created_at DESC")
    .all(section.id);

  const reviewers = db
    .prepare(
      `SELECT sr.principal_id, p.display_name FROM section_reviewers sr
       JOIN principals p ON p.id = sr.principal_id
       WHERE sr.section_id = ?`
    )
    .all(section.id);

  res.json({
    ...section,
    delegate_owner_ids: JSON.parse(section.delegate_owner_ids_json),
    proposals: proposals.map((p) => ({ ...p, ambiguity_flags: JSON.parse(p.ambiguity_flags_json || "[]") })),
    reviewers
  });
});

app.get("/api/sections/:sectionId/revisions", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM section_revisions WHERE section_id = ? ORDER BY revision_number DESC")
    .all(req.params.sectionId);
  res.json(rows);
});

app.put("/api/sections/:sectionId/reviewers", (req, res) => {
  if (!requireSharedKey(req, res)) return;
  const actor = requireActor(req.body, res);
  if (!actor) return;

  const section = getSectionById(req.params.sectionId);
  if (!section) return res.status(404).json({ error: "Section not found" });
  if (!isOwnerOrAdmin(actor.actorId, section)) return res.status(403).json({ error: "Not allowed" });

  db.prepare("DELETE FROM section_reviewers WHERE section_id = ?").run(section.id);
  const reviewerIds = Array.isArray(req.body.reviewer_ids) ? req.body.reviewer_ids : [];
  const insert = db.prepare(
    "INSERT INTO section_reviewers (id, section_id, principal_id, created_by, created_at) VALUES (?, ?, ?, ?, ?)"
  );
  for (const rid of reviewerIds) {
    insert.run(id("srev"), section.id, rid, actor.actorId, now());
  }

  event("section.reviewers.updated", actor.actorId, { section_id: section.id, reviewer_ids: reviewerIds }, actor.sourceClient);
  res.json({ ok: true });
});

app.post("/api/proposals", async (req, res) => {
  if (!requireSharedKey(req, res)) return;
  const actor = requireActor(req.body, res);
  if (!actor) return;
  const sourceType = req.body.source_type || "human";
  if (DEMO_AGENT_ONLY && sourceType !== "agent") {
    return res.status(400).json({ error: "demo is agent-only: source_type must be 'agent'" });
  }

  const section = getSectionById(req.body.section_id);
  if (!section) return res.status(404).json({ error: "Section not found" });

  const triage = await runOrchestrator({
    sectionTitle: section.title,
    currentContent: section.content_markdown,
    proposedPatch: req.body.proposed_patch,
    summary: req.body.summary,
    rationale: req.body.rationale,
    auditContext: auditContextForSection(section.id, 20)
  });

  const proposalId = id("prop");
  const t = now();
  db.prepare(
    `INSERT INTO proposals (
      id, section_id, base_revision_id, proposed_patch, summary, rationale, source_type, source_actor_id, source_client,
      status, orchestrator_score, ambiguity_flags_json, review_summary, conflict_explanation, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    proposalId,
    section.id,
    req.body.base_revision_id || section.published_revision_id,
    req.body.proposed_patch,
    req.body.summary,
    req.body.rationale || null,
    sourceType,
    actor.actorId,
    actor.sourceClient,
    "in_review",
    triage.qualityScore,
    JSON.stringify(triage.ambiguities),
    triage.reviewSummary,
    triage.conflictExplanation,
    t,
    t
  );

  event("proposal.submitted", actor.actorId, { proposal_id: proposalId, section_id: section.id }, actor.sourceClient);
  event("proposal.triaged", actor.actorId, { proposal_id: proposalId, score: triage.qualityScore }, actor.sourceClient);
  res.status(201).json({ proposal_id: proposalId, status: "in_review" });
});

app.post("/api/agent/chat", async (req, res) => {
  if (!requireSharedKey(req, res)) return;
  const actor = requireActor(req.body, res);
  if (!actor) return;
  const sectionId = req.body.section_id;
  const message = String(req.body.message || "").trim();
  if (!sectionId) return res.status(400).json({ error: "section_id is required" });
  if (!message) return res.status(400).json({ error: "message is required" });

  const section = getSectionById(sectionId);
  if (!section) return res.status(404).json({ error: "Section not found" });
  const workspaceSignals = db
    .prepare(
      `SELECT id, summary, status, source_type, created_at
       FROM proposals
       WHERE section_id = ? AND status IN ('submitted','in_review','needs_revision','conflict_detected')
       ORDER BY created_at DESC
       LIMIT 5`
    )
    .all(sectionId);
  const auditContext = auditContextForSection(sectionId, 25);

  const orchestration = await runOrchestrator({
    sectionTitle: section.title,
    currentContent: section.content_markdown,
    proposedPatch: section.content_markdown,
    summary: message,
    rationale: "chat_assist_request",
    auditContext
  });

  const result = await runAgentChat({
    sectionTitle: section.title,
    sectionTopic: section.topic || "general",
    currentContent: section.content_markdown,
    message,
    history: Array.isArray(req.body.history) ? req.body.history.slice(-12) : [],
    orchestration,
    workspaceSignals,
    auditContext
  });
  event(
    "agent.chat.replied",
    actor.actorId,
    { section_id: sectionId, orchestration_score: orchestration.qualityScore, signal_count: workspaceSignals.length },
    actor.sourceClient
  );
  res.json(result);
});

app.post("/api/proposals/:proposalId/reviews", (req, res) => {
  if (!requireSharedKey(req, res)) return;
  const actor = requireActor(req.body, res);
  if (!actor) return;

  const decision = req.body.decision;
  if (!["approve", "reject", "request_changes"].includes(decision)) {
    return res.status(400).json({ error: "Invalid decision" });
  }
  if (["reject", "request_changes"].includes(decision) && !req.body.note) {
    return res.status(400).json({ error: "note is required" });
  }

  const proposal = db.prepare("SELECT * FROM proposals WHERE id = ?").get(req.params.proposalId);
  if (!proposal) return res.status(404).json({ error: "Proposal not found" });
  const section = getSectionById(proposal.section_id);
  if (!section) return res.status(404).json({ error: "Section not found" });

  db.prepare(
    "INSERT INTO proposal_reviews (id, proposal_id, principal_id, decision, note, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id("prev"), proposal.id, actor.actorId, decision, req.body.note || null, now());

  let status = proposal.status;
  if (decision === "reject") status = "rejected";
  if (decision === "request_changes") status = "needs_revision";

  if (decision === "approve") {
    const ownerApproved = isOwnerOrAdmin(actor.actorId, section);
    if (ownerApproved) {
      const currentRevision = latestRevision(section.id);
      if (proposal.base_revision_id && currentRevision && proposal.base_revision_id !== currentRevision.id) {
        status = "conflict_detected";
      } else {
        status = "published";
        const nextRev = (currentRevision?.revision_number || 0) + 1;
        const newRevId = id("sec_rev");
        db.prepare(
          `INSERT INTO section_revisions
          (id, section_id, revision_number, parent_revision_id, content_markdown, patch, reason, proposal_id, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          newRevId,
          section.id,
          nextRev,
          currentRevision?.id || null,
          proposal.proposed_patch,
          proposal.proposed_patch,
          proposal.summary,
          proposal.id,
          actor.actorId,
          now()
        );
        db.prepare("UPDATE sections SET content_markdown = ?, published_revision_id = ?, updated_at = ? WHERE id = ?").run(
          proposal.proposed_patch,
          newRevId,
          now(),
          section.id
        );
        event("section.revision.created", actor.actorId, { section_id: section.id, revision_id: newRevId }, actor.sourceClient);
        event("proposal.published", actor.actorId, { proposal_id: proposal.id, section_id: section.id }, actor.sourceClient);
      }
    }
  }

  db.prepare("UPDATE proposals SET status = ?, updated_at = ? WHERE id = ?").run(status, now(), proposal.id);
  event("proposal.approval.recorded", actor.actorId, { proposal_id: proposal.id, decision }, actor.sourceClient);
  if (status === "rejected") event("proposal.rejected", actor.actorId, { proposal_id: proposal.id }, actor.sourceClient);
  if (status === "conflict_detected") {
    event("proposal.conflict_detected", actor.actorId, { proposal_id: proposal.id }, actor.sourceClient);
  }

  res.json({ proposal_id: proposal.id, status });
});

app.post("/api/proposals/:proposalId/request-changes", (req, res) => {
  if (!requireSharedKey(req, res)) return;
  const actor = requireActor(req.body, res);
  if (!actor) return;
  if (!req.body.note) return res.status(400).json({ error: "note is required" });

  const proposal = db.prepare("SELECT * FROM proposals WHERE id = ?").get(req.params.proposalId);
  if (!proposal) return res.status(404).json({ error: "Proposal not found" });

  db.prepare(
    "INSERT INTO proposal_reviews (id, proposal_id, principal_id, decision, note, created_at) VALUES (?, ?, ?, 'request_changes', ?, ?)"
  ).run(id("prev"), proposal.id, actor.actorId, req.body.note, now());

  db.prepare("UPDATE proposals SET status = 'needs_revision', updated_at = ? WHERE id = ?").run(now(), proposal.id);
  event("proposal.needs_revision", actor.actorId, { proposal_id: proposal.id }, actor.sourceClient);
  res.json({ proposal_id: proposal.id, status: "needs_revision" });
});

app.post("/api/proposals/:proposalId/resolve-conflict", (req, res) => {
  if (!requireSharedKey(req, res)) return;
  const actor = requireActor(req.body, res);
  if (!actor) return;

  const proposal = db.prepare("SELECT * FROM proposals WHERE id = ?").get(req.params.proposalId);
  if (!proposal) return res.status(404).json({ error: "Proposal not found" });
  const section = getSectionById(proposal.section_id);
  if (!section) return res.status(404).json({ error: "Section not found" });
  if (!isOwnerOrAdmin(actor.actorId, section)) return res.status(403).json({ error: "Only owner/admin can resolve" });
  if (!req.body.resolved_content_markdown) {
    return res.status(400).json({ error: "resolved_content_markdown is required" });
  }

  const currentRevision = latestRevision(section.id);
  const newRevId = id("sec_rev");
  const nextRev = (currentRevision?.revision_number || 0) + 1;

  db.prepare(
    `INSERT INTO section_revisions
    (id, section_id, revision_number, parent_revision_id, content_markdown, patch, reason, proposal_id, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newRevId,
    section.id,
    nextRev,
    currentRevision?.id || null,
    req.body.resolved_content_markdown,
    req.body.resolution_note || "manual_conflict_resolution",
    req.body.resolution_note || "Conflict resolved by owner",
    proposal.id,
    actor.actorId,
    now()
  );

  db.prepare("UPDATE sections SET content_markdown = ?, published_revision_id = ?, updated_at = ? WHERE id = ?").run(
    req.body.resolved_content_markdown,
    newRevId,
    now(),
    section.id
  );

  db.prepare("UPDATE proposals SET status = 'published', updated_at = ? WHERE id = ?").run(now(), proposal.id);

  event("section.revision.created", actor.actorId, { section_id: section.id, revision_id: newRevId }, actor.sourceClient);
  event("proposal.published", actor.actorId, { proposal_id: proposal.id, via: "conflict_resolution" }, actor.sourceClient);

  res.json({ proposal_id: proposal.id, status: "published" });
});

app.post("/api/sections/:sectionId/owner-quick-edit", (req, res) => {
  if (DEMO_AGENT_ONLY) {
    return res.status(403).json({ error: "Owner quick edit disabled in agent-only demo mode" });
  }
  if (!requireSharedKey(req, res)) return;
  const actor = requireActor(req.body, res);
  if (!actor) return;

  const section = getSectionById(req.params.sectionId);
  if (!section) return res.status(404).json({ error: "Section not found" });
  if (!isOwnerOrAdmin(actor.actorId, section)) return res.status(403).json({ error: "Only owner/admin" });
  if (!req.body.reason?.trim()) return res.status(400).json({ error: "reason is required" });
  if (!req.body.content_markdown?.trim()) return res.status(400).json({ error: "content_markdown is required" });

  const currentRevision = latestRevision(section.id);
  const newRevId = id("sec_rev");
  const nextRev = (currentRevision?.revision_number || 0) + 1;

  db.prepare(
    `INSERT INTO section_revisions
    (id, section_id, revision_number, parent_revision_id, content_markdown, patch, reason, proposal_id, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newRevId,
    section.id,
    nextRev,
    currentRevision?.id || null,
    req.body.content_markdown,
    req.body.content_markdown,
    req.body.reason,
    null,
    actor.actorId,
    now()
  );

  db.prepare("UPDATE sections SET content_markdown = ?, published_revision_id = ?, updated_at = ? WHERE id = ?").run(
    req.body.content_markdown,
    newRevId,
    now(),
    section.id
  );

  event("section.quick_edit.performed", actor.actorId, { section_id: section.id, revision_id: newRevId }, actor.sourceClient);
  res.json({ section_id: section.id, revision_id: newRevId });
});

app.post("/api/sections/:sectionId/rollback", (req, res) => {
  if (!requireSharedKey(req, res)) return;
  const actor = requireActor(req.body, res);
  if (!actor) return;

  const section = getSectionById(req.params.sectionId);
  if (!section) return res.status(404).json({ error: "Section not found" });
  if (!isOwnerOrAdmin(actor.actorId, section)) return res.status(403).json({ error: "Only owner/admin" });
  if (!req.body.reason?.trim()) return res.status(400).json({ error: "reason is required" });

  const target = db.prepare("SELECT * FROM section_revisions WHERE id = ? AND section_id = ?").get(
    req.body.target_revision_id,
    section.id
  );
  if (!target) return res.status(404).json({ error: "target revision not found" });

  const currentRevision = latestRevision(section.id);
  const newRevId = id("sec_rev");
  const nextRev = (currentRevision?.revision_number || 0) + 1;

  db.prepare(
    `INSERT INTO section_revisions
    (id, section_id, revision_number, parent_revision_id, content_markdown, patch, reason, proposal_id, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newRevId,
    section.id,
    nextRev,
    currentRevision?.id || null,
    target.content_markdown,
    "rollback",
    req.body.reason,
    null,
    actor.actorId,
    now()
  );

  db.prepare("UPDATE sections SET content_markdown = ?, published_revision_id = ?, updated_at = ? WHERE id = ?").run(
    target.content_markdown,
    newRevId,
    now(),
    section.id
  );

  event(
    "section.rollback.performed",
    actor.actorId,
    { section_id: section.id, from: currentRevision?.id ?? null, to: target.id },
    actor.sourceClient
  );

  res.json({ section_id: section.id, revision_id: newRevId });
});

const port = Number(process.env.PORT || 3001);
server.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
