#!/usr/bin/env bun
/**
 * Scripted autopilot for `just demo-interactive`.
 *
 * Drives a three-department decision (Marketing · Support · IT) through the
 * full conversation → shared decision → plan → handoff flow. Real people can
 * jump in at any time — nothing here is privileged.
 */
import {
  adrSectionOrder,
  type AdrSectionKey,
  type RoomSnapshot,
} from "../shared/contracts";

type Actor = "marketing" | "support" | "it";

type Args = {
  server: string;
  roomId: string;
  marketingId: string;
  supportId: string;
  itId: string;
  tempo: number;
  loop: boolean;
  /** Stop just before the marketing lead approves the shared decision, so a human can drive approvals + handoff. */
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
    marketingId: required("marketing-id"),
    supportId: required("support-id"),
    itId: required("it-id"),
    tempo: Number(map.get("tempo") ?? "3500"),
    loop: map.get("loop") === "true",
    pauseBeforeApproval: map.get("pause-before-approval") === "true",
  };
}

const args = parseArgs(process.argv.slice(2));

const ACTOR_ICON: Record<Actor, string> = {
  marketing: "📣",
  support: "🛟",
  it: "🛡",
};

function actorId(actor: Actor): string {
  switch (actor) {
    case "marketing":
      return args.marketingId;
    case "support":
      return args.supportId;
    case "it":
      return args.itId;
  }
}

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
// Short beat used inside the ADR section-fill loop. Writing 12 sections at
// full tempo would eat the entire capture window — a fraction of tempo keeps
// each section visible without flooding the viewer.
const quickBeat = () => wait(Math.max(250, Math.round(args.tempo / 4)));

const log = (icon: string, line: string) => {
  const stamp = new Date().toLocaleTimeString();
  console.log(`${stamp}  ${icon}  ${line}`);
};

async function snapshot(viewerId?: string): Promise<RoomSnapshot> {
  const suffix = viewerId ? `?viewerId=${viewerId}` : "";
  return api<RoomSnapshot>(`/api/rooms/${args.roomId}${suffix}`);
}

async function utter(actor: Actor, text: string) {
  log(ACTOR_ICON[actor], `${actor} says: ${text}`);
  await api(`/api/rooms/${args.roomId}/utterances`, {
    method: "POST",
    body: JSON.stringify({ actorId: actorId(actor), text }),
  });
}

async function dropDelta(actor: Actor, text: string) {
  const sourceAgent = `${actor}-codex`;
  log("✦", `${sourceAgent} drops a private delta: ${text}`);
  await api(`/api/rooms/${args.roomId}/agent-deltas`, {
    method: "POST",
    body: JSON.stringify({
      actorId: actorId(actor),
      text,
      sourceAgent,
      type: "agent_insight",
    }),
  });
}

async function promoteLatest(actor: Actor) {
  const snap = await snapshot(actorId(actor));
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
    body: JSON.stringify({ actorId: actorId(actor) }),
  });
}

async function synthesize(actor: Actor) {
  log("◉", `${actor} triggers orchestrator synthesis`);
  await api(`/api/rooms/${args.roomId}/synthesize`, {
    method: "POST",
    body: JSON.stringify({ actorId: actorId(actor) }),
  });
}

async function claim(
  actor: Actor,
  scopeType: "adr_section" | "plan_item",
  scopeId: string,
) {
  await api(`/api/rooms/${args.roomId}/claims`, {
    method: "POST",
    body: JSON.stringify({ actorId: actorId(actor), scopeType, scopeId }),
  });
}

async function releaseClaim(
  actor: Actor,
  scopeType: "adr_section" | "plan_item",
  scopeId: string,
) {
  await api(
    `/api/rooms/${args.roomId}/claims?actorId=${actorId(actor)}&scopeType=${scopeType}&scopeId=${scopeId}`,
    { method: "DELETE" },
  );
}

async function saveAdrSection(actor: Actor, section: AdrSectionKey, text: string) {
  log("✎", `${actor} edits shared decision section "${section}"`);
  await api(`/api/rooms/${args.roomId}/adr/sections/${section}`, {
    method: "POST",
    body: JSON.stringify({ actorId: actorId(actor), text }),
  });
}

