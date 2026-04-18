import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  adrSectionOrder,
  alignmentNodeTypes,
  roomModes,
  type AdrSectionKey,
} from "../../../georg/shared/contracts";

const participantRoles = ["decision_owner", "contributor", "observer"] as const;
const resolutionTypes = ["agreement", "non_blocking", "dissent"] as const;
const claimScopeTypes = ["adr_section", "plan_item"] as const;

const baseUrl = process.env.GEORG_BASE_URL?.trim() || process.env.ROOM_SERVER_URL?.trim() || "http://localhost:3001";
const appUrl = process.env.GEORG_APP_URL?.trim() || "http://localhost:5173";

const server = new McpServer({
  name: "codex-room-bridge",
  version: "0.1.0",
});

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function toolText(title: string, data: JsonValue) {
  return {
    content: [
      {
        type: "text" as const,
        text: `${title}\n${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

function absoluteRoomUrl(roomId: string, participantId?: string) {
  const url = new URL(`/rooms/${roomId}`, appUrl);
  if (participantId) {
    url.searchParams.set("participantId", participantId);
  }
  return url.toString();
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const raw = await response.text();
  const payload = raw.length ? JSON.parse(raw) : null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: string }).error ?? raw)
        : raw || response.statusText;
    throw new Error(`${init?.method ?? "GET"} ${path} failed (${response.status}): ${message}`);
  }

  return payload as T;
}

async function getRoomSnapshot(roomId: string, viewerId?: string) {
  const suffix = viewerId ? `?viewerId=${encodeURIComponent(viewerId)}` : "";
  return requestJson<any>(`/api/rooms/${roomId}${suffix}`);
}

async function latestPendingDelta(roomId: string, actorId: string) {
  const snapshot = await getRoomSnapshot(roomId, actorId);
  const matching = snapshot.pendingDeltas.filter(
    (delta: { ownerId: string; status: string }) =>
      delta.ownerId === actorId && delta.status === "pending",
  );
  return matching[matching.length - 1] ?? null;
}

server.registerTool(
  "georg_health",
  {
    title: "Check georg health",
    description: "Verify that the local georg API is reachable and return basic workspace counts.",
  },
  async () => {
    const bootstrap = await requestJson<any>("/api/bootstrap");
    return toolText("Local georg API is reachable.", {
      baseUrl,
      appUrl,
      rooms: bootstrap.rooms.length,
      guardrails: bootstrap.guardrails.length,
      patterns: bootstrap.patterns.length,
      components: bootstrap.components.length,
    });
  },
);

server.registerTool(
  "georg_list_rooms",
  {
    title: "List rooms",
    description: "List all existing rooms from the local georg API.",
  },
  async () => {
    const rooms = await requestJson<any[]>("/api/rooms");
    return toolText("Current georg rooms.", {
      baseUrl,
      rooms,
    });
  },
);

server.registerTool(
  "georg_get_room_snapshot",
  {
    title: "Get room snapshot",
    description: "Fetch the full room snapshot, optionally scoped to a viewer/participant.",
    inputSchema: {
      roomId: z.string(),
      viewerId: z.string().optional(),
    },
  },
  async ({ roomId, viewerId }) => {
    const snapshot = await getRoomSnapshot(roomId, viewerId);
    return toolText(`Room snapshot for ${roomId}.`, snapshot);
  },
);

server.registerTool(
  "georg_create_room",
  {
    title: "Create room",
    description: "Create a new room in georg without joining a participant.",
    inputSchema: {
      topic: z.string(),
      decision: z.string(),
      goal: z.string(),
      nonGoals: z.string(),
      scope: z.string(),
      successBar: z.string(),
      topicTags: z.array(z.string()).optional(),
    },
  },
  async ({ topic, decision, goal, nonGoals, scope, successBar, topicTags }) => {
    const room = await requestJson<any>("/api/rooms", {
      method: "POST",
      body: JSON.stringify({
        topic,
        decision,
        goal,
        nonGoals,
        scope,
        successBar,
        topicTags: topicTags ?? [],
      }),
    });
    return toolText("Created georg room.", {
      room,
      roomUrl: absoluteRoomUrl(room.id),
    });
  },
);

server.registerTool(
  "georg_create_room_with_owner",
  {
    title: "Create room with owner",
    description: "Create a new room and immediately join it as a decision owner.",
    inputSchema: {
      topic: z.string(),
      decision: z.string(),
      goal: z.string(),
      nonGoals: z.string(),
      scope: z.string(),
      successBar: z.string(),
      topicTags: z.array(z.string()).optional(),
      ownerName: z.string(),
    },
  },
  async ({
    topic,
    decision,
    goal,
    nonGoals,
    scope,
    successBar,
    topicTags,
    ownerName,
  }) => {
    const room = await requestJson<any>("/api/rooms", {
      method: "POST",
      body: JSON.stringify({
        topic,
        decision,
        goal,
        nonGoals,
        scope,
        successBar,
        topicTags: topicTags ?? [],
      }),
    });

    const participant = await requestJson<any>(`/api/rooms/${room.id}/join`, {
      method: "POST",
      body: JSON.stringify({
        displayName: ownerName,
        role: "decision_owner",
      }),
    });

    return toolText("Created georg room and joined as owner.", {
      room,
      participant,
      controlUrl: absoluteRoomUrl(room.id, participant.id),
    });
  },
);

server.registerTool(
  "georg_join_room",
  {
    title: "Join room",
    description: "Join an existing room as a decision owner, contributor, or observer.",
    inputSchema: {
      roomId: z.string(),
      displayName: z.string(),
      role: z.enum(participantRoles),
    },
  },
  async ({ roomId, displayName, role }) => {
    const participant = await requestJson<any>(`/api/rooms/${roomId}/join`, {
      method: "POST",
      body: JSON.stringify({
        displayName,
        role,
      }),
    });
    return toolText(`Joined room ${roomId}.`, {
      participant,
      participantUrl: absoluteRoomUrl(roomId, participant.id),
    });
  },
);

server.registerTool(
  "georg_set_room_mode",
  {
    title: "Set room mode",
    description: "Move a room between explore, narrow, decide, and draft_adr.",
    inputSchema: {
      roomId: z.string(),
      actorId: z.string(),
      mode: z.enum(roomModes),
    },
  },
  async ({ roomId, actorId, mode }) => {
    const result = await requestJson<any>(`/api/rooms/${roomId}/mode`, {
      method: "POST",
      body: JSON.stringify({ actorId, mode }),
    });
    return toolText(`Updated room mode to ${mode}.`, result);
  },
);

server.registerTool(
  "georg_add_utterance",
  {
    title: "Add utterance",
    description: "Post a shared human message into the room timeline.",
    inputSchema: {
      roomId: z.string(),
      actorId: z.string(),
      text: z.string(),
    },
  },
  async ({ roomId, actorId, text }) => {
    const result = await requestJson<any>(`/api/rooms/${roomId}/utterances`, {
      method: "POST",
      body: JSON.stringify({ actorId, text }),
    });
    return toolText("Added shared utterance.", result);
  },
);

server.registerTool(
  "georg_submit_agent_delta",
  {
    title: "Submit private delta",
    description: "Submit a private agent delta for a participant without immediately promoting it into shared state.",
    inputSchema: {
      roomId: z.string(),
      actorId: z.string(),
      sourceAgent: z.string(),
      text: z.string(),
      type: z.string().optional(),
      confidence: z.number().min(0).max(1).optional(),
    },
  },
  async ({ roomId, actorId, sourceAgent, text, type, confidence }) => {
    const delta = await requestJson<any>(`/api/rooms/${roomId}/agent-deltas`, {
      method: "POST",
      body: JSON.stringify({
        actorId,
        sourceAgent,
        text,
        type,
        confidence,
      }),
    });
    return toolText("Submitted private agent delta.", delta);
  },
);

server.registerTool(
  "georg_promote_agent_delta",
  {
    title: "Promote private delta",
    description: "Promote a private delta into the shared room. If deltaId is omitted, the latest pending delta for that actor is used.",
    inputSchema: {
      roomId: z.string(),
      actorId: z.string(),
      deltaId: z.string().optional(),
    },
  },
  async ({ roomId, actorId, deltaId }) => {
    const targetId = deltaId ?? (await latestPendingDelta(roomId, actorId))?.id;
    if (!targetId) {
      throw new Error(`No pending delta found for actor ${actorId} in room ${roomId}.`);
    }
    const result = await requestJson<any>(`/api/rooms/${roomId}/agent-deltas/${targetId}/promote`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    });
    return toolText(`Promoted delta ${targetId}.`, result);
  },
);

server.registerTool(
  "georg_synthesize_now",
  {
    title: "Synthesize now",
    description: "Trigger the orchestrator synthesis for the room immediately.",
    inputSchema: {
      roomId: z.string(),
      actorId: z.string(),
    },
  },
  async ({ roomId, actorId }) => {
    const result = await requestJson<any>(`/api/rooms/${roomId}/synthesize`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    });
    return toolText("Triggered synthesis.", result);
  },
);

server.registerTool(
  "georg_resolve_alignment_node",
  {
    title: "Resolve alignment node",
    description: "Resolve a blocker as agreement, dissent, or non-blocking.",
    inputSchema: {
      roomId: z.string(),
      actorId: z.string(),
      nodeId: z.string(),
      resolution: z.enum(resolutionTypes),
      note: z.string().optional(),
    },
  },
  async ({ roomId, actorId, nodeId, resolution, note }) => {
    const result = await requestJson<any>(`/api/rooms/${roomId}/alignment/${nodeId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ actorId, resolution, note }),
    });
    return toolText(`Resolved alignment node ${nodeId}.`, result);
  },
);

