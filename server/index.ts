import fs from "node:fs";
import path from "node:path";
import type { ServerWebSocket } from "bun";

import {
  isAdrSectionKey,
  type AgentDeltaAcceptedMessage,
  type AgentDeltaStatusMessage,
  type AgentSocketClientMessage,
  type AgentSocketServerMessage,
  type PendingAgentDelta,
  type RoomInvalidateMessage,
  type RoomSocketServerMessage,
  type SocketErrorMessage,
} from "@shared/contracts";

import { HeuristicAiAdapter } from "./engine";
import { OpenAiResponsesAdapter } from "./openai-provider";
import type { AiAdapter } from "./provider";
import { AppStore } from "./store";

class MissingOpenAiAdapter implements AiAdapter {
  private readonly error = new Error(
    "OPENAI_API_KEY is required for the OpenAI-backed POC. Set ALLOW_LOCAL_HEURISTIC_FALLBACK=1 only for local smoke testing.",
  );

  async classifyUtterance(): Promise<never> {
    throw this.error;
  }

  async synthesize(): Promise<never> {
    throw this.error;
  }

  async draftAdrSection(): Promise<never> {
    throw this.error;
  }

  async generatePlan(): Promise<never> {
    throw this.error;
  }
}

function createAdapter(): AiAdapter {
  if (process.env.ALLOW_LOCAL_HEURISTIC_FALLBACK === "1") {
    return new HeuristicAiAdapter();
  }
  if (process.env.OPENAI_API_KEY) {
    return new OpenAiResponsesAdapter(process.env.OPENAI_API_KEY);
  }
  return new MissingOpenAiAdapter();
}

const adapter = createAdapter();
const store = new AppStore(adapter);

type RoomSocketData = {
  channel: "room";
  roomId: string;
  participantId?: string;
};

type AgentSocketData = {
  channel: "agent";
  roomId: string;
  participantId: string;
  sourceAgent: string;
};

type SocketData = RoomSocketData | AgentSocketData;

const roomSubscriptions = new Map<string, Set<ServerWebSocket<SocketData>>>();
const agentSubscriptions = new Map<string, Set<ServerWebSocket<SocketData>>>();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function errorResponse(error: unknown, status = 400) {
  return json(
    { error: error instanceof Error ? error.message : "Unknown error" },
    status,
  );
}

async function parseBody(request: Request) {
  return (await request.json()) as Record<string, any>;
}

function sendMessage(
  socket: ServerWebSocket<SocketData>,
  payload: RoomSocketServerMessage | AgentSocketServerMessage,
) {
  socket.send(JSON.stringify(payload));
}

function registerSubscription(socket: ServerWebSocket<SocketData>) {
  const subscriptions =
    socket.data.channel === "agent" ? agentSubscriptions : roomSubscriptions;
  const sockets =
    subscriptions.get(socket.data.roomId) ??
    new Set<ServerWebSocket<SocketData>>();
  sockets.add(socket);
  subscriptions.set(socket.data.roomId, sockets);
}

function unregisterSubscription(socket: ServerWebSocket<SocketData>) {
  const subscriptions =
    socket.data.channel === "agent" ? agentSubscriptions : roomSubscriptions;
  const sockets = subscriptions.get(socket.data.roomId);
  if (!sockets) {
    return;
  }
  sockets.delete(socket);
  if (sockets.size === 0) {
    subscriptions.delete(socket.data.roomId);
  }
}

function broadcastRoom(roomId: string, payload: RoomSocketServerMessage) {
  const sockets = roomSubscriptions.get(roomId);
  if (!sockets) {
    return;
  }
  for (const socket of sockets) {
    sendMessage(socket, payload);
  }
}

function broadcastAgent(
  roomId: string,
  payload: AgentSocketServerMessage,
  participantId?: string,
) {
  const sockets = agentSubscriptions.get(roomId);
  if (!sockets) {
    return;
  }
  for (const socket of sockets) {
    if (socket.data.channel !== "agent") {
      continue;
    }
    if (participantId && socket.data.participantId !== participantId) {
      continue;
    }
    sendMessage(socket, payload);
  }
}

function invalidateRoom(roomId: string, reason?: string) {
  const payload: RoomInvalidateMessage = {
    type: "room.invalidate",
    roomId,
    reason,
  };
  broadcastRoom(roomId, payload);
  broadcastAgent(roomId, payload);
}

