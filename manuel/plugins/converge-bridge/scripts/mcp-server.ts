import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = process.env.CONVERGE_ROOM_API_URL ?? "http://localhost:3001";

const participantSchema = z.enum(["maya", "alex"]);
const deltaTypeSchema = z.enum([
  "goal",
  "constraint",
  "option",
  "risk",
  "tradeoff",
  "open_question",
  "evidence",
  "reuse_candidate"
]);

const server = new McpServer({
  name: "converge-bridge",
  version: "0.1.0"
});

server.registerTool(
  "connect_participant",
  {
    description: "Mark a Converge participant lane as connected to the local bridge.",
    inputSchema: {
      participantId: participantSchema.describe("The participant lane to connect."),
      displayName: z.string().optional().describe("Optional display name override.")
    }
  },
  async ({ participantId, displayName }) => {
    const response = await fetchJson("/plugin/connect", {
      method: "POST",
      body: JSON.stringify({ participantId, displayName })
    });

    return {
      content: [
        {
          type: "text",
          text: `Connected ${participantId} to Converge.`
        }
      ],
      structuredContent: response
    };
  }
);

server.registerTool(
  "publish_delta",
  {
    description: "Publish one approved structured delta from a participant lane into the shared Converge room.",
    inputSchema: {
      participantId: participantSchema.describe("The participant lane publishing into the room."),
      type: deltaTypeSchema.describe("The typed delta category."),
      text: z.string().min(1).describe("The delta text to publish."),
      confidence: z.number().min(0).max(1).optional().describe("Optional confidence score between 0 and 1."),
      source: z.string().optional().describe("Optional source label for the shared delta.")
    }
  },
  async ({ participantId, type, text, confidence, source }) => {
    const payload = {
      participantId,
      delta: {
        type,
        text,
        source: source ?? `${participantId}-plugin`,
        confidence: confidence ?? 0.85
      }
    };

    const response = await fetchJson("/plugin/publish-delta", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    return {
      content: [
        {
          type: "text",
          text: `Published a ${type.replaceAll("_", " ")} delta for ${participantId}.`
        }
      ],
      structuredContent: response
    };
  }
);

server.registerTool(
  "fetch_room",
  {
    description: "Fetch the current Converge room state, including phase, synthesis, decision, and participant lane data."
  },
  async () => {
    const room = await fetchJson("/room");
    const summary = [
      `Phase: ${room.phase}`,
      `Synthesis: ${room.synthesisTitle}`,
      room.decision ? `Decision: ${room.decision}` : "Decision: not yet resolved"
    ].join("\n");

    return {
      content: [
        {
          type: "text",
          text: summary
        }
      ],
      structuredContent: room
    };
  }
);

server.registerTool(
  "acknowledge_packet",
  {
    description: "Acknowledge a routed conflict packet for a participant lane.",
    inputSchema: {
      participantId: participantSchema.describe("The participant acknowledging the packet."),
      packetId: z.string().min(1).describe("The packet id to acknowledge.")
    }
  },
  async ({ participantId, packetId }) => {
    const response = await fetchJson("/plugin/ack", {
      method: "POST",
      body: JSON.stringify({ participantId, packetId })
    });

    return {
      content: [
        {
          type: "text",
          text: `Acknowledged packet ${packetId} for ${participantId}.`
        }
      ],
      structuredContent: response
    };
  }
);

server.registerTool(
  "reset_room",
  {
    description: "Reset the seeded Converge demo room to its initial state."
  },
  async () => {
    const response = await fetchJson("/demo/reset", {
      method: "POST"
    });

    return {
      content: [
        {
          type: "text",
          text: "Reset the Converge room."
        }
      ],
      structuredContent: response
    };
  }
);

async function fetchJson(path: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`Converge room request failed (${response.status} ${response.statusText})`);
  }

  return response.json();
}

const transport = new StdioServerTransport();

server.connect(transport).catch((error) => {
  console.error("Failed to start Converge MCP server:", error);
  process.exit(1);
});