async function regenerateAdr(actor: Actor, section: AdrSectionKey) {
  log("↻", `${actor} refreshes section "${section}"`);
  await api(`/api/rooms/${args.roomId}/adr/sections/${section}/regenerate`, {
    method: "POST",
    body: JSON.stringify({ actorId: actorId(actor) }),
  });
}

async function reviewAdr(actor: Actor, section: AdrSectionKey) {
  log("✓", `${actor} reviews section "${section}"`);
  await api(`/api/rooms/${args.roomId}/adr/sections/${section}/review`, {
    method: "POST",
    body: JSON.stringify({ actorId: actorId(actor) }),
  });
}

async function approveAdr(actor: Actor) {
  log("●", `${actor} approves the shared decision`);
  await api(`/api/rooms/${args.roomId}/adr/approve`, {
    method: "POST",
    body: JSON.stringify({ actorId: actorId(actor) }),
  });
}

async function generatePlan(actor: Actor) {
  log("⚙", `${actor} builds the alignment plan`);
  await api(`/api/rooms/${args.roomId}/plan/generate`, {
    method: "POST",
    body: JSON.stringify({ actorId: actorId(actor) }),
  });
}

async function acceptAllPlanOwners(actor: Actor) {
  const snap = await snapshot();
  for (const item of snap.plan.workstreams) {
    await claim(actor, "plan_item", item.id).catch(() => {});
    log("✓", `${actor} accepts owner for "${item.title}"`);
    await api(`/api/rooms/${args.roomId}/plan/items/${item.id}/accept-owner`, {
      method: "POST",
      body: JSON.stringify({ actorId: actorId(actor) }),
    }).catch(() => {});
    await releaseClaim(actor, "plan_item", item.id).catch(() => {});
  }
}

async function approvePlan(actor: Actor) {
  log("●", `${actor} approves the alignment plan`);
  await api(`/api/rooms/${args.roomId}/plan/approve`, {
    method: "POST",
    body: JSON.stringify({ actorId: actorId(actor) }),
  });
}

async function generateHandoff(actor: Actor) {
  log("📦", `${actor} shares the handoff package`);
  await api(`/api/rooms/${args.roomId}/handoff/generate`, {
    method: "POST",
    body: JSON.stringify({ actorId: actorId(actor) }),
  });
}

async function claimAndWriteAdr(
  actor: Actor,
  section: AdrSectionKey,
  text: string,
) {
  await claim(actor, "adr_section", section);
  await quickBeat();
  await saveAdrSection(actor, section, text);
  await quickBeat();
  await releaseClaim(actor, "adr_section", section).catch(() => {});
}

