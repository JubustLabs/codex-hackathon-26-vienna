const API_URL = process.env.LIVING_ROOM_API_URL ?? "http://localhost:3001";

type Command = "connect" | "publish" | "room" | "ack" | "reset";

const [command, ...args] = process.argv.slice(2) as [Command | undefined, ...string[]];

if (!command) {
  printUsage();
  process.exit(1);
}

switch (command) {
  case "connect":
    await connect(args[0], args[1] ?? args[0]);
    break;
  case "publish":
    await publish(args[0], args[1], args.slice(2).join(" "));
    break;
  case "room":
    await showRoom();
    break;
  case "ack":
    await ack(args[0], args[1]);
    break;
  case "reset":
    await reset();
    break;
  default:
    printUsage();
}

async function connect(participantId?: string, displayName?: string) {
  assert(participantId, "participantId is required");
  const response = await fetch(`${API_URL}/plugin/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participantId, displayName })
  });
  console.log(await response.text());
}

async function publish(participantId?: string, type?: string, text?: string) {
  assert(participantId, "participantId is required");
  assert(type, "type is required");
  assert(text, "text is required");

  const response = await fetch(`${API_URL}/plugin/publish-delta`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      participantId,
      delta: {
        type,
        text,
        source: `${participantId}-plugin`,
        confidence: 0.85
      }
    })
  });
  console.log(await response.text());
}

async function showRoom() {
  const response = await fetch(`${API_URL}/room`);
  console.log(await response.text());
}

async function ack(participantId?: string, packetId?: string) {
  assert(participantId, "participantId is required");
  assert(packetId, "packetId is required");
  const response = await fetch(`${API_URL}/plugin/ack`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participantId, packetId })
  });
  console.log(await response.text());
}

async function reset() {
  const response = await fetch(`${API_URL}/demo/reset`, { method: "POST" });
  console.log(await response.text());
}

function assert(value: string | undefined, message: string): asserts value is string {
  if (!value) {
    throw new Error(message);
  }
}

function printUsage() {
  console.log(`Usage:
  bun plugins/converge-bridge/scripts/bridge.ts connect <participantId> [displayName]
  bun plugins/converge-bridge/scripts/bridge.ts publish <participantId> <type> <text...>
  bun plugins/converge-bridge/scripts/bridge.ts ack <participantId> <packetId>
  bun plugins/converge-bridge/scripts/bridge.ts room
  bun plugins/converge-bridge/scripts/bridge.ts reset`);
}