server.registerTool(
  "georg_claim_scope",
  {
    title: "Claim scope",
    description: "Claim an ADR section or plan item for editing.",
    inputSchema: {
      roomId: z.string(),
      actorId: z.string(),
      scopeType: z.enum(claimScopeTypes),
      scopeId: z.string(),
    },
  },
  async ({ roomId, actorId, scopeType, scopeId }) => {
    const claim = await requestJson<any>(`/api/rooms/${roomId}/claims`, {
      method: "POST",
      body: JSON.stringify({ actorId, scopeType, scopeId }),
    });
    return toolText(`Claimed ${scopeType}:${scopeId}.`, claim);
  },
);

server.registerTool(
  "georg_release_scope",
  {
    title: "Release scope",
    description: "Release an ADR section or plan item claim.",
    inputSchema: {
      roomId: z.string(),
      actorId: z.string(),
      scopeType: z.enum(claimScopeTypes),
      scopeId: z.string(),
    },
  },
  async ({ roomId, actorId, scopeType, scopeId }) => {
    const url = `/api/rooms/${roomId}/claims?actorId=${encodeURIComponent(actorId)}&scopeType=${encodeURIComponent(scopeType)}&scopeId=${encodeURIComponent(scopeId)}`;
    const result = await requestJson<any>(url, {
      method: "DELETE",
    });
    return toolText(`Released ${scopeType}:${scopeId}.`, result);
  },
);

