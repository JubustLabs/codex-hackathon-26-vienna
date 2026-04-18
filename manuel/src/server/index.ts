import type { ServerWebSocket } from "bun";
import { initialRoomState } from "../demo-state";
import type { Delta, ParticipantId, RoomState } from "../types";
import { getOrchestratorMode, recomputeRoom } from "./orchestrator";

type SocketMessage =
  | { type: "room.state"; payload: RoomState }
  | { type: "packet.ack"; payload: { packetId: string; participantId: ParticipantId } };

type ConnectPayload = {
  participantId: ParticipantId;
  displayName?: string;
};

const clients = new Set<ServerWebSocket<any>>();
const roomState: RoomState = structuredClone(initialRoomState);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const resetRoomState = async () => {
  const fresh = structuredClone(initialRoomState);
  Object.assign(roomState, fresh);
  await recomputeRoom(roomState);
};

const connectPlugin = async (participantId: ParticipantId, displayName?: string) => {
  roomState.participants[participantId].pluginConnected = true;
  if (displayName) {
    roomState.participants[participantId].name = displayName;
  }
  await recomputeRoom(roomState);
  broadcastState();
};

const makeDelta = (participantId: ParticipantId, delta: Omit<Delta, "id" | "participantId">): Delta => ({
  id: `${participantId}-${Date.now()}`,
  participantId,
  ...delta
});

const acknowledgePacket = async (participantId: ParticipantId, packetId: string) => {
  roomState.participants[participantId].packets = roomState.participants[participantId].packets.map((packet) =>
    packet.id === packetId ? { ...packet, acknowledged: true } : packet
  );
  await recomputeRoom(roomState);
  broadcastState();
};

const publishDelta = async (participantId: ParticipantId, deltaInput: Omit<Delta, "id" | "participantId">) => {
  const delta = makeDelta(participantId, deltaInput);
  roomState.participants[participantId].published.push(delta);
  await recomputeRoom(roomState);
  broadcastState();
  return delta;
};

const broadcastState = () => {
  const message = JSON.stringify({ type: "room.state", payload: roomState satisfies RoomState });
  for (const client of clients) {
    client.send(message);
  }
};

const json = (payload: unknown, init?: ResponseInit) =>
  Response.json(payload, {
    ...init,
    headers: {
      ...corsHeaders,
      ...(init?.headers ?? {})
    }
  });

await recomputeRoom(roomState);

const server = Bun.serve({
  port: 3001,
  idleTimeout: 255,
  async fetch(req, server) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (url.pathname === "/health") {
      return json({ ok: true, orchestratorMode: getOrchestratorMode() });
    }

    if (url.pathname === "/room") {
      return json(roomState);
    }

    if (url.pathname === "/ws") {
      const success = server.upgrade(req);
      return success ? undefined : new Response("Upgrade failed", { status: 400 });
    }

    if (req.method === "POST" && url.pathname === "/plugin/connect") {
      const payload = (await req.json()) as ConnectPayload;
      await connectPlugin(payload.participantId, payload.displayName);
      return json({ ok: true });
    }

    if (req.method === "POST" && url.pathname === "/plugin/publish-delta") {
      const payload = (await req.json()) as { participantId: ParticipantId; delta: Omit<Delta, "id" | "participantId"> };
      const delta = await publishDelta(payload.participantId, payload.delta);
      return json({ ok: true, delta });
    }

    if (req.method === "POST" && url.pathname === "/plugin/ack") {
      const payload = (await req.json()) as { participantId: ParticipantId; packetId: string };
      await acknowledgePacket(payload.participantId, payload.packetId);
      return json({ ok: true });
    }

    if (req.method === "POST" && url.pathname === "/demo/reset") {
      await resetRoomState();
      broadcastState();
      return json({ ok: true });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
  websocket: {
    open(ws) {
      clients.add(ws);
      ws.send(JSON.stringify({ type: "room.state", payload: roomState }));
    },
    async message(ws, message) {
      try {
        const parsed = JSON.parse(message.toString()) as SocketMessage;
        if (parsed.type === "packet.ack") {
          await acknowledgePacket(parsed.payload.participantId, parsed.payload.packetId);
        }
      } catch {
        ws.send(JSON.stringify({ type: "error", payload: { message: "Invalid message" } }));
      }
    },
    close(ws) {
      clients.delete(ws);
    }
  }
});

console.log(
  `Converge server running at http://localhost:${server.port} using ${getOrchestratorMode()} orchestrator`
);
