import fs from "node:fs";
import path from "node:path";
import type { ServerWebSocket } from "bun";

import { isAdrSectionKey } from "@shared/contracts";

import { OpenAiResponsesAdapter } from "./openai-provider";
import { HeuristicAiAdapter } from "./engine";
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

type SocketData = {
  roomId: string;
  participantId?: string;
};

const subscriptions = new Map<string, Set<ServerWebSocket<SocketData>>>();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function errorResponse(error: unknown, status = 400) {
  return json({ error: error instanceof Error ? error.message : "Unknown error" }, status);
}

async function parseBody(request: Request) {
  return (await request.json()) as Record<string, any>;
}

function broadcast(roomId: string, payload: Record<string, unknown>) {
  const sockets = subscriptions.get(roomId);
  if (!sockets) {
    return;
  }
  const message = JSON.stringify(payload);
  for (const socket of sockets) {
    socket.send(message);
  }
}

function register(socket: ServerWebSocket<SocketData>) {
  const roomId = socket.data.roomId;
  const sockets = subscriptions.get(roomId) ?? new Set<ServerWebSocket<SocketData>>();
  sockets.add(socket);
  subscriptions.set(roomId, sockets);
}

function unregister(socket: ServerWebSocket<SocketData>) {
  const roomId = socket.data.roomId;
  const sockets = subscriptions.get(roomId);
  if (!sockets) {
    return;
  }
  sockets.delete(socket);
  if (sockets.size === 0) {
    subscriptions.delete(roomId);
  }
}

function serveStatic(request: Request) {
  const staticDir = process.env.APP_STATIC_DIR;
  if (!staticDir) {
    return null;
  }
  const url = new URL(request.url);
  const baseDir = path.resolve(process.cwd(), staticDir);
  const requestedPath = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const filePath = path.resolve(baseDir, requestedPath);
  if (filePath !== path.join(baseDir, "index.html") && !filePath.startsWith(`${baseDir}${path.sep}`)) {
    return errorResponse("Route not found", 404);
  }
  if (fs.existsSync(filePath)) {
    return new Response(Bun.file(filePath));
  }
  const indexFile = Bun.file(path.join(baseDir, "index.html"));
  return new Response(indexFile);
}

setInterval(() => {
  const roomIds = store.releaseExpiredClaims();
  for (const roomId of roomIds) {
    broadcast(roomId, { type: "room.invalidate", roomId });
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
      if (await serverRef.upgrade(request, { data: { roomId, participantId } })) {
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

      if (parts[0] === "api" && parts[1] === "rooms" && request.method === "GET" && parts.length === 2) {
        return json(store.listRooms());
      }

      if (parts[0] === "api" && parts[1] === "rooms" && request.method === "POST" && parts.length === 2) {
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

      if (parts[0] === "api" && parts[1] === "rooms" && parts[2] && request.method === "GET" && parts.length === 3) {
        return json(store.getRoomSnapshot(parts[2], url.searchParams.get("viewerId") ?? undefined));
      }

      if (parts[0] === "api" && parts[1] === "rooms" && parts[2] && parts[3] === "join" && request.method === "POST") {
        const body = await parseBody(request);
        const participant = store.joinRoom(parts[2], body.displayName, body.role);
        if (participant.role === "decision_owner") {
          store.addDecisionOwner(parts[2], participant.id);
        }
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
        return json(participant, 201);
      }

      if (parts[0] === "api" && parts[1] === "rooms" && parts[2] && parts[3] === "mode" && request.method === "POST") {
        const body = await parseBody(request);
        const room = store.setRoomMode(parts[2], body.actorId, body.mode);
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
        return json(room);
      }

      if (parts[0] === "api" && parts[1] === "rooms" && parts[2] && parts[3] === "utterances" && request.method === "POST") {
        const body = await parseBody(request);
        await store.addUtterance(parts[2], body.actorId, body.text);
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
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
        const result = store.resolveAlignmentNode(parts[2], body.actorId, parts[4], body.resolution, body.note);
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
        return json(result ?? { ok: true });
      }

      if (parts[0] === "api" && parts[1] === "rooms" && parts[2] && parts[3] === "synthesize" && request.method === "POST") {
        const body = await parseBody(request);
        await store.synthesizeNow(parts[2], body.actorId);
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
        return json({ ok: true });
      }

      if (parts[0] === "api" && parts[1] === "rooms" && parts[2] && parts[3] === "agent-deltas" && request.method === "POST" && parts.length === 4) {
        const body = await parseBody(request);
        const delta = store.submitAgentDelta(parts[2], body.actorId, body.sourceAgent, body.text, body.type);
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
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
        await store.promoteAgentDelta(parts[2], body.actorId, parts[4]);
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
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
        store.discardAgentDelta(parts[2], body.actorId, parts[4]);
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
        return json({ ok: true });
      }

      if (parts[0] === "api" && parts[1] === "rooms" && parts[2] && parts[3] === "claims" && request.method === "POST") {
        const body = await parseBody(request);
        const claim = store.claimScope(parts[2], body.actorId, body.scopeType, body.scopeId);
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
        return json(claim);
      }

      if (parts[0] === "api" && parts[1] === "rooms" && parts[2] && parts[3] === "claims" && request.method === "DELETE") {
        store.releaseScope(
          parts[2],
          url.searchParams.get("actorId") ?? "system",
          url.searchParams.get("scopeType") as "adr_section" | "plan_item",
          url.searchParams.get("scopeId") ?? "",
        );
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
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
        const adr = store.updateAdrSection(parts[2], body.actorId, parts[5], body.text);
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
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
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
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
        const adr = await store.regenerateAdrSection(parts[2], body.actorId, parts[5]);
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
        return json(adr);
      }

      if (parts[0] === "api" && parts[1] === "rooms" && parts[2] && parts[3] === "adr" && parts[4] === "approve" && request.method === "POST") {
        const body = await parseBody(request);
        const adr = store.approveAdr(parts[2], body.actorId);
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
        return json(adr);
      }

      if (parts[0] === "api" && parts[1] === "rooms" && parts[2] && parts[3] === "plan" && parts[4] === "generate" && request.method === "POST") {
        const body = await parseBody(request);
        const plan = await store.generatePlan(parts[2], body.actorId);
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
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
        const plan = store.updatePlanItem(parts[2], body.actorId, parts[5], body.patch);
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
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
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
        return json(plan);
      }

      if (parts[0] === "api" && parts[1] === "rooms" && parts[2] && parts[3] === "plan" && parts[4] === "approve" && request.method === "POST") {
        const body = await parseBody(request);
        const plan = store.approvePlan(parts[2], body.actorId);
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
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
        broadcast(parts[2], { type: "room.invalidate", roomId: parts[2] });
        return json(handoff);
      }

      if (parts[0] === "api" && parts[1] === "adrs" && parts[2] && request.method === "GET") {
        return json(store.getAdrDetail(parts[2]));
      }

      if (parts[0] === "api" && parts[1] === "plans" && parts[2] && request.method === "GET") {
        return json(store.getPlanDetail(parts[2]));
      }

      if (parts[0] === "api" && parts[1] === "handoff" && parts[2] && request.method === "GET") {
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
      register(socket);
      socket.send(JSON.stringify({ type: "socket.ready", roomId: socket.data.roomId }));
    },
    close(socket) {
      unregister(socket);
    },
    message(socket, message) {
      if (message.toString() === "ping") {
        socket.send(JSON.stringify({ type: "pong" }));
      }
    },
  },
});

console.log(`Realtime alignment server listening on http://localhost:${server.port}`);