server.registerTool(
  "georg_update_adr_section",
  {
    title: "Update ADR section",
    description: "Write text into an ADR section. The actor must hold the section claim.",
    inputSchema: {
      roomId: z.string(),
      actorId: z.string(),
      section: z.enum(adrSectionOrder),
      text: z.string(),
    },
  },
  async ({ roomId, actorId, section, text }) => {
    const adr = await requestJson<any>(`/api/rooms/${roomId}/adr/sections/${section}`, {
      method: "POST",
      body: JSON.stringify({ actorId, text }),
    });
    return toolText(`Updated ADR section ${section}.`, adr);
  },
);

server.registerTool(
  "georg_review_adr_section",
  {
    title: "Review ADR section",
    description: "Mark an ADR section as reviewed by the actor.",
    inputSchema: {
      roomId: z.string(),
      actorId: z.string(),
      section: z.enum(adrSectionOrder),
    },
  },
  async ({ roomId, actorId, section }) => {
    const adr = await requestJson<any>(`/api/rooms/${roomId}/adr/sections/${section}/review`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    });
    return toolText(`Reviewed ADR section ${section}.`, adr);
  },
);

server.registerTool(
  "georg_regenerate_adr_section",
  {
    title: "Regenerate ADR section",
    description: "Ask georg to regenerate an ADR section from the current room state.",
    inputSchema: {
      roomId: z.string(),
      actorId: z.string(),
      section: z.enum(adrSectionOrder),
    },
  },
  async ({ roomId, actorId, section }) => {
    const adr = await requestJson<any>(`/api/rooms/${roomId}/adr/sections/${section}/regenerate`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    });
    return toolText(`Regenerated ADR section ${section}.`, adr);
  },
);

server.registerTool(
  "georg_approve_adr",
  {
    title: "Approve ADR",
    description: "Approve the ADR as a decision owner.",
    inputSchema: {
      roomId: z.string(),
      actorId: z.string(),
    },
  },
  async ({ roomId, actorId }) => {
    const adr = await requestJson<any>(`/api/rooms/${roomId}/adr/approve`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    });
    return toolText("Approved ADR.", adr);
  },
);

