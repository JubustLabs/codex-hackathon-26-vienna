#!/usr/bin/env bun
/**
 * Records a clean 1080p capture of the autopilot flow in the browser.
 *
 * Output: video/public/autopilot-capture.webm
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
    durationSec: Number(map.get("duration") ?? "120"),
    tempo: Number(map.get("tempo") ?? "2400"),
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
      topic: "Website support agent",
      decision:
        "Ship a customer support agent on the website — what does it do on day one?",
      goal: "One cross-functional scope that marketing, support, and IT all agree on before any code ships.",
      nonGoals:
        "Handling authenticated checkout flows, replacing Tier-2 support, or changing our CRM of record.",
      scope:
        "An AI agent that answers the top-10 FAQs on pricing + docs pages and hands off to a human with full context within 2 minutes.",
      successBar:
        "Marketing sees a deflection metric, Support trusts the escalation path, IT signs off on the data/security posture — all without a follow-up meeting.",
      topicTags: ["support-agent", "marketing", "support", "it", "demo"],
    }),
  });
  const marketing = await apiJson<{ id: string }>(`${args.server}/api/rooms/${room.id}/join`, {
    method: "POST",
    body: JSON.stringify({ displayName: "Maya (Marketing)", role: "decision_owner" }),
  });
  const support = await apiJson<{ id: string }>(`${args.server}/api/rooms/${room.id}/join`, {
    method: "POST",
    body: JSON.stringify({ displayName: "Sam (Support)", role: "decision_owner" }),
  });
  const it = await apiJson<{ id: string }>(`${args.server}/api/rooms/${room.id}/join`, {
    method: "POST",
    body: JSON.stringify({ displayName: "Ivo (IT)", role: "contributor" }),
  });
  return {
    roomId: room.id,
    marketingId: marketing.id,
    supportId: support.id,
    itId: it.id,
  };
}

async function main() {
  console.log(`• capture target: ${OUT_FILE}`);
  console.log(`• duration=${args.durationSec}s tempo=${args.tempo}ms`);

  await waitForServer();
  console.log("• server is up");

  const { roomId, marketingId, supportId, itId } = await createRoomAndParticipants();
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

  const ownerUrl = `${args.appUrl}/rooms/${roomId}?participantId=${marketingId}`;
  await page.goto(ownerUrl, { waitUntil: "networkidle" });
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
      "--marketing-id",
      marketingId,
      "--support-id",
      supportId,
      "--it-id",
      itId,
      "--tempo",
      String(args.tempo),
    ],
    { cwd: ROOT, stdio: "inherit" },
  );

  const autopilotExit = new Promise<void>((resolve) => {
    autopilot.on("exit", () => resolve());
  });

  // Scrolling the captured page in sync with the autopilot phases. Without
  // this the browser stays pinned at the top and the ADR / plan / handoff
  // panels (which live further down the center column) never appear in the
  // recording. Scrolls use `h2:has-text(...)` on the stable panel headings.
  const scrollScript = async () => {
    const scrollTo = async (selectorText: string, block: "start" | "center" = "start") => {
      try {
        const locator = page.locator(`h2:has-text("${selectorText}")`).first();
        await locator.scrollIntoViewIfNeeded({ timeout: 2000 });
        // nudge upward so the heading isn't pinned against the top edge
        if (block === "start") {
          await page.evaluate(() => window.scrollBy({ top: -80, left: 0, behavior: "smooth" }));
        }
      } catch {
        // selector may not exist yet (phase not reached) — safe to skip
      }
    };

    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    // t ≈ 0–25s: stay at the top so the alignment board is in view while
    // utterances + private deltas + promotes happen.
    await wait(26_000);
    // t ≈ 26s: synthesis has published — pan down to orchestrator + shared
    // decision area so viewers see sections being claimed + drafted.
    await scrollTo("Shared decision draft");
    await wait(28_000);
    // t ≈ 54s: shared decision approved, plan about to generate. Pull the
    // alignment plan panel into view.
    await scrollTo("Alignment plan");
    await wait(24_000);
    // t ≈ 78s: plan approved, handoff being generated. Nudge further so the
    // "Create handoff" button + result are visible.
    await page.evaluate(() => window.scrollBy({ top: 320, left: 0, behavior: "smooth" }));
    await wait(12_000);
    // Brief pull back to the top for the outro so the full room frames the
    // closing shot.
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "smooth" }));
  };

  const scrollTask = scrollScript().catch((error) => {
    console.log(`• scroll orchestration error: ${error instanceof Error ? error.message : String(error)}`);
  });

  const totalMs = args.durationSec * 1000;
  const deadline = Promise.race([
    autopilotExit.then(() => new Promise<void>((r) => setTimeout(r, args.tailOutMs))),
    new Promise<void>((r) => setTimeout(r, totalMs)),
  ]);
  await deadline;
  await Promise.race([scrollTask, new Promise<void>((r) => setTimeout(r, 500))]);

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
