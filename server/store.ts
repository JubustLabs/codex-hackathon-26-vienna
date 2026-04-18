import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  adrSectionOrder,
  planSectionOrder,
  type AdrSectionKey,
  type AlignmentNode,
  type ComponentEntry,
  type Guardrail,
  type OwnershipClaim,
  type PendingAgentDelta,
  type Participant,
  type Pattern,
  type PlanSectionKey,
  type RoomSnapshot,
  type RoomSummary,
  type Workstream,
  isAdrSectionKey,
} from "@shared/contracts";

import { createDefaultAdrSections } from "./engine";
import type { AiAdapter } from "./provider";
import { matchPatterns } from "./provider";
import { db, nowIso, parseJson } from "./db";

const claimTtlMs = 60_000;

function readSeed<T>(fileName: string): T {
  const filePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "data",
    fileName,
  );
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function emptyPlanSections() {
  return Object.fromEntries(
    planSectionOrder.map((section) => [section, ""]),
  ) as Record<PlanSectionKey, string>;
}

function emptyReviews() {
  return Object.fromEntries(
    adrSectionOrder.map((section) => [section, [] as string[]]),
  ) as Record<AdrSectionKey, string[]>;
}

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function hasStartedReview(adr: {
  status: RoomSnapshot["adr"]["status"];
  reviews: Record<AdrSectionKey, string[]>;
  approvals: string[];
}) {
  return (
    adr.status !== "draft" ||
    adr.approvals.length > 0 ||
    Object.values(adr.reviews).some((reviewers) => reviewers.length > 0)
  );
}

export class AppStore {
  constructor(private readonly adapter: AiAdapter) {
    this.seedReferenceData();
  }

  private seedReferenceData() {
    const guardrails = readSeed<Guardrail[]>("guardrails.json");
    const patterns = readSeed<Pattern[]>("patterns.json");
    const components = readSeed<ComponentEntry[]>("components.json");

    const guardrailCount = db
      .query("SELECT COUNT(*) AS count FROM workspace_guardrails")
      .get() as { count: number };
    if (guardrailCount.count === 0) {
      const insert = db.prepare(
        "INSERT INTO workspace_guardrails (id, json) VALUES (?, ?)",
      );
      for (const item of guardrails) {
        insert.run(item.id, JSON.stringify(item));
      }
    }

    const patternCount = db
      .query("SELECT COUNT(*) AS count FROM patterns")
      .get() as { count: number };
    if (patternCount.count === 0) {
      const insert = db.prepare(
        "INSERT INTO patterns (id, json) VALUES (?, ?)",
      );
      for (const item of patterns) {
        insert.run(item.id, JSON.stringify(item));
      }
    }

    const componentCount = db
      .query("SELECT COUNT(*) AS count FROM components")
      .get() as { count: number };
    if (componentCount.count === 0) {
      const insert = db.prepare(
        "INSERT INTO components (id, json) VALUES (?, ?)",
      );
      for (const item of components) {
        insert.run(item.id, JSON.stringify(item));
      }
    }
  }

  listRooms() {
    const rows = db
      .query(
        "SELECT json FROM rooms ORDER BY json_extract(json, '$.createdAt') DESC",
      )
      .all() as Array<{ json: string }>;
    return rows.map((row) => parseJson<RoomSummary>(row.json));
  }

  getGuardrails() {
    const rows = db
      .query("SELECT json FROM workspace_guardrails")
      .all() as Array<{ json: string }>;
    return rows.map((row) => parseJson<Guardrail>(row.json));
  }

  getPatterns() {
    const rows = db.query("SELECT json FROM patterns").all() as Array<{
      json: string;
    }>;
    return rows.map((row) => parseJson<Pattern>(row.json));
  }

  getComponents() {
    const rows = db.query("SELECT json FROM components").all() as Array<{
      json: string;
    }>;
    return rows.map((row) => parseJson<ComponentEntry>(row.json));
  }

  createRoom(input: Omit<RoomSummary, "id" | "createdAt" | "mode">) {
    const room: RoomSummary = {
      ...input,
      id: crypto.randomUUID(),
      mode: "explore",
      createdAt: nowIso(),
    };

    db.prepare("INSERT INTO rooms (id, json) VALUES (?, ?)").run(
      room.id,
      JSON.stringify(room),
    );
    db.prepare(
      "INSERT INTO adrs (id, room_id, status, sections_json, reviews_json, approvals_json) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(
      crypto.randomUUID(),
      room.id,
      "draft",
      JSON.stringify(createDefaultAdrSections()),
      JSON.stringify(emptyReviews()),
      JSON.stringify([]),
    );
    this.recordEvent(
      room.id,
      "system",
      "room.created",
      `Room created for ${room.topic}`,
      { topic: room.topic },
    );
    return room;
  }

