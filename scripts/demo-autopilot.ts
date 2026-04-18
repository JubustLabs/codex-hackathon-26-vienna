#!/usr/bin/env bun
/**
 * Scripted autopilot for `just demo-interactive`.
 *
 * Drives the room through the full decision → shared decision → plan → handoff flow so a
 * viewer can watch the browser UI update on its own. Real people can jump in at
 * any time — nothing here is privileged.
 */
import {
  adrSectionOrder,
  type AdrSectionKey,
  type RoomSnapshot,
} from "../shared/contracts";

type Args = {
  server: string;
  roomId: string;
  aliceId: string;
  bobId: string;
  tempo: number;
  loop: boolean;
  /** Stop just before Alice approves the shared decision, so a human can drive approvals + handoff. */
  pauseBeforeApproval: boolean;
};

function parseArgs(argv: string[]): Args {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (!flag.startsWith("--")) continue;
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      map.set(flag.slice(2), "true");
    } else {
      map.set(flag.slice(2), value);
      i += 1;
    }
  }
  const required = (name: string) => {
    const value = map.get(name);
    if (!value) throw new Error(`missing --${name}`);
    return value;
  };
  return {
    server: map.get("server") ?? "http://localhost:3001",
    roomId: required("room-id"),
    aliceId: required("alice-id"),
    bobId: required("bob-id"),
    tempo: Number(map.get("tempo") ?? "3500"),
    loop: map.get("loop") === "true",
    pauseBeforeApproval: map.get("pause-before-approval") === "true",
  };
}

const args = parseArgs(process.argv.slice(2));

