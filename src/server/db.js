import Database from "better-sqlite3";

export const db = new Database("governed-kb.db");

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS principals (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT 'general',
  content_markdown TEXT NOT NULL,
  risk_class TEXT NOT NULL DEFAULT 'medium',
  primary_owner_id TEXT NOT NULL,
  delegate_owner_ids_json TEXT NOT NULL DEFAULT '[]',
  published_revision_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS section_reviewers (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  base_revision_id TEXT,
  proposed_patch TEXT NOT NULL,
  summary TEXT NOT NULL,
  rationale TEXT,
  source_type TEXT NOT NULL,
  source_actor_id TEXT NOT NULL,
  source_client TEXT NOT NULL,
  status TEXT NOT NULL,
  orchestrator_score REAL,
  ambiguity_flags_json TEXT,
  review_summary TEXT,
  conflict_explanation TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proposal_reviews (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS section_revisions (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  parent_revision_id TEXT,
  content_markdown TEXT NOT NULL,
  patch TEXT NOT NULL,
  reason TEXT NOT NULL,
  proposal_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(section_id, revision_number)
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  source_client TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`);

const sectionColumns = db.prepare("PRAGMA table_info(sections)").all();
const hasTopicColumn = sectionColumns.some((c) => c.name === "topic");
if (!hasTopicColumn) {
  db.exec("ALTER TABLE sections ADD COLUMN topic TEXT NOT NULL DEFAULT 'general'");
}

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

const DEFAULT_SECTIONS = [
  {
    path: "company/security/access-policy",
    title: "Access Policy",
    topic: "security",
    risk: "high",
    md: "# Access Policy\n\nAll employees must use MFA for production systems."
  },
  {
    path: "engineering/runbooks/deploy",
    title: "Deploy Runbook",
    topic: "engineering",
    risk: "medium",
    md: "# Deploy Runbook\n\n1. Run tests\n2. Deploy to staging\n3. Promote to production"
  },
  {
    path: "product/specs/knowledge-workspace",
    title: "Knowledge Workspace Spec",
    topic: "product",
    risk: "medium",
    md: "# Product Spec\n\nGoverned documentation workspace with proposal workflow."
  },
  {
    path: "creative/songwriting/collaborative-lyric-sheet",
    title: "Collaborative Songwriting Sheet",
    topic: "songwriting",
    risk: "low",
    md:
      "# Collaborative Songwriting Sheet\n\n" +
      "## Song Concept\n\n" +
      "- Theme: resilience through change\n" +
      "- Mood: hopeful, intimate, cinematic\n" +
      "- Tempo reference: 92 BPM\n\n" +
      "## Draft Chorus\n\n" +
      "We keep the light when the city goes dim,\n" +
      "sing through the static till dawn breaks in.\n\n" +
      "## Collaboration Rules\n\n" +
      "1. Propose lyric edits as section proposals.\n" +
      "2. Keep one intentional emotional arc per verse.\n" +
      "3. Mark uncertain lines with TODO: for reviewer pass.\n"
  }
];

function seed() {
  const count = db.prepare("SELECT COUNT(*) as c FROM principals").get();
  if (count.c > 0) return;

  const t = now();
  const principals = [
    { id: "usr_owner", display_name: "Ava Owner", role: "section_owner" },
    { id: "usr_rev1", display_name: "Riley Reviewer", role: "reviewer" },
    { id: "usr_rev2", display_name: "Morgan Reviewer", role: "reviewer" },
    { id: "usr_admin", display_name: "Admin", role: "workspace_admin" }
  ];

  const insertPrincipal = db.prepare(
    "INSERT INTO principals (id, display_name, role, created_at) VALUES (?, ?, ?, ?)"
  );
  for (const p of principals) {
    insertPrincipal.run(p.id, p.display_name, p.role, t);
  }
}

function ensureDefaultSections() {
  const owner =
    db.prepare("SELECT id FROM principals WHERE id = 'usr_owner'").get() ||
    db.prepare("SELECT id FROM principals ORDER BY created_at LIMIT 1").get();
  const ownerId = owner?.id || "usr_owner";
  const revisionActor = db.prepare("SELECT id FROM principals WHERE id = 'usr_admin'").get()?.id || ownerId;

  const sectionInsert = db.prepare(
    `INSERT INTO sections
    (id, path, title, topic, content_markdown, risk_class, primary_owner_id, delegate_owner_ids_json, published_revision_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const revInsert = db.prepare(
    `INSERT INTO section_revisions
    (id, section_id, revision_number, parent_revision_id, content_markdown, patch, reason, proposal_id, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const s of DEFAULT_SECTIONS) {
    const existing = db.prepare("SELECT id FROM sections WHERE path = ?").get(s.path);
    if (existing) continue;

    const t = now();
    const sectionId = id("sec");
    const revId = id("sec_rev");
    sectionInsert.run(
      sectionId,
      s.path,
      s.title,
      s.topic,
      s.md,
      s.risk,
      ownerId,
      JSON.stringify([]),
      revId,
      t,
      t
    );
    revInsert.run(
      revId,
      sectionId,
      1,
      null,
      s.md,
      "seed",
      "Initial seed",
      null,
      revisionActor,
      t
    );
  }
}

seed();
ensureDefaultSections();
