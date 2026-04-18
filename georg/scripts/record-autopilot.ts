#!/usr/bin/env bun
/**
 * Records a clean 1080p capture of the autopilot flow in the browser.
 *
 * Output: georg/video/public/autopilot-capture.webm
 *
 * Usage:
 *   bun scripts/record-autopilot.ts                  # 90s capture at default tempo
 *   bun scripts/record-autopilot.ts --duration 120   # 120s capture
 *   bun scripts/record-autopilot.ts --tempo 2500     # faster autopilot
 *
 * Assumes the dev servers are already running:
 *   export ALLOW_LOCAL_HEURISTIC_FALLBACK=1 && just dev
 *
 * If they're not, start them in another terminal first.
 */

import { mkdir, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname ?? ".", "..");
const PUBLIC_DIR = path.join(ROOT, "video", "public");
const OUT_FILE = path.join(PUBLIC_DIR, "autopilot-capture.webm");
const TMP_DIR = path.join(ROOT, "video", ".capture-tmp");

type Args = {
  server: string;
  appUrl: string;
  durationSec: number;
  tempo: number;
  leadInMs: number;
  tailOutMs: number;
};

function parseArgs(argv: string[]): Args {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (!flag.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      map.set(flag.slice(2), "true");
      continue;
    }
    map.set(flag.slice(2), next);
    i += 1;
  }
  return {
    server: map.get("server") ?? "http://localhost:3001",
    appUrl: map.get("app-url") ?? "http://localhost:5173",
    durationSec: Number(map.get("duration") ?? "90"),
    tempo: Number(map.get("tempo") ?? "3200"),
    leadInMs: Number(map.get("lead-in") ?? "3500"),
    tailOutMs: Number(map.get("tail-out") ?? "2500"),
  };
}

const args = parseArgs(process.argv.slice(2));

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    throw new Error(`${init?.method ?? "GET"} ${url} → ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as T;
}

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      await apiJson(`${args.server}/api/rooms`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(`server at ${args.server} never responded`);
}

async function createRoomAndParticipants() {
  const room = await apiJson<{ id: string }>(`${args.server}/api/rooms`, {
    method: "POST",
    body: JSON.stringify({
      topic: "Realtime alignment workspace",
      decision: "How do humans and local coding agents converge on one ADR?",
      goal: "Show a denoised, human-controlled multi-agent decision room live.",
      nonGoals: "Full autonomy, chat spam, and leaking private agent context into shared state.",
      scope: "One live room, private agent deltas, shared alignment, ADR, plan, and handoff.",
      successBar: "Two people and two local agents reach a visible shared decision path in one session.",
      topicTags: ["hackathon", "agents", "adr", "alignment", "demo"],
    }),
  });
  const alice = await apiJson<{ id: string }>(`${args.server}/api/rooms/${room.id}/join`, {
    method: "POST",
    body: JSON.stringify({ displayName: "Alice", role: "decision_owner" }),
  });
  const bob = await apiJson<{ id: string }>(`${args.server}/api/rooms/${room.id}/join`, {
    method: "POST",
    body: JSON.stringify({ displayName: "Bob", role: "contributor" }),
  });
  return { roomId: room.id, aliceId: alice.id, bobId: bob.id };
}

async function main() {
  console.log(`• capture target: ${OUT_FILE}`);
  console.log(`• duration=${args.durationSec}s tempo=${args.tempo}ms`);

  await waitForServer();
  console.log("• server is up");

  const { roomId, aliceId, bobId } = await createRoomAndParticipants();
  console.log(`• room=${roomId}`);

  await mkdir(PUBLIC_DIR, { recursive: true });
  await rm(TMP_DIR, { recursive: true, force: true });
  await mkdir(TMP_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    recordVideo: {
      dir: TMP_DIR,
      size: { width: 1920, height: 1080 },
    },
  });
  const page = await context.newPage();

  const aliceUrl = `${args.appUrl}/rooms/${roomId}?participantId=${aliceId}`;
  await page.goto(aliceUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(args.leadInMs);

  console.log("• launching autopilot subprocess");
  const autopilot = spawn(
    "bun",
    [
      "scripts/demo-autopilot.ts",
      "--server",
      args.server,
      "--room-id",
      roomId,
      "--alice-id",
      aliceId,
      "--bob-id",
      bobId,
      "--tempo",
      String(args.tempo),
    ],
    { cwd: ROOT, stdio: "inherit" },
  );

  const autopilotExit = new Promise<void>((resolve) => {
    autopilot.on("exit", () => resolve());
  });

  const totalMs = args.durationSec * 1000;
  const deadline = Promise.race([
    autopilotExit.then(() => new Promise<void>((r) => setTimeout(r, args.tailOutMs))),
    new Promise<void>((r) => setTimeout(r, totalMs)),
  ]);
  await deadline;

  if (autopilot.exitCode === null) {
    console.log("• autopilot still running past deadline — killing");
    autopilot.kill("SIGTERM");
  }

  await page.waitForTimeout(500);
  await context.close();
  await browser.close();

  // Playwright writes an auto-generated filename; grab the newest webm.
  const files = (await readdir(TMP_DIR)).filter((f) => f.endsWith(".webm"));
  if (files.length === 0) {
    throw new Error("playwright produced no webm");
  }
  const latest = files[files.length - 1];
  await rename(path.join(TMP_DIR, latest), OUT_FILE);
  await rm(TMP_DIR, { recursive: true, force: true });

  console.log(`✓ wrote ${OUT_FILE}`);
}

await main();