  joinRoom(roomId: string, displayName: string, role: Participant["role"]) {
    this.requireRoom(roomId);
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      throw new Error("Display name is required.");
    }
    if (role === "decision_owner") {
      const room = this.requireRoom(roomId);
      const adr = this.requireAdr(roomId);
      if (room.decisionOwnerIds.length >= 3) {
        throw new Error("This room already has three decision owners.");
      }
      if (hasStartedReview(adr)) {
        throw new Error(
          "Cannot change the decision-owner set after ADR review has started.",
        );
      }
    }
    const participant: Participant = {
      id: crypto.randomUUID(),
      roomId,
      displayName: trimmedName,
      role,
      joinedAt: nowIso(),
      lastSeenAt: nowIso(),
    };
    db.prepare(
      "INSERT INTO participants (id, room_id, json) VALUES (?, ?, ?)",
    ).run(participant.id, roomId, JSON.stringify(participant));
    this.recordEvent(
      roomId,
      participant.id,
      "participant.joined",
      `${trimmedName} joined as ${role}`,
      { participantId: participant.id },
    );
    return participant;
  }

  touchParticipant(participantId: string) {
    const row = db
      .query("SELECT json FROM participants WHERE id = ?")
      .get(participantId) as { json?: string } | null;
    if (!row?.json) {
      return;
    }
    const participant = parseJson<Participant>(row.json);
    participant.lastSeenAt = nowIso();
    db.prepare("UPDATE participants SET json = ? WHERE id = ?").run(
      JSON.stringify(participant),
      participantId,
    );
  }

  setRoomMode(roomId: string, actorId: string, mode: RoomSummary["mode"]) {
    const room = this.requireRoom(roomId);
    const actor = this.requireParticipantInRoom(roomId, actorId);
    this.assertDecisionOwner(room, actor);
    if (mode === "draft_adr") {
      const snapshot = this.getRoomSnapshot(roomId, actorId);
      if (!snapshot.readiness.unresolvedDifferencesCleared) {
        throw new Error(
          "Resolve, dissent, or mark blockers non-blocking before moving to ADR drafting.",
        );
      }
    }
    room.mode = mode;
    db.prepare("UPDATE rooms SET json = ? WHERE id = ?").run(
      JSON.stringify(room),
      roomId,
    );
    this.recordEvent(
      roomId,
      actorId,
      "room.mode_changed",
      `Switched room to ${mode}`,
      { mode },
    );
    return room;
  }

  addDecisionOwner(roomId: string, actorId: string) {
    const room = this.requireRoom(roomId);
    const adr = this.requireAdr(roomId);
    if (!room.decisionOwnerIds.includes(actorId)) {
      if (room.decisionOwnerIds.length >= 3) {
        throw new Error("This room already has three decision owners.");
      }
      if (hasStartedReview(adr)) {
        throw new Error(
          "Cannot change the decision-owner set after ADR review has started.",
        );
      }
      room.decisionOwnerIds = [...room.decisionOwnerIds, actorId].slice(0, 3);
      db.prepare("UPDATE rooms SET json = ? WHERE id = ?").run(
        JSON.stringify(room),
        roomId,
      );
      this.recordEvent(
        roomId,
        actorId,
        "room.decision_owners.updated",
        `Decision owners updated`,
        {
          decisionOwnerIds: room.decisionOwnerIds,
        },
      );
    }
    return room;
  }

  async addUtterance(roomId: string, actorId: string, text: string) {
    const actor = this.requireParticipantInRoom(roomId, actorId);
    this.assertCanParticipate(actor, "Observers are read-only in this slice.");
    this.touchParticipant(actorId);
    const utteranceEvent = this.recordEvent(
      roomId,
      actorId,
      "human.utterance.created",
      text,
      { text, participantId: actorId },
    );
    const room = this.requireRoom(roomId);
    const deltas = await this.adapter.classifyUtterance({
      text,
      mode: room.mode,
      guardrails: this.getGuardrails(),
      components: this.getComponents(),
    });

    for (const delta of deltas) {
      const deltaEvent = this.recordEvent(
        roomId,
        actorId,
        "classifier.delta.created",
        `${delta.nodeType}: ${delta.text}`,
        {
          deltaType: delta.deltaType,
          text: delta.text,
          confidence: delta.confidence,
        },
        [utteranceEvent.id],
      );
      this.upsertAlignmentNode(
        roomId,
        actorId,
        delta.nodeType,
        delta.text,
        delta.confidence,
        [utteranceEvent.id, deltaEvent.id],
      );
    }

    return this.maybePublishOrchestratorUpdate(roomId, actorId, false);
  }

  submitAgentDelta(
    roomId: string,
    ownerId: string,
    sourceAgent: string,
    text: string,
    type = "agent_insight",
    confidence = 0.76,
  ): PendingAgentDelta {
    const actor = this.requireParticipantInRoom(roomId, ownerId);
    this.assertCanParticipate(actor, "Observers cannot attach private agents.");
    const trimmedText = typeof text === "string" ? text.trim() : "";
    if (!trimmedText) {
      throw new Error("Agent delta text is required.");
    }
    const delta: PendingAgentDelta = {
      id: crypto.randomUUID(),
      roomId,
      ownerId,
      sourceAgent:
        typeof sourceAgent === "string" && sourceAgent.trim()
          ? sourceAgent.trim()
          : "codex-room-bridge",
      type:
        typeof type === "string" && type.trim() ? type.trim() : "agent_insight",
      text: trimmedText,
      confidence: Number.isFinite(confidence)
        ? Math.min(Math.max(confidence, 0), 1)
        : 0.76,
      status: "pending" as const,
      createdAt: nowIso(),
    };
    db.prepare(
      "INSERT INTO agent_deltas (id, room_id, owner_id, json) VALUES (?, ?, ?, ?)",
    ).run(delta.id, roomId, ownerId, JSON.stringify(delta));
    this.recordEvent(
      roomId,
      ownerId,
      "agent.delta.submitted",
      `Pending delta from ${sourceAgent}`,
      {
        deltaId: delta.id,
        text: delta.text,
        approvalState: "pending",
      },
    );
    return delta;
  }

  async promoteAgentDelta(roomId: string, actorId: string, deltaId: string) {
    this.requireParticipantInRoom(roomId, actorId);
    const delta = this.requireAgentDelta(deltaId);
    if (delta.roomId !== roomId) {
      throw new Error("Agent delta does not belong to this room.");
    }
    if (delta.ownerId !== actorId) {
      throw new Error(
        "Only the owning participant can promote a private delta.",
      );
    }
    delta.status = "promoted";
    db.prepare("UPDATE agent_deltas SET json = ? WHERE id = ?").run(
      JSON.stringify(delta),
      delta.id,
    );
    const promotedEvent = this.recordEvent(
      roomId,
      actorId,
      "agent.delta.promoted",
      delta.text,
      {
        deltaId,
        approvedBy: actorId,
        approvalState: "promoted",
      },
    );
    this.upsertAlignmentNode(
      roomId,
      actorId,
      "option",
      delta.text,
      delta.confidence,
      [promotedEvent.id],
    );
    const orchestratorUpdate = await this.maybePublishOrchestratorUpdate(
      roomId,
      actorId,
      false,
    );
    return { delta, orchestratorUpdate };
  }

  discardAgentDelta(roomId: string, actorId: string, deltaId: string) {
    this.requireParticipantInRoom(roomId, actorId);
    const delta = this.requireAgentDelta(deltaId);
    if (delta.roomId !== roomId) {
      throw new Error("Agent delta does not belong to this room.");
    }
    if (delta.ownerId !== actorId) {
      throw new Error(
        "Only the owning participant can discard a private delta.",
      );
    }
    delta.status = "discarded";
    db.prepare("UPDATE agent_deltas SET json = ? WHERE id = ?").run(
      JSON.stringify(delta),
      delta.id,
    );
    this.recordEvent(
      roomId,
      actorId,
      "agent.delta.discarded",
      `Discarded private delta`,
      { deltaId, discardedBy: actorId },
    );
    return delta;
  }

  async synthesizeNow(roomId: string, actorId: string) {
    const actor = this.requireParticipantInRoom(roomId, actorId);
    this.assertCanParticipate(actor, "Observers cannot request synthesis.");
    return this.maybePublishOrchestratorUpdate(roomId, actorId, true);
  }

  resolveAlignmentNode(
    roomId: string,
    actorId: string,
    nodeId: string,
    resolution: "agreement" | "non_blocking" | "dissent",
    note?: string,
  ) {
    const actor = this.requireParticipantInRoom(roomId, actorId);
    this.assertCanParticipate(actor, "Observers cannot resolve blockers.");
    const node = this.requireAlignmentNode(roomId, nodeId);
    if (node.type !== "unresolved_difference") {
      throw new Error("Only unresolved differences can be resolved.");
    }

    const trimmedNote = note?.trim() ?? "";
    if (resolution === "agreement") {
      node.type = "agreement";
      node.text = trimmedNote || node.text;
      node.lastTouchedAt = nowIso();
      db.prepare("UPDATE alignment_nodes SET json = ? WHERE id = ?").run(
        JSON.stringify(node),
        node.id,
      );
      this.recordEvent(
        roomId,
        actorId,
        "alignment.node.updated",
        `Resolved blocker as agreement`,
        {
          op: "resolve",
          nodeId: node.id,
          resolution,
        },
      );
      return node;
    }

    db.prepare("DELETE FROM alignment_nodes WHERE id = ?").run(node.id);

    if (resolution === "dissent") {
      const dissentText = trimmedNote || node.text;
      this.appendDissentToAdr(roomId, actor, dissentText);
      this.recordEvent(
        roomId,
        actorId,
        "adr.dissent_recorded",
        `Recorded dissent for blocker`,
        {
          dissenterId: actorId,
          sourceNodeId: node.id,
          text: dissentText,
        },
      );
      const room = this.requireRoom(roomId);
      for (const ownerId of room.decisionOwnerIds) {
        if (ownerId === actorId) continue;
        this.pingParticipant(
          roomId,
          ownerId,
          `${actor.displayName} recorded dissent: "${dissentText}". The shared decision is back to draft — please resolve the inconsistency.`,
          "conflict",
        );
      }
      return null;
    }

    this.recordEvent(
      roomId,
      actorId,
      "alignment.node.updated",
      `Marked blocker non-blocking`,
      {
        op: "resolve",
        nodeId: node.id,
        resolution,
        note: trimmedNote || null,
      },
    );
    return null;
  }

  claimScope(
    roomId: string,
    actorId: string,
    scopeType: OwnershipClaim["scopeType"],
    scopeId: string,
  ) {
    const actor = this.requireParticipantInRoom(roomId, actorId);
    this.assertCanParticipate(actor, "Observers cannot claim sections.");
    this.assertClaimableScope(roomId, scopeType, scopeId);
    this.releaseExpiredClaims();
    const existing = this.findClaim(roomId, scopeType, scopeId);
    if (existing && existing.ownerId !== actorId) {
      this.recordEvent(
        roomId,
        actorId,
        scopeType === "adr_section"
          ? "adr.section.overlap_warning"
          : "plan_item.overlap_warning",
        `${scopeType} ${scopeId} is already claimed`,
        { scopeId, attemptedBy: actorId, currentOwnerId: existing.ownerId },
      );
      const scopeLabel = scopeType === "adr_section" ? "decision section" : "plan item";
      this.pingParticipant(
        roomId,
        existing.ownerId,
        `${actor.displayName} tried to edit the ${scopeLabel} "${scopeId}" while you hold it — please reconcile or release.`,
        "conflict",
      );
      this.pingParticipant(
        roomId,
        actorId,
        `The ${scopeLabel} "${scopeId}" is already claimed. We've pinged the current owner so you can reconcile.`,
        "conflict",
      );
      throw new Error("This section is already claimed.");
    }
    const claim: OwnershipClaim = {
      id: existing?.id ?? crypto.randomUUID(),
      roomId,
      scopeType,
      scopeId,
      ownerId: actorId,
      updatedAt: nowIso(),
      expiresAt: new Date(Date.now() + claimTtlMs).toISOString(),
    };
    if (existing) {
      db.prepare(
        "UPDATE claims SET updated_at = ?, expires_at = ?, owner_id = ? WHERE id = ?",
      ).run(claim.updatedAt, claim.expiresAt, claim.ownerId, claim.id);
    } else {
      db.prepare(
        "INSERT INTO claims (id, room_id, scope_type, scope_id, owner_id, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(
        claim.id,
        roomId,
        scopeType,
        scopeId,
        actorId,
        claim.updatedAt,
        claim.expiresAt,
      );
      this.recordEvent(
        roomId,
        actorId,
        scopeType === "adr_section"
          ? "adr.section.claimed"
          : "plan_item.claimed",
        `${scopeType} ${scopeId} claimed`,
        { scopeId, claimId: claim.id, ttlMs: claimTtlMs },
      );
    }
    return claim;
  }

  releaseScope(
    roomId: string,
    actorId: string,
    scopeType: OwnershipClaim["scopeType"],
    scopeId: string,
    reason = "manual",
  ) {
    if (reason === "manual") {
      this.requireParticipantInRoom(roomId, actorId);
    }
    const claim = this.findClaim(roomId, scopeType, scopeId);
    if (!claim) {
      return;
    }
    if (claim.ownerId !== actorId && reason === "manual") {
      throw new Error("Only the claim owner can release this claim.");
    }
    db.prepare("DELETE FROM claims WHERE id = ?").run(claim.id);
    this.recordEvent(
      roomId,
      actorId,
      scopeType === "adr_section"
        ? "adr.section.released"
        : "plan_item.released",
      `${scopeType} ${scopeId} released`,
      { scopeId, reason },
    );
  }

  async regenerateAdrSection(
    roomId: string,
    actorId: string,
    section: AdrSectionKey,
  ) {
    const snapshot = this.getRoomSnapshot(roomId, actorId);
    const text = await this.adapter.draftAdrSection(snapshot, section);
    return this.updateAdrSection(roomId, actorId, section, text);
  }

  updateAdrSection(
    roomId: string,
    actorId: string,
    section: AdrSectionKey,
    text: string,
  ) {
    const actor = this.requireParticipantInRoom(roomId, actorId);
    this.assertCanParticipate(actor, "Observers cannot edit ADR sections.");
    this.assertClaim(roomId, actorId, "adr_section", section);
    const adr = this.requireAdr(roomId);
    if (adr.status === "approved") {
      throw new Error("Approved ADRs are immutable in this slice.");
    }
    adr.sections[section] = text;
    adr.reviews[section] = [];
    adr.approvals = [];
    adr.status = "draft";
    db.prepare(
      "UPDATE adrs SET sections_json = ?, reviews_json = ? WHERE room_id = ?",
    ).run(JSON.stringify(adr.sections), JSON.stringify(adr.reviews), roomId);
    db.prepare(
      "UPDATE adrs SET status = ?, approvals_json = ? WHERE room_id = ?",
    ).run(adr.status, JSON.stringify(adr.approvals), roomId);
    this.touchClaim(roomId, "adr_section", section);
    this.recordEvent(
      roomId,
      actorId,
      "adr.section.updated",
      `${section} updated`,
      { section },
    );
    return adr;
  }

  reviewAdrSection(roomId: string, actorId: string, section: AdrSectionKey) {
    const actor = this.requireParticipantInRoom(roomId, actorId);
    this.assertCanParticipate(actor, "Observers cannot review ADR sections.");
    const adr = this.requireAdr(roomId);
    if (adr.status === "approved") {
      throw new Error("Approved ADRs cannot be reviewed again.");
    }
    if (!adr.sections[section].trim()) {
      throw new Error("Cannot review an empty ADR section.");
    }
    const reviewers = new Set(adr.reviews[section]);
    reviewers.add(actorId);
    adr.reviews[section] = [...reviewers];
    adr.status = "in_review";
    db.prepare(
      "UPDATE adrs SET status = ?, reviews_json = ? WHERE room_id = ?",
    ).run(adr.status, JSON.stringify(adr.reviews), roomId);
    this.recordEvent(
      roomId,
      actorId,
      "adr.section.reviewed",
      `${section} reviewed`,
      { section, reviewerId: actorId },
    );
    return adr;
  }

  approveAdr(roomId: string, actorId: string) {
    const room = this.requireRoom(roomId);
    const actor = this.requireParticipantInRoom(roomId, actorId);
    this.assertDecisionOwner(room, actor);
    const adr = this.requireAdr(roomId);
    const snapshot = this.getRoomSnapshot(roomId, actorId);

    if (
      !snapshot.readiness.adrSectionsPopulated ||
      !snapshot.readiness.adrReviewed ||
      !snapshot.readiness.unresolvedDifferencesCleared
    ) {
      throw new Error("The ADR is not ready for approval.");
    }

    const approvals = new Set(adr.approvals);
    approvals.add(actorId);
    adr.approvals = [...approvals];

    if (room.decisionOwnerIds.every((ownerId) => approvals.has(ownerId))) {
      adr.status = "approved";
      const revision = {
        id: crypto.randomUUID(),
        adrId: adr.id,
        roomId,
        revisionNumber: this.countRows("adr_revisions", roomId) + 1,
        reason: "approval",
        sections: adr.sections,
        createdBy: actorId,
        createdAt: nowIso(),
      };
      db.prepare(
        "INSERT INTO adr_revisions (id, room_id, json) VALUES (?, ?, ?)",
      ).run(revision.id, roomId, JSON.stringify(revision));
      this.recordEvent(roomId, actorId, "adr.approved", `ADR approved`, {
        approverIds: [...approvals],
        decisionOwnerIds: room.decisionOwnerIds,
        adrRevisionId: revision.id,
      });
    }

    db.prepare(
      "UPDATE adrs SET status = ?, approvals_json = ? WHERE room_id = ?",
    ).run(adr.status, JSON.stringify(adr.approvals), roomId);
    return adr;
  }

  async generatePlan(roomId: string, actorId: string) {
    const actor = this.requireParticipantInRoom(roomId, actorId);
    this.assertCanParticipate(actor, "Observers cannot generate plans.");
    const adr = this.requireAdr(roomId);
    if (adr.status !== "approved") {
      throw new Error("Approve the ADR before generating a plan.");
    }
    const snapshot = this.getRoomSnapshot(roomId, actorId);
    const generated = await this.adapter.generatePlan(snapshot);
    const existing = this.findPlan(roomId);
    const planId = existing?.id ?? generated.planId;
    db.prepare(
      "INSERT INTO plans (id, room_id, status, sections_json, workstreams_json, approvals_json, source_adr_revision_id) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(room_id) DO UPDATE SET status = excluded.status, sections_json = excluded.sections_json, workstreams_json = excluded.workstreams_json, approvals_json = excluded.approvals_json, source_adr_revision_id = excluded.source_adr_revision_id",
    ).run(
      planId,
      roomId,
      "draft",
      JSON.stringify(generated.sections),
      JSON.stringify(generated.workstreams),
      JSON.stringify([]),
      this.latestRevisionId("adr_revisions", roomId),
    );
    this.recordEvent(
      roomId,
      actorId,
      "plan.generated",
      `Implementation plan generated`,
      { planId },
    );
    return this.requirePlan(roomId);
  }

  updatePlanItem(
    roomId: string,
    actorId: string,
    itemId: string,
    patch: Partial<Workstream>,
  ) {
    const actor = this.requireParticipantInRoom(roomId, actorId);
    this.assertCanParticipate(actor, "Observers cannot edit plan workstreams.");
    this.assertClaim(roomId, actorId, "plan_item", itemId);
    const plan = this.requirePlan(roomId);
    if (plan.status === "approved") {
      throw new Error("Approved plans are immutable in this slice.");
    }
    let found = false;
    const nextItems = plan.workstreams.map((item) => {
      if (item.id !== itemId) {
        return item;
      }
      found = true;
      return {
        ...item,
        ...patch,
        id: item.id,
        planId: item.planId,
      };
    });
    if (!found) {
      throw new Error("Plan item not found.");
    }
    plan.workstreams = nextItems;
    plan.approvals = [];
    plan.status = "draft";
    db.prepare(
      "UPDATE plans SET status = ?, workstreams_json = ?, approvals_json = ? WHERE room_id = ?",
    ).run(
      plan.status,
      JSON.stringify(nextItems),
      JSON.stringify(plan.approvals),
      roomId,
    );
    this.touchClaim(roomId, "plan_item", itemId);
    this.recordEvent(roomId, actorId, "plan.updated", `Plan item updated`, {
      itemId,
    });
    return plan;
  }

  acceptPlanOwner(roomId: string, actorId: string, itemId: string) {
    const actor = this.requireParticipantInRoom(roomId, actorId);
    this.assertCanParticipate(
      actor,
      "Observers cannot accept workstream ownership.",
    );
    const plan = this.requirePlan(roomId);
    if (plan.status === "approved") {
      throw new Error("Approved plans cannot be changed.");
    }
    let found = false;
    const nextItems = plan.workstreams.map((item) =>
      item.id === itemId
        ? ((found = true),
          {
            ...item,
            suggestedOwnerId: actorId,
            ownerStatus: "accepted" as const,
          })
        : item,
    );
    if (!found) {
      throw new Error("Plan item not found.");
    }
    plan.workstreams = nextItems;
    plan.approvals = [];
    plan.status = "in_review";
    db.prepare(
      "UPDATE plans SET status = ?, workstreams_json = ?, approvals_json = ? WHERE room_id = ?",
    ).run(
      plan.status,
      JSON.stringify(nextItems),
      JSON.stringify(plan.approvals),
      roomId,
    );
    this.recordEvent(
      roomId,
      actorId,
      "plan_item.owner_accepted",
      `Accepted ownership for ${itemId}`,
      { itemId, ownerId: actorId },
    );
    return plan;
  }

  approvePlan(roomId: string, actorId: string) {
    const room = this.requireRoom(roomId);
    const actor = this.requireParticipantInRoom(roomId, actorId);
    this.assertDecisionOwner(room, actor);
    const plan = this.requirePlan(roomId);
    const snapshot = this.getRoomSnapshot(roomId, actorId);
    if (!snapshot.readiness.acceptedWorkstreamOwners) {
      throw new Error(
        "Every workstream needs an accepted owner before plan approval.",
      );
    }
    const approvals = new Set(plan.approvals);
    approvals.add(actorId);
    plan.approvals = [...approvals];
    if (room.decisionOwnerIds.every((ownerId) => approvals.has(ownerId))) {
      plan.status = "approved";
      const revision = {
        id: crypto.randomUUID(),
        planId: plan.id,
        roomId,
        revisionNumber: this.countRows("plan_revisions", roomId) + 1,
        reason: "approval",
        sections: plan.sections,
        workstreams: plan.workstreams,
        createdBy: actorId,
        createdAt: nowIso(),
        sourceAdrRevisionId: this.latestRevisionId("adr_revisions", roomId),
      };
      db.prepare(
        "INSERT INTO plan_revisions (id, room_id, json) VALUES (?, ?, ?)",
      ).run(revision.id, roomId, JSON.stringify(revision));
      this.recordEvent(roomId, actorId, "plan.approved", `Plan approved`, {
        approverIds: [...approvals],
        planRevisionId: revision.id,
        sourceAdrRevisionId: revision.sourceAdrRevisionId,
      });
    }
    db.prepare(
      "UPDATE plans SET status = ?, approvals_json = ? WHERE room_id = ?",
    ).run(plan.status, JSON.stringify(plan.approvals), roomId);
    return plan;
  }

  generateHandoff(roomId: string, actorId: string) {
    const actor = this.requireParticipantInRoom(roomId, actorId);
    this.assertCanParticipate(
      actor,
      "Observers can only view existing handoff packages.",
    );
    const payload = this.ensureHandoffPackage(roomId, actorId);
    if (!payload) {
      throw new Error(
        "Approve the ADR and plan before generating a handoff package.",
      );
    }
    return payload;
  }

  getRoomSnapshot(roomId: string, viewerId?: string): RoomSnapshot {
    this.releaseExpiredClaims();
    const room = this.requireRoom(roomId);
    const participantRows = db
      .query(
        "SELECT json FROM participants WHERE room_id = ? ORDER BY json_extract(json, '$.joinedAt') ASC",
      )
      .all(roomId) as Array<{ json: string }>;
    const participants = participantRows.map((row) =>
      parseJson<Participant>(row.json),
    );
    const guardrails = this.getGuardrails();
    const components = this.getComponents();
    const patterns = matchPatterns(
      this.getPatterns(),
      room.topicTags,
      `${room.topic} ${room.goal}`,
    );
    const alignmentRows = db
      .query(
        "SELECT json FROM alignment_nodes WHERE room_id = ? ORDER BY json_extract(json, '$.lastTouchedAt') DESC",
      )
      .all(roomId) as Array<{ json: string }>;
    const alignmentNodes = alignmentRows.map((row) =>
      parseJson<AlignmentNode>(row.json),
    );
    const updateRows = db
      .query(
        "SELECT json FROM orchestrator_updates WHERE room_id = ? ORDER BY json_extract(json, '$.createdAt') DESC LIMIT 8",
      )
      .all(roomId) as Array<{ json: string }>;
    const orchestratorUpdates = updateRows.map((row) =>
      parseJson<RoomSnapshot["orchestratorUpdates"][number]>(row.json),
    );
    const pendingDeltas = viewerId
      ? (
          db
            .query(
              "SELECT json FROM agent_deltas WHERE room_id = ? AND owner_id = ? ORDER BY json_extract(json, '$.createdAt') DESC",
            )
            .all(roomId, viewerId) as Array<{ json: string }>
        ).map((row) =>
          parseJson<RoomSnapshot["pendingDeltas"][number]>(row.json),
        )
      : [];
    const routedToParticipant = viewerId
      ? (
          db
            .query(
              "SELECT json FROM routing_items WHERE room_id = ? AND participant_id = ? ORDER BY json_extract(json, '$.createdAt') DESC",
            )
            .all(roomId, viewerId) as Array<{ json: string }>
        ).map((row) =>
          parseJson<RoomSnapshot["routedToParticipant"][number]>(row.json),
        )
      : [];
    const claims = db
      .query("SELECT * FROM claims WHERE room_id = ? ORDER BY updated_at DESC")
      .all(roomId)
      .map((row) => {
        const value = row as OwnershipClaim & Record<string, string>;
        return {
          id: value.id,
          roomId: value.room_id ?? roomId,
          scopeType: value.scope_type as OwnershipClaim["scopeType"],
          scopeId: value.scope_id,
          ownerId: value.owner_id,
          updatedAt: value.updated_at,
          expiresAt: value.expires_at,
        };
      });
    const adr = this.requireAdr(roomId);
    const plan = this.findPlan(roomId) ?? {
      id: null,
      status: null,
      sections: emptyPlanSections(),
      workstreams: [],
      approvals: [],
    };
    const recentEvents = db
      .query(
        "SELECT id, type, actor_id, timestamp, summary FROM events WHERE room_id = ? ORDER BY timestamp DESC LIMIT 20",
      )
      .all(roomId)
      .map((row) => {
        const value = row as {
          id: string;
          type: string;
          actor_id: string;
          timestamp: string;
          summary: string;
        };
        return {
          id: value.id,
          type: value.type,
          actorId: value.actor_id,
          timestamp: value.timestamp,
          summary: value.summary,
        };
      });
    const unresolvedDifferencesCleared = !alignmentNodes.some(
      (node) => node.type === "unresolved_difference",
    );
    const adrSectionsPopulated = adrSectionOrder.every(
      (section) => adr.sections[section].trim().length > 0,
    );
    const adrReviewed = adrSectionOrder.every(
      (section) => adr.reviews[section].length > 0,
    );
    const acceptedWorkstreamOwners = plan.workstreams.every(
      (item) =>
        item.ownerStatus === "accepted" &&
        item.deliverables.length > 0 &&
        item.acceptanceChecks.length > 0,
    );

    return {
      room,
      participants,
      guardrails,
      patterns,
      components,
      alignmentNodes,
      orchestratorUpdates,
      pendingDeltas,
      routedToParticipant,
      adr,
      plan,
      claims,
      recentEvents,
      readiness: {
        adrSectionsPopulated,
        adrReviewed,
        unresolvedDifferencesCleared,
        acceptedWorkstreamOwners,
      },
    };
  }

  getAdrDetail(roomId: string) {
    return this.requireAdr(roomId);
  }

  getPlanDetail(roomId: string) {
    return this.requirePlan(roomId);
  }

  getHandoff(roomId: string) {
    const row = db
      .query("SELECT json FROM handoff_packages WHERE room_id = ?")
      .get(roomId) as { json?: string } | null;
    return row?.json ? parseJson(row.json) : null;
  }

  releaseExpiredClaims() {
    const expired = db
      .query("SELECT * FROM claims WHERE expires_at < ?")
      .all(nowIso()) as Array<Record<string, string>>;
    for (const claim of expired) {
      db.prepare("DELETE FROM claims WHERE id = ?").run(claim.id);
      this.recordEvent(
        claim.room_id,
        claim.owner_id,
        claim.scope_type === "adr_section"
          ? "adr.section.released"
          : "plan_item.released",
        `${claim.scope_type} ${claim.scope_id} auto-released`,
        { scopeId: claim.scope_id, reason: "timeout" },
      );
    }
    return [...new Set(expired.map((claim) => claim.room_id))];
  }

  private ensureHandoffPackage(roomId: string, actorId = "system") {
    const plan = this.findPlan(roomId);
    const adr = this.requireAdr(roomId);
    if (!plan || plan.status !== "approved" || adr.status !== "approved") {
      return null;
    }
    const snapshot = this.getRoomSnapshot(roomId);
    const payload = {
      id: crypto.randomUUID(),
      roomId,
      createdAt: nowIso(),
      room: this.requireRoom(roomId),
      adr,
      plan,
      patterns: snapshot.patterns,
      alignmentNodes: snapshot.alignmentNodes,
    };
    db.prepare(
      "INSERT INTO handoff_packages (id, room_id, json) VALUES (?, ?, ?) ON CONFLICT(room_id) DO UPDATE SET json = excluded.json",
    ).run(payload.id, roomId, JSON.stringify(payload));
    this.recordEvent(
      roomId,
      actorId,
      "implementation.package.generated",
      `Generated handoff package`,
      { packageId: payload.id },
    );
    return payload;
  }

  private async maybePublishOrchestratorUpdate(
    roomId: string,
    actorId: string,
    force: boolean,
  ) {
    const latest = db
      .query(
        "SELECT json FROM orchestrator_updates WHERE room_id = ? ORDER BY json_extract(json, '$.createdAt') DESC LIMIT 1",
      )
      .get(roomId) as { json?: string } | null;
    if (!force && latest?.json) {
      const lastUpdate = parseJson<{ createdAt: string }>(latest.json);
      if (Date.now() - Date.parse(lastUpdate.createdAt) < 10_000) {
        return null;
      }
    }
    const snapshot = this.getRoomSnapshot(roomId, actorId);
    const recentSummaries = snapshot.recentEvents
      .slice(0, 5)
      .map((event) => event.summary);
    const result = await this.adapter.synthesize(snapshot, recentSummaries);
    // LLM output is untrusted: the model sometimes returns an object or a
    // string (or omits the field entirely) where we declared an array. Coerce
    // first, then drop feedback items whose participantId is missing, empty,
    // or doesn't match a real room participant — otherwise we hit
    // `targetedFeedback.filter is not a function` or the NOT NULL constraint
    // on routing_items.participant_id.
    const participantIds = new Set(snapshot.participants.map((p) => p.id));
    const rawTargetedFeedback = Array.isArray(result.targetedFeedback)
      ? result.targetedFeedback
      : [];
    const rawRoutedInsights = Array.isArray(result.routedInsights)
      ? result.routedInsights
      : [];
    const targetedFeedback = rawTargetedFeedback.filter(
      (item): item is typeof item =>
        typeof item?.participantId === "string" &&
        item.participantId.length > 0 &&
        participantIds.has(item.participantId) &&
        typeof item.message === "string" &&
        item.message.trim().length > 0,
    );
    const update = {
      id: crypto.randomUUID(),
      roomId,
      synthesis: typeof result.synthesis === "string" ? result.synthesis : "",
      suggestedNextMove:
        typeof result.suggestedNextMove === "string" ? result.suggestedNextMove : null,
      targetedFeedback,
      routedInsights: rawRoutedInsights,
      sourceEventIds: snapshot.recentEvents
        .slice(0, 5)
        .map((event) => event.id),
      createdAt: nowIso(),
    };
    db.prepare(
      "INSERT INTO orchestrator_updates (id, room_id, json) VALUES (?, ?, ?)",
    ).run(update.id, roomId, JSON.stringify(update));
    for (const item of targetedFeedback) {
      this.pingParticipant(roomId, item.participantId, item.message, "orchestrator");
    }
    this.recordEvent(
      roomId,
      actorId,
      "orchestrator.update.published",
      result.synthesis,
      { updateId: update.id },
      update.sourceEventIds,
    );
    return update;
  }

  private upsertAlignmentNode(
    roomId: string,
    actorId: string,
    type: AlignmentNode["type"],
    text: string,
    confidence: number,
    sourceEventIds: string[],
  ) {
    const existingRows = db
      .query("SELECT id, json FROM alignment_nodes WHERE room_id = ?")
      .all(roomId) as Array<{ id: string; json: string }>;
    const existing = existingRows
      .map((row) => parseJson<AlignmentNode>(row.json))
      .find(
        (node) =>
          node.type === type && normalize(node.text) === normalize(text),
      );

    if (existing) {
      existing.lastTouchedAt = nowIso();
      existing.confidence = Math.max(existing.confidence, confidence);
      existing.sourceEventIds = [
        ...new Set([...existing.sourceEventIds, ...sourceEventIds]),
      ];
      db.prepare("UPDATE alignment_nodes SET json = ? WHERE id = ?").run(
        JSON.stringify(existing),
        existing.id,
      );
      this.recordEvent(
        roomId,
        actorId,
        "alignment.node.updated",
        `${type} refreshed`,
        { op: "update", nodeId: existing.id },
        sourceEventIds,
      );
      return existing;
    }

    const node: AlignmentNode = {
      id: crypto.randomUUID(),
      roomId,
      type,
      text,
      confidence,
      createdBy: actorId,
      lastTouchedAt: nowIso(),
      sourceEventIds,
      supersedesId: null,
    };
    db.prepare(
      "INSERT INTO alignment_nodes (id, room_id, json) VALUES (?, ?, ?)",
    ).run(node.id, roomId, JSON.stringify(node));
    this.recordEvent(
      roomId,
      actorId,
      "alignment.node.updated",
      `${type} added`,
      { op: "add", nodeId: node.id },
      sourceEventIds,
    );
    return node;
  }

  private requireRoom(roomId: string) {
    const row = db.query("SELECT json FROM rooms WHERE id = ?").get(roomId) as {
      json?: string;
    } | null;
    if (!row?.json) {
      throw new Error("Room not found.");
    }
    return parseJson<RoomSummary>(row.json);
  }

  /** Drop a routed item on a participant's private feed. Used for both
   *  orchestrator nudges and conflict pings (overlapped claims, dissent). */
  private pingParticipant(
    roomId: string,
    participantId: string,
    message: string,
    kind: "orchestrator" | "conflict",
  ) {
    if (!participantId || !message.trim()) return;
    const routingItem = {
      id: crypto.randomUUID(),
      participantId,
      message,
      createdAt: nowIso(),
      kind,
    };
    db.prepare(
      "INSERT INTO routing_items (id, room_id, participant_id, json) VALUES (?, ?, ?, ?)",
    ).run(routingItem.id, roomId, participantId, JSON.stringify(routingItem));
  }

  private requireAdr(roomId: string) {
    const row = db
      .query("SELECT * FROM adrs WHERE room_id = ?")
      .get(roomId) as {
      id: string;
      status: string;
      sections_json: string;
      reviews_json: string;
      approvals_json: string;
    } | null;
    if (!row) {
      throw new Error("ADR not found.");
    }
    return {
      id: row.id,
      status: row.status as RoomSnapshot["adr"]["status"],
      sections: parseJson<Record<AdrSectionKey, string>>(row.sections_json),
      reviews: parseJson<Record<AdrSectionKey, string[]>>(row.reviews_json),
      approvals: parseJson<string[]>(row.approvals_json),
    };
  }

  private findPlan(roomId: string) {
    const row = db
      .query("SELECT * FROM plans WHERE room_id = ?")
      .get(roomId) as {
      id: string;
      status: string;
      sections_json: string;
      workstreams_json: string;
      approvals_json: string;
    } | null;
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      status: row.status as NonNullable<RoomSnapshot["plan"]["status"]>,
      sections: parseJson<Record<PlanSectionKey, string>>(row.sections_json),
      workstreams: parseJson<Workstream[]>(row.workstreams_json),
      approvals: parseJson<string[]>(row.approvals_json),
    };
  }

  private requirePlan(roomId: string) {
    const plan = this.findPlan(roomId);
    if (!plan) {
      throw new Error("Plan not found.");
    }
    return plan;
  }

  private requireAgentDelta(deltaId: string) {
    const row = db
      .query("SELECT json FROM agent_deltas WHERE id = ?")
      .get(deltaId) as { json?: string } | null;
    if (!row?.json) {
      throw new Error("Agent delta not found.");
    }
    return parseJson<RoomSnapshot["pendingDeltas"][number]>(row.json);
  }

  private requireAlignmentNode(roomId: string, nodeId: string) {
    const row = db
      .query("SELECT json FROM alignment_nodes WHERE id = ? AND room_id = ?")
      .get(nodeId, roomId) as { json?: string } | null;
    if (!row?.json) {
      throw new Error("Alignment node not found.");
    }
    return parseJson<AlignmentNode>(row.json);
  }

  private recordEvent(
    roomId: string,
    actorId: string,
    type: string,
    summary: string,
    payload: Record<string, unknown>,
    sourceEventIds: string[] = [],
    supersedes: string | null = null,
  ) {
    const event = {
      id: crypto.randomUUID(),
      type,
      roomId,
      actorId,
      timestamp: nowIso(),
      sourceEventIds,
      supersedes,
      payload,
    };
    db.prepare(
      "INSERT INTO events (id, room_id, type, actor_id, timestamp, summary, source_event_ids, supersedes, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      event.id,
      roomId,
      type,
      actorId,
      event.timestamp,
      summary,
      JSON.stringify(sourceEventIds),
      supersedes,
      JSON.stringify(payload),
    );
    return event;
  }

  private findClaim(
    roomId: string,
    scopeType: OwnershipClaim["scopeType"],
    scopeId: string,
  ) {
    const row = db
      .query(
        "SELECT * FROM claims WHERE room_id = ? AND scope_type = ? AND scope_id = ? LIMIT 1",
      )
      .get(roomId, scopeType, scopeId) as Record<string, string> | null;
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      roomId,
      scopeType,
      scopeId,
      ownerId: row.owner_id,
      updatedAt: row.updated_at,
      expiresAt: row.expires_at,
    } satisfies OwnershipClaim;
  }

  private touchClaim(
    roomId: string,
    scopeType: OwnershipClaim["scopeType"],
    scopeId: string,
  ) {
    const claim = this.findClaim(roomId, scopeType, scopeId);
    if (!claim) {
      return;
    }
    db.prepare(
      "UPDATE claims SET updated_at = ?, expires_at = ? WHERE id = ?",
    ).run(nowIso(), new Date(Date.now() + claimTtlMs).toISOString(), claim.id);
  }

  private assertClaim(
    roomId: string,
    actorId: string,
    scopeType: OwnershipClaim["scopeType"],
    scopeId: string,
  ) {
    const claim = this.findClaim(roomId, scopeType, scopeId);
    if (!claim || claim.ownerId !== actorId) {
      throw new Error("Claim this section before editing.");
    }
  }

  private appendDissentToAdr(
    roomId: string,
    actor: Participant,
    dissentText: string,
  ) {
    const adr = this.requireAdr(roomId);
    if (adr.status === "approved") {
      return;
    }
    const entry = `Dissent (${actor.displayName}): ${dissentText}`;
    adr.sections.consequences = adr.sections.consequences.trim()
      ? `${adr.sections.consequences}\n\n${entry}`
      : entry;
    adr.reviews.consequences = [];
    adr.approvals = [];
    adr.status = "draft";
    db.prepare(
      "UPDATE adrs SET status = ?, sections_json = ?, reviews_json = ?, approvals_json = ? WHERE room_id = ?",
    ).run(
      adr.status,
      JSON.stringify(adr.sections),
      JSON.stringify(adr.reviews),
      JSON.stringify(adr.approvals),
      roomId,
    );
  }

  private requireParticipantInRoom(roomId: string, participantId: string) {
    const row = db
      .query("SELECT json FROM participants WHERE id = ? AND room_id = ?")
      .get(participantId, roomId) as { json?: string } | null;
    if (!row?.json) {
      throw new Error("Participant not found in this room.");
    }
    return parseJson<Participant>(row.json);
  }

  private assertCanParticipate(participant: Participant, message: string) {
    if (participant.role === "observer") {
      throw new Error(message);
    }
  }

  private assertDecisionOwner(room: RoomSummary, participant: Participant) {
    if (!room.decisionOwnerIds.includes(participant.id)) {
      throw new Error("Only decision owners can do that.");
    }
  }

  private assertClaimableScope(
    roomId: string,
    scopeType: OwnershipClaim["scopeType"],
    scopeId: string,
  ) {
    if (scopeType === "adr_section") {
      if (!isAdrSectionKey(scopeId)) {
        throw new Error("Unknown ADR section.");
      }
      return;
    }

    const plan = this.requirePlan(roomId);
    if (!plan.workstreams.some((item) => item.id === scopeId)) {
      throw new Error("Unknown plan item.");
    }
  }

  private countRows(
    tableName: "adr_revisions" | "plan_revisions",
    roomId: string,
  ) {
    const row = db
      .query(`SELECT COUNT(*) AS count FROM ${tableName} WHERE room_id = ?`)
      .get(roomId) as { count: number };
    return row.count;
  }

  private latestRevisionId(
    tableName: "adr_revisions" | "plan_revisions",
    roomId: string,
  ) {
    const row = db
      .query(
        `SELECT json FROM ${tableName} WHERE room_id = ? ORDER BY json_extract(json, '$.createdAt') DESC LIMIT 1`,
      )
      .get(roomId) as { json?: string } | null;
    if (!row?.json) {
      return null;
    }
    return parseJson<{ id: string }>(row.json).id;
  }
}