function emitAgentDeltaStatus(delta: PendingAgentDelta) {
  const payload: AgentDeltaStatusMessage = {
    type: "agent.delta.status",
    roomId: delta.roomId,
    participantId: delta.ownerId,
    status: delta.status,
    delta,
  };
  broadcastAgent(delta.roomId, payload, delta.ownerId);
}

function sendAgentError(
  socket: ServerWebSocket<SocketData>,
  error: unknown,
  requestId?: string,
) {
  const payload: SocketErrorMessage = {
    type: "socket.error",
    error: error instanceof Error ? error.message : "Unknown error",
    requestId,
  };
  sendMessage(socket, payload);
}

function serveStatic(request: Request) {
  const staticDir = process.env.APP_STATIC_DIR;
  if (!staticDir) {
    return null;
  }
  const url = new URL(request.url);
  const baseDir = path.resolve(process.cwd(), staticDir);
  const requestedPath =
    url.pathname === "/"
      ? "index.html"
      : decodeURIComponent(url.pathname.slice(1));
  const filePath = path.resolve(baseDir, requestedPath);
  if (
    filePath !== path.join(baseDir, "index.html") &&
    !filePath.startsWith(`${baseDir}${path.sep}`)
  ) {
    return errorResponse("Route not found", 404);
  }
  if (fs.existsSync(filePath)) {
    return new Response(Bun.file(filePath));
  }
  const indexFile = Bun.file(path.join(baseDir, "index.html"));
  return new Response(indexFile);
}

async function handleAgentSocketMessage(
  socket: ServerWebSocket<SocketData>,
  rawMessage: string,
) {
  let payload: AgentSocketClientMessage;

  try {
    payload =
      rawMessage === "ping"
        ? { type: "ping" }
        : (JSON.parse(rawMessage) as AgentSocketClientMessage);
  } catch {
    sendAgentError(socket, "Agent messages must be valid JSON.");
    return;
  }

  if (payload.type === "ping") {
    sendMessage(socket, { type: "pong" });
    return;
  }

  if (socket.data.channel !== "agent") {
    return;
  }

  try {
    const delta = store.submitAgentDelta(
      socket.data.roomId,
      socket.data.participantId,
      payload.sourceAgent ?? socket.data.sourceAgent,
      payload.text,
      payload.deltaType ?? "agent_insight",
      payload.confidence,
    );
    const accepted: AgentDeltaAcceptedMessage = {
      type: "agent.delta.accepted",
      requestId: payload.requestId,
      roomId: delta.roomId,
      participantId: delta.ownerId,
      delta,
    };
    sendMessage(socket, accepted);
    emitAgentDeltaStatus(delta);
    invalidateRoom(delta.roomId, "agent_delta_submitted");
  } catch (error) {
    sendAgentError(socket, error, payload.requestId);
  }
}

setInterval(() => {
  const roomIds = store.releaseExpiredClaims();
  for (const roomId of roomIds) {
    invalidateRoom(roomId, "claim_expired");
  }
}, 5_000);

