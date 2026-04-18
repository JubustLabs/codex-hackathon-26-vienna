import readline from "node:readline";

import type { AgentSocketServerMessage } from "../../../georg/shared/contracts";

type Command = "submit" | "watch";

type Options = {
  roomId: string;
  participantId: string;
  sourceAgent: string;
  server: string;
  text?: string;
  deltaType: string;
  confidence?: number;
  follow: boolean;
};

function usage() {
  return `Usage:
  cd georg && just bridge-submit ROOM PARTICIPANT alice-codex "..."
  cd georg && just bridge-watch ROOM PARTICIPANT alice-codex

Options:
  --room-id          Room id from the browser UI
  --participant-id   Participant id from the browser UI
  --source-agent     Label shown in the room UI
  --server           Base server URL. Default: http://localhost:3001
  --text             One-shot delta text for submit, or optional initial message for watch
  --delta-type       Delta type stored with the submission. Default: agent_insight
  --confidence       Optional confidence between 0 and 1
  --follow           In submit mode, stay connected and print later status changes
`;
}

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv;
  if (command !== "submit" && command !== "watch") {
    throw new Error(usage());
  }

  const rawOptions = new Map<string, string | boolean>();
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--help" || arg === "-h") {
      throw new Error(usage());
    }
    if (arg === "--follow") {
      rawOptions.set("follow", true);
      continue;
    }
    const next = rest[index + 1];
    if (!arg.startsWith("--") || next === undefined || next.startsWith("--")) {
      throw new Error(`Invalid arguments.\n\n${usage()}`);
    }
    rawOptions.set(arg.slice(2), next);
    index += 1;
  }

  const confidenceValue = rawOptions.get("confidence");
  const confidence =
    typeof confidenceValue === "string" && confidenceValue.length > 0
      ? Number.parseFloat(confidenceValue)
      : undefined;
  if (
    confidence !== undefined &&
    (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)
  ) {
    throw new Error("confidence must be a number between 0 and 1");
  }

  const options: Options = {
    roomId: getOption(rawOptions, "room-id", "ROOM_ID"),
    participantId: getOption(rawOptions, "participant-id", "PARTICIPANT_ID"),
    sourceAgent: getOption(
      rawOptions,
      "source-agent",
      "SOURCE_AGENT",
      "codex-room-bridge",
    ),
    server: getOption(
      rawOptions,
      "server",
      "ROOM_SERVER_URL",
      "http://localhost:3001",
    ),
    text:
      (rawOptions.get("text") as string | undefined) ??
      process.env.AGENT_DELTA_TEXT,
    deltaType: getOption(
      rawOptions,
      "delta-type",
      "AGENT_DELTA_TYPE",
      "agent_insight",
    ),
    confidence,
    follow: rawOptions.get("follow") === true,
  };

  return { command, options };
}

function getOption(
  options: Map<string, string | boolean>,
  flag: string,
  envKey: string,
  fallback?: string,
) {
  const value = options.get(flag);
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  const envValue = process.env[envKey]?.trim();
  if (envValue) {
    return envValue;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`Missing --${flag} (or ${envKey}).`);
}

function buildSocketUrl(options: Options) {
  const base = new URL(
    options.server.includes("://")
      ? options.server
      : `http://${options.server}`,
  );
  if (base.protocol === "http:") {
    base.protocol = "ws:";
  } else if (base.protocol === "https:") {
    base.protocol = "wss:";
  }
  if (base.pathname === "/" || base.pathname.length === 0) {
    base.pathname = "/agent-ws";
  }
  base.searchParams.set("roomId", options.roomId);
  base.searchParams.set("participantId", options.participantId);
  base.searchParams.set("sourceAgent", options.sourceAgent);
  return base.toString();
}