async function api<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${args.server}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${init?.method ?? "GET"} ${path} → ${response.status}: ${text}`);
  }
  return (await response.json()) as T;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const beat = () => wait(args.tempo);

const log = (icon: string, line: string) => {
  const stamp = new Date().toLocaleTimeString();
  console.log(`${stamp}  ${icon}  ${line}`);
};

async function snapshot(viewerId?: string): Promise<RoomSnapshot> {
  const suffix = viewerId ? `?viewerId=${viewerId}` : "";
  return api<RoomSnapshot>(`/api/rooms/${args.roomId}${suffix}`);
}

async function utter(actor: "alice" | "bob", text: string) {
  const actorId = actor === "alice" ? args.aliceId : args.bobId;
  log(actor === "alice" ? "🅰" : "🅱", `${actor} says: ${text}`);
  await api(`/api/rooms/${args.roomId}/utterances`, {
    method: "POST",
    body: JSON.stringify({ actorId, text }),
  });
}

async function dropDelta(actor: "alice" | "bob", text: string) {
  const actorId = actor === "alice" ? args.aliceId : args.bobId;
  const sourceAgent = actor === "alice" ? "alice-codex" : "bob-codex";
  log("✦", `${sourceAgent} drops a private delta: ${text}`);
  await api(`/api/rooms/${args.roomId}/agent-deltas`, {
    method: "POST",
    body: JSON.stringify({
      actorId,
      text,
      sourceAgent,
      type: "agent_insight",
    }),
  });
}

async function promoteLatest(actor: "alice" | "bob") {
  const actorId = actor === "alice" ? args.aliceId : args.bobId;
  const snap = await snapshot(actorId);
  const pending = snap.pendingDeltas.filter(
    (delta) => delta.status === "pending",
  );
  const target = pending[pending.length - 1];
  if (!target) {
    log("·", `${actor} has no pending delta to promote`);
    return;
  }
  log("▲", `${actor} promotes delta ${target.id}`);
  await api(`/api/rooms/${args.roomId}/agent-deltas/${target.id}/promote`, {
    method: "POST",
    body: JSON.stringify({ actorId }),
  });
}

async function synthesize(actor: "alice" | "bob") {
  const actorId = actor === "alice" ? args.aliceId : args.bobId;
  log("◉", `${actor} triggers orchestrator synthesis`);
  await api(`/api/rooms/${args.roomId}/synthesize`, {
    method: "POST",
    body: JSON.stringify({ actorId }),
  });
}

async function claim(
  actor: "alice" | "bob",
  scopeType: "adr_section" | "plan_item",
  scopeId: string,
) {
  const actorId = actor === "alice" ? args.aliceId : args.bobId;
  await api(`/api/rooms/${args.roomId}/claims`, {
    method: "POST",
    body: JSON.stringify({ actorId, scopeType, scopeId }),
  });
}

async function releaseClaim(
  actor: "alice" | "bob",
  scopeType: "adr_section" | "plan_item",
  scopeId: string,
) {
  const actorId = actor === "alice" ? args.aliceId : args.bobId;
  await api(
    `/api/rooms/${args.roomId}/claims?actorId=${actorId}&scopeType=${scopeType}&scopeId=${scopeId}`,
    { method: "DELETE" },
  );
}

async function saveAdrSection(actor: "alice" | "bob", section: AdrSectionKey, text: string) {
  const actorId = actor === "alice" ? args.aliceId : args.bobId;
  log("✎", `${actor} edits shared decision section "${section}"`);
  await api(`/api/rooms/${args.roomId}/adr/sections/${section}`, {
    method: "POST",
    body: JSON.stringify({ actorId, text }),
  });
}

async function regenerateAdr(actor: "alice" | "bob", section: AdrSectionKey) {
  const actorId = actor === "alice" ? args.aliceId : args.bobId;
  log("↻", `${actor} refreshes section "${section}"`);
  await api(`/api/rooms/${args.roomId}/adr/sections/${section}/regenerate`, {
    method: "POST",
    body: JSON.stringify({ actorId }),
  });
}

async function reviewAdr(actor: "alice" | "bob", section: AdrSectionKey) {
  const actorId = actor === "alice" ? args.aliceId : args.bobId;
  log("✓", `${actor} reviews section "${section}"`);
  await api(`/api/rooms/${args.roomId}/adr/sections/${section}/review`, {
    method: "POST",
    body: JSON.stringify({ actorId }),
  });
}

async function approveAdr(actor: "alice" | "bob") {
  const actorId = actor === "alice" ? args.aliceId : args.bobId;
  log("●", `${actor} approves the shared decision`);
  await api(`/api/rooms/${args.roomId}/adr/approve`, {
    method: "POST",
    body: JSON.stringify({ actorId }),
  });
}

async function generatePlan(actor: "alice" | "bob") {
  const actorId = actor === "alice" ? args.aliceId : args.bobId;
  log("⚙", `${actor} builds the alignment plan`);
  await api(`/api/rooms/${args.roomId}/plan/generate`, {
    method: "POST",
    body: JSON.stringify({ actorId }),
  });
}

async function acceptAllPlanOwners(actor: "alice" | "bob") {
  const actorId = actor === "alice" ? args.aliceId : args.bobId;
  const snap = await snapshot();
  for (const item of snap.plan.workstreams) {
    await claim(actor, "plan_item", item.id).catch(() => {});
    log("✓", `${actor} accepts owner for "${item.title}"`);
    await api(`/api/rooms/${args.roomId}/plan/items/${item.id}/accept-owner`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    }).catch(() => {});
    await releaseClaim(actor, "plan_item", item.id).catch(() => {});
  }
}

async function approvePlan(actor: "alice" | "bob") {
  const actorId = actor === "alice" ? args.aliceId : args.bobId;
  log("●", `${actor} approves the alignment plan`);
  await api(`/api/rooms/${args.roomId}/plan/approve`, {
    method: "POST",
    body: JSON.stringify({ actorId }),
  });
}

async function generateHandoff(actor: "alice" | "bob") {
  const actorId = actor === "alice" ? args.aliceId : args.bobId;
  log("📦", `${actor} shares the handoff package`);
  await api(`/api/rooms/${args.roomId}/handoff/generate`, {
    method: "POST",
    body: JSON.stringify({ actorId }),
  });
}

async function claimAndWriteAdr(
  actor: "alice" | "bob",
  section: AdrSectionKey,
  text: string,
) {
  await claim(actor, "adr_section", section);
  await beat();
  await saveAdrSection(actor, section, text);
  await beat();
  await releaseClaim(actor, "adr_section", section).catch(() => {});
}

async function runOnce() {
  log("▶", `autopilot starting, tempo=${args.tempo}ms`);

  // --- phase 1: surface the decision ------------------------------------
  await utter(
    "alice",
    "Goal: pick one chocolate cookie flavor for the bake sale that feels easy and fun for kids.",
  );
  await beat();
  await utter(
    "bob",
    "Constraint: we can only bake one flavor today. Option: classic chocolate chip, double chocolate, or chocolate-orange. Risk: chocolate-orange may feel too surprising.",
  );
  await beat();

  // --- phase 2: private agents surface deltas ---------------------------
  await dropDelta(
    "alice",
    "Option: classic chocolate chip feels familiar, safe, and easy to explain.",
  );
  await beat();
  await dropDelta(
    "bob",
    "Tradeoff: double chocolate tastes richer, but it can feel too heavy for some kids.",
  );
  await beat();

  // --- phase 3: humans promote the good ones ----------------------------
  await promoteLatest("alice");
  await beat();
  await promoteLatest("bob");
  await beat();

  // --- phase 4: synthesize --------------------------------------------
  await synthesize("alice");
  await beat();

  // --- phase 5: write the shared decision -----------------------------
  // Populate every section (the readiness gate requires all of them to be
  // non-empty). The meatier sections get a short narrative; the boilerplate
  // sections get a single line.
  const adrPayloads: Record<AdrSectionKey, { author: "alice" | "bob"; text: string }> = {
    title: { author: "alice", text: "Chocolate cookie flavor choice" },
    status: { author: "alice", text: "Proposed — quick bake sale decision." },
    context: {
      author: "alice",
      text: "We need one chocolate cookie flavor for the bake sale, and kids should understand the choice right away.",
    },
    goals: {
      author: "alice",
      text: "Pick one flavor that feels tasty, familiar, and easy to explain.",
    },
    constraints: {
      author: "bob",
      text: "We can bake only one flavor today. Ingredients and time should stay simple.",
    },
    options_considered: {
      author: "bob",
      text: "Classic chocolate chip\nDouble chocolate\nChocolate-orange",
    },
    decision: {
      author: "alice",
      text: "Choose classic chocolate chip. It is the easiest crowd-pleaser for both kids and parents.",
    },
    tradeoffs: {
      author: "alice",
      text: "Double chocolate feels richer, but classic chocolate chip is easier for more kids to enjoy.",
    },
    consequences: {
      author: "bob",
      text: "We buy simple ingredients, bake one clear batch, and label the table with one easy flavor name.",
    },
    implementation_guidance: {
      author: "bob",
      text: "Bake a small test batch first, then make the full batch once Alice and Bob still agree.",
    },
    related_patterns: {
      author: "alice",
      text: "Pick the easiest crowd-pleaser. Prefer one clear choice over many confusing options.",
    },
    approvers: {
      author: "alice",
      text: "Alice and Bob agree to the flavor choice.",
    },
  };

  for (const section of adrSectionOrder) {
    const entry = adrPayloads[section];
    await claimAndWriteAdr(entry.author, section, entry.text);
  }

  // Regenerate one section so the viewer sees the LLM path. Heuristic fallback
  // may return empty — in that case save a default to keep the section populated.
  await claim("alice", "adr_section", "tradeoffs");
  await beat();
  await regenerateAdr("alice", "tradeoffs").catch(() => {});
  const afterRegen = await snapshot(args.aliceId);
  if (!afterRegen.adr.sections.tradeoffs.trim()) {
    await saveAdrSection("alice", "tradeoffs", adrPayloads.tradeoffs.text);
  }
  await beat();
  await releaseClaim("alice", "adr_section", "tradeoffs").catch(() => {});

  // Reviews satisfy adrReviewed readiness — every section needs at least one reviewer.
  for (const section of adrSectionOrder) {
    await reviewAdr("bob", section).catch(() => {});
    await wait(Math.max(250, args.tempo / 6));
    await reviewAdr("alice", section).catch(() => {});
  }
  await beat();

  if (args.pauseBeforeApproval) {
    log(
      "⏸",
      "paused — room is ready. Now approve the shared decision → build plan → accept owners → approve plan → create handoff in the browser as Alice.",
    );
    return;
  }

  // --- phase 6: approve the shared decision ---------------------------
  await approveAdr("alice");
  await beat();

  // --- phase 7: alignment plan ----------------------------------------
  await generatePlan("alice");
  await beat();
  await acceptAllPlanOwners("alice");
  await beat();
  await approvePlan("alice");
  await beat();

  // --- phase 8: handoff ------------------------------------------------
  await generateHandoff("alice");

  log("✓", "autopilot finished a full cycle");
}

async function main() {
  while (true) {
    try {
      await runOnce();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log("!", `autopilot step failed: ${message}`);
    }
    if (!args.loop) return;
    await wait(Math.max(6000, args.tempo * 2));
    log("↻", "looping autopilot");
  }
}

await main();