server.registerTool(
  "georg_generate_plan",
  {
    title: "Generate plan",
    description: "Generate the implementation plan from an approved ADR.",
    inputSchema: {
      roomId: z.string(),
      actorId: z.string(),
    },
  },
  async ({ roomId, actorId }) => {
    const plan = await requestJson<any>(`/api/rooms/${roomId}/plan/generate`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    });
    return toolText("Generated plan.", plan);
  },
);

server.registerTool(
  "georg_accept_plan_owner",
  {
    title: "Accept plan owner",
    description: "Accept ownership for one workstream in the generated plan.",
    inputSchema: {
      roomId: z.string(),
      actorId: z.string(),
      itemId: z.string(),
    },
  },
  async ({ roomId, actorId, itemId }) => {
    const plan = await requestJson<any>(`/api/rooms/${roomId}/plan/items/${itemId}/accept-owner`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    });
    return toolText(`Accepted plan owner for ${itemId}.`, plan);
  },
);

server.registerTool(
  "georg_accept_all_plan_owners",
  {
    title: "Accept all plan owners",
    description: "Accept ownership for every generated workstream as the current actor.",
    inputSchema: {
      roomId: z.string(),
      actorId: z.string(),
    },
  },
  async ({ roomId, actorId }) => {
    const snapshot = await getRoomSnapshot(roomId, actorId);
    const accepted: string[] = [];
    for (const item of snapshot.plan.workstreams as Array<{ id: string }>) {
      await requestJson<any>(`/api/rooms/${roomId}/plan/items/${item.id}/accept-owner`, {
        method: "POST",
        body: JSON.stringify({ actorId }),
      });
      accepted.push(item.id);
    }
    return toolText("Accepted all plan owners.", {
      roomId,
      actorId,
      acceptedItemIds: accepted,
    });
  },
);

server.registerTool(
  "georg_approve_plan",
  {
    title: "Approve plan",
    description: "Approve the generated plan as a decision owner.",
    inputSchema: {
      roomId: z.string(),
      actorId: z.string(),
    },
  },
  async ({ roomId, actorId }) => {
    const plan = await requestJson<any>(`/api/rooms/${roomId}/plan/approve`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    });
    return toolText("Approved plan.", plan);
  },
);

server.registerTool(
  "georg_generate_handoff",
  {
    title: "Generate handoff",
    description: "Generate the handoff package after ADR and plan approval.",
    inputSchema: {
      roomId: z.string(),
      actorId: z.string(),
    },
  },
  async ({ roomId, actorId }) => {
    const handoff = await requestJson<any>(`/api/rooms/${roomId}/handoff/generate`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    });
    return toolText("Generated handoff package.", handoff);
  },
);

server.registerTool(
  "georg_get_adr",
  {
    title: "Get ADR detail",
    description: "Fetch the ADR detail for a room.",
    inputSchema: {
      roomId: z.string(),
    },
  },
  async ({ roomId }) => {
    const adr = await requestJson<any>(`/api/adrs/${roomId}`);
    return toolText(`ADR for room ${roomId}.`, adr);
  },
);

server.registerTool(
  "georg_get_plan",
  {
    title: "Get plan detail",
    description: "Fetch the generated plan detail for a room.",
    inputSchema: {
      roomId: z.string(),
    },
  },
  async ({ roomId }) => {
    const plan = await requestJson<any>(`/api/plans/${roomId}`);
    return toolText(`Plan for room ${roomId}.`, plan);
  },
);

server.registerTool(
  "georg_get_handoff",
  {
    title: "Get handoff detail",
    description: "Fetch the generated handoff package for a room.",
    inputSchema: {
      roomId: z.string(),
    },
  },
  async ({ roomId }) => {
    const handoff = await requestJson<any>(`/api/handoff/${roomId}`);
    return toolText(`Handoff for room ${roomId}.`, handoff);
  },
);

server.registerTool(
  "georg_list_alignment_nodes",
  {
    title: "List alignment nodes",
    description: "List alignment nodes in a room, optionally filtered by type.",
    inputSchema: {
      roomId: z.string(),
      viewerId: z.string().optional(),
      type: z.enum(alignmentNodeTypes).optional(),
    },
  },
  async ({ roomId, viewerId, type }) => {
    const snapshot = await getRoomSnapshot(roomId, viewerId);
    const nodes = type
      ? snapshot.alignmentNodes.filter((node: { type: string }) => node.type === type)
      : snapshot.alignmentNodes;
    return toolText(`Alignment nodes for room ${roomId}.`, {
      roomId,
      type: type ?? null,
      nodes,
    });
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
