import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Database } from "bun:sqlite";

const dbDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "db");
fs.mkdirSync(dbDir, { recursive: true });

export const db = new Database(path.join(dbDir, "workspace.sqlite"));
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS workspace_guardrails (
    id TEXT PRIMARY KEY,
    json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS patterns (
    id TEXT PRIMARY KEY,
    json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS components (
    id TEXT PRIMARY KEY,
    json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    summary TEXT NOT NULL,
    source_event_ids TEXT NOT NULL,
    supersedes TEXT,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS alignment_nodes (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orchestrator_updates (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agent_deltas (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    scope_type TEXT NOT NULL,
    scope_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS adrs (
    id TEXT PRIMARY KEY,
    room_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL,
    sections_json TEXT NOT NULL,
    reviews_json TEXT NOT NULL,
    approvals_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS adr_revisions (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    room_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL,
    sections_json TEXT NOT NULL,
    workstreams_json TEXT NOT NULL,
    approvals_json TEXT NOT NULL,
    source_adr_revision_id TEXT
  );

  CREATE TABLE IF NOT EXISTS plan_revisions (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS routing_items (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS handoff_packages (
    id TEXT PRIMARY KEY,
    room_id TEXT UNIQUE NOT NULL,
    json TEXT NOT NULL
  );
`);

export function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

export function nowIso() {
  return new Date().toISOString();
}