async function runOnce() {
  log("▶", `autopilot starting, tempo=${args.tempo}ms`);

  // --- phase 1: surface the decision -----------------------------------
  await utter(
    "marketing",
    "Goal: ship a website support agent that deflects our top-10 FAQs and reduces inbound ticket volume by the end of the quarter.",
  );
  await beat();
  await utter(
    "support",
    "Constraint: the agent must hand off to a human with full context within 2 minutes. Risk: bad answers could hurt CSAT — we need a safety net.",
  );
  await beat();
  await utter(
    "it",
    "Constraint: no customer PII in prompts without DLP, and the rollout has to pass our SOC 2 review before any production traffic touches it.",
  );
  await beat();

  // --- phase 2: private agents surface deltas --------------------------
  await dropDelta(
    "marketing",
    "Option: launch on pricing + docs pages first — lower blast radius, marketing gets a clean story.",
  );
  await beat();
  await dropDelta(
    "support",
    "Tradeoff: scripted answers are safer; LLM feels more helpful. Start scripted for the FAQ set, LLM fallback only when confidence is high.",
  );
  await beat();
  await dropDelta(
    "it",
    "Risk: self-hosted model adds ~6 weeks. Propose managed LLM behind a DLP gateway so prompts redact PII before they leave our edge.",
  );
  await beat();

  // --- phase 3: humans promote their own codex's deltas ----------------
  await promoteLatest("marketing");
  await beat();
  await promoteLatest("support");
  await beat();
  await promoteLatest("it");
  await beat();

  // --- phase 4: synthesize --------------------------------------------
  await synthesize("marketing");
  await beat();

  // --- phase 5: write the shared decision -----------------------------
  // Every section must be non-empty for the readiness gate. Sections are
  // authored by whichever department owns the angle; other departments
  // review below.
  const adrPayloads: Record<AdrSectionKey, { author: Actor; text: string }> = {
    title: { author: "marketing", text: "Website support agent — day-one scope" },
    status: {
      author: "marketing",
      text: "Proposed — three departments aligning before any engineering work starts.",
    },
    context: {
      author: "marketing",
      text: "Inbound support volume is up 38% QoQ. Marketing wants a visible agent on the website; Support needs a safe escalation path; IT needs a rollout that doesn't expose PII or fail SOC 2.",
    },
    goals: {
      author: "marketing",
      text: "Deflect the top-10 FAQs on pricing + docs pages.\nHand off to a human with full conversation context within 2 minutes.\nLaunch gated by IT security review, not by a date.",
    },
    constraints: {
      author: "it",
      text: "No customer PII in prompts without DLP redaction.\nMust pass SOC 2 review before production traffic.\nAgent is scoped to pricing + docs pages at launch — no checkout, no authenticated areas.",
    },
    options_considered: {
      author: "support",
      text: "Managed LLM provider behind a DLP gateway\nSelf-hosted open-source model on our infra\nScripted FAQ bot with no LLM at all",
    },
    decision: {
      author: "marketing",
      text: "Ship a managed LLM behind a DLP gateway. Scripted answers handle the top-10 FAQs; LLM fallback engages only when the scripted confidence is low AND PII redaction has passed.",
    },
    tradeoffs: {
      author: "support",
      text: "Scripted answers feel robotic but ship in days with no IT risk.\nFull LLM is helpful but can hallucinate on product specifics.\nScripted-first gets marketing a visible launch and keeps IT's attack surface tiny.",
    },
    consequences: {
      author: "support",
      text: "Support queue drops for top-10 FAQs; on-call no longer gets pinged for password resets.\nIT reviews the DLP gateway once, not every new prompt.\nMarketing ships a visible capability on pricing + docs within the quarter.",
    },
    implementation_guidance: {
      author: "it",
      text: "Route every agent call through the DLP gateway before it hits the provider.\nCache scripted answers at the CDN edge.\nLog every handoff with redacted transcript.\nEscalate to a human within 2 minutes if LLM confidence < 0.7 or DLP flags the draft response.",
    },
    related_patterns: {
      author: "marketing",
      text: "Deflect-then-escalate\nScoped rollout (pricing + docs before checkout)\nHandoff-with-context (human sees the whole conversation)",
    },
    approvers: {
      author: "marketing",
      text: "Maya (Marketing), Sam (Support), Ivo (IT) all agree to the day-one scope.",
    },
  };

  for (const section of adrSectionOrder) {
    const entry = adrPayloads[section];
    await claimAndWriteAdr(entry.author, section, entry.text);
  }

  // Regenerate the tradeoffs section so the viewer sees the LLM path.
  // Heuristic fallback may return empty — in that case restore the default.
  await claim("support", "adr_section", "tradeoffs");
  await quickBeat();
  await regenerateAdr("support", "tradeoffs").catch(() => {});
  const afterRegen = await snapshot(args.supportId);
  if (!afterRegen.adr.sections.tradeoffs.trim()) {
    await saveAdrSection("support", "tradeoffs", adrPayloads.tradeoffs.text);
  }
  await quickBeat();
  await releaseClaim("support", "adr_section", "tradeoffs").catch(() => {});

  // Reviews satisfy adrReviewed readiness — every section needs at least one
  // reviewer. All three departments review every section so the decision is
  // demonstrably cross-functional before approval.
  for (const section of adrSectionOrder) {
    for (const reviewer of ["marketing", "support", "it"] as const) {
      await reviewAdr(reviewer, section).catch(() => {});
      await wait(Math.max(200, args.tempo / 8));
    }
  }
  await beat();

  if (args.pauseBeforeApproval) {
    log(
      "⏸",
      "paused — room is ready. Approve the shared decision → build plan → accept owners → approve plan → create handoff in the browser as Maya (marketing owner).",
    );
    return;
  }

  // --- phase 6: approve the shared decision ---------------------------
  await approveAdr("marketing");
  await beat();

  // --- phase 7: alignment plan ----------------------------------------
  await generatePlan("marketing");
  await beat();
  await acceptAllPlanOwners("marketing");
  await beat();
  await approvePlan("marketing");
  await beat();

  // --- phase 8: handoff ------------------------------------------------
  await generateHandoff("marketing");

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
