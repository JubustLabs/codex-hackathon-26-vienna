import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "bun",
  args: ["run", "mcp"],
  cwd: process.cwd(),
  stderr: "pipe",
  env: {
    ...process.env,
    GEORG_BASE_URL: process.env.GEORG_BASE_URL ?? "http://localhost:3001",
    GEORG_APP_URL: process.env.GEORG_APP_URL ?? "http://localhost:5173",
  } as Record<string, string>,
});

if (transport.stderr) {
  transport.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });
}

const client = new Client({
  name: "codex-room-bridge-smoke",
  version: "0.1.0",
});

async function main() {
  await client.connect(transport);

  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name).sort();
  if (!toolNames.includes("georg_health")) {
    throw new Error("georg_health tool was not exposed by the MCP server.");
  }

  const health = await client.callTool({
    name: "georg_health",
    arguments: {},
  });

  const rooms = await client.callTool({
    name: "georg_list_rooms",
    arguments: {},
  });

  console.log(
    JSON.stringify(
      {
        toolCount: toolNames.length,
        health,
        rooms,
      },
      null,
      2,
    ),
  );
}

await main()
  .finally(async () => {
    await transport.close().catch(() => {});
    await client.close().catch(() => {});
  });