const server = Bun.serve<SocketData>({
  port: Number(process.env.PORT ?? 3001),
  fetch: async (request, serverRef) => {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);

    if (url.pathname === "/ws") {
      const roomId = url.searchParams.get("roomId");
      const participantId = url.searchParams.get("participantId") ?? undefined;
      if (!roomId) {
        return errorResponse("roomId is required", 400);
      }
      if (
        await serverRef.upgrade(request, {
          data: { channel: "room", roomId, participantId },
        })
      ) {
        return;
      }
      return errorResponse("WebSocket upgrade failed", 500);
    }

    if (url.pathname === "/agent-ws") {
      const roomId = url.searchParams.get("roomId");
      const participantId = url.searchParams.get("participantId");
      const sourceAgent =
        url.searchParams.get("sourceAgent")?.trim() || "codex-room-bridge";
      if (!roomId) {
        return errorResponse("roomId is required", 400);
      }
      if (!participantId) {
        return errorResponse("participantId is required", 400);
      }
      if (
        await serverRef.upgrade(request, {
          data: { channel: "agent", roomId, participantId, sourceAgent },
        })
      ) {
        return;
      }
      return errorResponse("WebSocket upgrade failed", 500);
    }

    try {
      if (url.pathname === "/api/bootstrap" && request.method === "GET") {
        return json({
          rooms: store.listRooms(),
          guardrails: store.getGuardrails(),
          patterns: store.getPatterns(),
          components: store.getComponents(),
        });
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        request.method === "GET" &&
        parts.length === 2
      ) {
        return json(store.listRooms());
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        request.method === "POST" &&
        parts.length === 2
      ) {
        const body = await parseBody(request);
        const room = store.createRoom({
          topic: body.topic,
          decision: body.decision,
          goal: body.goal,
          nonGoals: body.nonGoals,
          scope: body.scope,
          successBar: body.successBar,
          topicTags: body.topicTags ?? [],
          decisionOwnerIds: [],
        });
        return json(room, 201);
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        request.method === "GET" &&
        parts.length === 3
      ) {
        return json(
          store.getRoomSnapshot(
            parts[2],
            url.searchParams.get("viewerId") ?? undefined,
          ),
        );
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "join" &&
        request.method === "POST"
      ) {
        const body = await parseBody(request);
        const participant = store.joinRoom(
          parts[2],
          body.displayName,
          body.role,
        );
        if (participant.role === "decision_owner") {
          store.addDecisionOwner(parts[2], participant.id);
        }
        invalidateRoom(parts[2], "participant_joined");
        return json(participant, 201);
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "mode" &&
        request.method === "POST"
      ) {
        const body = await parseBody(request);
        const room = store.setRoomMode(parts[2], body.actorId, body.mode);
        invalidateRoom(parts[2], "room_mode_changed");
        return json(room);
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "utterances" &&
        request.method === "POST"
      ) {
        const body = await parseBody(request);
        await store.addUtterance(parts[2], body.actorId, body.text);
        invalidateRoom(parts[2], "utterance_created");
        return json({ ok: true }, 201);
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "alignment" &&
        parts[4] &&
        parts[5] === "resolve" &&
        request.method === "POST"
      ) {
        const body = await parseBody(request);
        const result = store.resolveAlignmentNode(
          parts[2],
          body.actorId,
          parts[4],
          body.resolution,
          body.note,
        );
        invalidateRoom(parts[2], "alignment_node_resolved");
        return json(result ?? { ok: true });
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "synthesize" &&
        request.method === "POST"
      ) {
        const body = await parseBody(request);
        await store.synthesizeNow(parts[2], body.actorId);
        invalidateRoom(parts[2], "orchestrator_update");
        return json({ ok: true });
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "agent-deltas" &&
        request.method === "POST" &&
        parts.length === 4
      ) {
        const body = await parseBody(request);
        const delta = store.submitAgentDelta(
          parts[2],
          body.actorId,
          body.sourceAgent,
          body.text,
          body.type,
          body.confidence,
        );
        emitAgentDeltaStatus(delta);
        invalidateRoom(parts[2], "agent_delta_submitted");
        return json(delta, 201);
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "agent-deltas" &&
        parts[4] &&
        parts[5] === "promote" &&
        request.method === "POST"
      ) {
        const body = await parseBody(request);
        const { delta } = await store.promoteAgentDelta(
          parts[2],
          body.actorId,
          parts[4],
        );
        emitAgentDeltaStatus(delta);
        invalidateRoom(parts[2], "agent_delta_promoted");
        return json({ ok: true });
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "agent-deltas" &&
        parts[4] &&
        parts[5] === "discard" &&
        request.method === "POST"
      ) {
        const body = await parseBody(request);
        const delta = store.discardAgentDelta(parts[2], body.actorId, parts[4]);
        emitAgentDeltaStatus(delta);
        invalidateRoom(parts[2], "agent_delta_discarded");
        return json({ ok: true });
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "claims" &&
        request.method === "POST"
      ) {
        const body = await parseBody(request);
        const claim = store.claimScope(
          parts[2],
          body.actorId,
          body.scopeType,
          body.scopeId,
        );
        invalidateRoom(parts[2], "claim_updated");
        return json(claim);
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "claims" &&
        request.method === "DELETE"
      ) {
        store.releaseScope(
          parts[2],
          url.searchParams.get("actorId") ?? "system",
          url.searchParams.get("scopeType") as "adr_section" | "plan_item",
          url.searchParams.get("scopeId") ?? "",
        );
        invalidateRoom(parts[2], "claim_released");
        return json({ ok: true });
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "adr" &&
        parts[4] === "sections" &&
        parts[5] &&
        request.method === "POST" &&
        parts.length === 6
      ) {
        const body = await parseBody(request);
        if (!isAdrSectionKey(parts[5])) {
          return errorResponse("Unknown ADR section", 400);
        }
        const adr = store.updateAdrSection(
          parts[2],
          body.actorId,
          parts[5],
          body.text,
        );
        invalidateRoom(parts[2], "adr_section_updated");
        return json(adr);
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "adr" &&
        parts[4] === "sections" &&
        parts[5] &&
        parts[6] === "review" &&
        request.method === "POST"
      ) {
        const body = await parseBody(request);
        if (!isAdrSectionKey(parts[5])) {
          return errorResponse("Unknown ADR section", 400);
        }
        const adr = store.reviewAdrSection(parts[2], body.actorId, parts[5]);
        invalidateRoom(parts[2], "adr_section_reviewed");
        return json(adr);
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "adr" &&
        parts[4] === "sections" &&
        parts[5] &&
        parts[6] === "regenerate" &&
        request.method === "POST"
      ) {
        const body = await parseBody(request);
        if (!isAdrSectionKey(parts[5])) {
          return errorResponse("Unknown ADR section", 400);
        }
        const adr = await store.regenerateAdrSection(
          parts[2],
          body.actorId,
          parts[5],
        );
        invalidateRoom(parts[2], "adr_section_regenerated");
        return json(adr);
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "adr" &&
        parts[4] === "approve" &&
        request.method === "POST"
      ) {
        const body = await parseBody(request);
        const adr = store.approveAdr(parts[2], body.actorId);
        invalidateRoom(parts[2], "adr_approved");
        return json(adr);
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "plan" &&
        parts[4] === "generate" &&
        request.method === "POST"
      ) {
        const body = await parseBody(request);
        const plan = await store.generatePlan(parts[2], body.actorId);
        invalidateRoom(parts[2], "plan_generated");
        return json(plan);
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "plan" &&
        parts[4] === "items" &&
        parts[5] &&
        request.method === "POST" &&
        parts.length === 6
      ) {
        const body = await parseBody(request);
        const plan = store.updatePlanItem(
          parts[2],
          body.actorId,
          parts[5],
          body.patch,
        );
        invalidateRoom(parts[2], "plan_item_updated");
        return json(plan);
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "plan" &&
        parts[4] === "items" &&
        parts[5] &&
        parts[6] === "accept-owner" &&
        request.method === "POST"
      ) {
        const body = await parseBody(request);
        const plan = store.acceptPlanOwner(parts[2], body.actorId, parts[5]);
        invalidateRoom(parts[2], "plan_owner_accepted");
        return json(plan);
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "plan" &&
        parts[4] === "approve" &&
        request.method === "POST"
      ) {
        const body = await parseBody(request);
        const plan = store.approvePlan(parts[2], body.actorId);
        invalidateRoom(parts[2], "plan_approved");
        return json(plan);
      }

      if (
        parts[0] === "api" &&
        parts[1] === "rooms" &&
        parts[2] &&
        parts[3] === "handoff" &&
        parts[4] === "generate" &&
        request.method === "POST"
      ) {
        const body = await parseBody(request);
        const handoff = store.generateHandoff(parts[2], body.actorId);
        invalidateRoom(parts[2], "handoff_generated");
        return json(handoff);
      }

      if (
        parts[0] === "api" &&
        parts[1] === "adrs" &&
        parts[2] &&
        request.method === "GET"
      ) {
        return json(store.getAdrDetail(parts[2]));
      }

      if (
        parts[0] === "api" &&
        parts[1] === "plans" &&
        parts[2] &&
        request.method === "GET"
      ) {
        return json(store.getPlanDetail(parts[2]));
      }

      if (
        parts[0] === "api" &&
        parts[1] === "handoff" &&
        parts[2] &&
        request.method === "GET"
      ) {
        return json(store.getHandoff(parts[2]));
      }

      const staticResponse = serveStatic(request);
      if (staticResponse) {
        return staticResponse;
      }

      return errorResponse("Route not found", 404);
    } catch (error) {
      return errorResponse(error);
    }
  },
  websocket: {
    open(socket) {
      registerSubscription(socket);
      if (socket.data.channel === "agent") {
        sendMessage(socket, {
          type: "agent.socket.ready",
          roomId: socket.data.roomId,
          participantId: socket.data.participantId,
          sourceAgent: socket.data.sourceAgent,
        });
        return;
      }
      sendMessage(socket, {
        type: "room.socket.ready",
        roomId: socket.data.roomId,
        participantId: socket.data.participantId,
      });
    },
    close(socket) {
      unregisterSubscription(socket);
    },
    async message(socket, message) {
      const rawMessage = message.toString();
      if (socket.data.channel === "agent") {
        await handleAgentSocketMessage(socket, rawMessage);
        return;
      }
      if (rawMessage === "ping") {
        sendMessage(socket, { type: "pong" });
      }
    },
  },
});

console.log(
  `Realtime alignment server listening on http://localhost:${server.port}`,
);