function nextRequestId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function printServerMessage(message: AgentSocketServerMessage) {
  switch (message.type) {
    case "agent.socket.ready":
      console.log(
        `[ready] room=${message.roomId} participant=${message.participantId} source=${message.sourceAgent}`,
      );
      return;
    case "agent.delta.accepted":
      console.log(
        `[accepted] ${message.delta.id} ${message.delta.type} ${message.delta.text}`,
      );
      return;
    case "agent.delta.status":
      console.log(
        `[status] ${message.status} ${message.delta.id} ${message.delta.text}`,
      );
      return;
    case "room.invalidate":
      console.log(
        `[room] invalidate ${message.roomId}${message.reason ? ` (${message.reason})` : ""}`,
      );
      return;
    case "socket.error":
      console.error(`[error] ${message.error}`);
      return;
    case "pong":
      console.log("[pong]");
  }
}

async function runSubmit(options: Options) {
  if (!options.text?.trim()) {
    throw new Error("submit requires --text (or AGENT_DELTA_TEXT).");
  }

  const requestId = nextRequestId();
  const socket = new WebSocket(buildSocketUrl(options));

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let acceptedDeltaId: string | null = null;

    const finish = (error?: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.close();
      if (error) {
        reject(error);
        return;
      }
      resolve();
    };

    socket.addEventListener("open", () => {
      socket.send(
        JSON.stringify({
          type: "agent.delta.submit",
          requestId,
          text: options.text,
          deltaType: options.deltaType,
          confidence: options.confidence,
        }),
      );
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(
        String(event.data),
      ) as AgentSocketServerMessage;
      printServerMessage(message);
      if (
        message.type === "agent.delta.accepted" &&
        message.requestId === requestId
      ) {
        acceptedDeltaId = message.delta.id;
        if (!options.follow) {
          finish();
        }
      }
      if (
        message.type === "agent.delta.status" &&
        acceptedDeltaId &&
        message.delta.id === acceptedDeltaId &&
        message.status !== "pending"
      ) {
        finish();
      }
      if (
        message.type === "socket.error" &&
        (!message.requestId || message.requestId === requestId)
      ) {
        finish(new Error(message.error));
      }
    });

    socket.addEventListener("close", () => {
      if (settled) {
        return;
      }
      if (acceptedDeltaId && !options.follow) {
        resolve();
        return;
      }
      reject(new Error("Socket closed before the server confirmed the delta."));
    });

    socket.addEventListener("error", () => {
      finish(new Error("WebSocket connection failed."));
    });
  });
}

async function runWatch(options: Options) {
  const socket = new WebSocket(buildSocketUrl(options));
  const requests = new Map<string, string>();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  const submitLine = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const requestId = nextRequestId();
    requests.set(requestId, trimmed);
    socket.send(
      JSON.stringify({
        type: "agent.delta.submit",
        requestId,
        text: trimmed,
        deltaType: options.deltaType,
        confidence: options.confidence,
      }),
    );
    console.log(`[queued] ${trimmed}`);
  };

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const cleanup = (error?: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      rl.close();
      socket.close();
      if (error) {
        reject(error);
        return;
      }
      resolve();
    };

    socket.addEventListener("open", () => {
      console.log(
        "Bridge connected. Type one insight per line and press Enter.",
      );
      console.log("Use Ctrl+C to stop.");
      if (options.text?.trim()) {
        submitLine(options.text);
      }
      rl.prompt();
    });

    rl.on("line", (line) => {
      submitLine(line);
      rl.prompt();
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(
        String(event.data),
      ) as AgentSocketServerMessage;
      printServerMessage(message);
      if (message.type === "agent.delta.accepted" && message.requestId) {
        requests.delete(message.requestId);
      }
      if (message.type === "socket.error" && !message.requestId) {
        cleanup(new Error(message.error));
        return;
      }
      rl.prompt();
    });

    socket.addEventListener("close", () => {
      if (!settled) {
        cleanup(new Error("Socket closed."));
      }
    });

    socket.addEventListener("error", () => {
      cleanup(new Error("WebSocket connection failed."));
    });

    process.on("SIGINT", () => {
      cleanup();
    });
  });
}

async function main() {
  try {
    const { command, options } = parseArgs(process.argv.slice(2)) as {
      command: Command;
      options: Options;
    };
    if (command === "submit") {
      await runSubmit(options);
      return;
    }
    await runWatch(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}

await main();
