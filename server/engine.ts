import {
  adrSectionOrder,
  type AdrSectionKey,
  type AlignmentNode,
  type RoomSnapshot,
  type Workstream,
} from "@shared/contracts";

import type { AiAdapter, DetectedDelta, GeneratedPlan, OrchestratorResult } from "./provider";

const classifiers: Array<{
  deltaType: DetectedDelta["deltaType"];
  nodeType: DetectedDelta["nodeType"];
  patterns: RegExp[];
}> = [
  { deltaType: "goal_detected", nodeType: "goal", patterns: [/\bgoal\b/i, /\bwe need to\b/i, /\bwe want to\b/i] },
  {
    deltaType: "constraint_detected",
    nodeType: "constraint",
    patterns: [/\bmust\b/i, /\brequirement\b/i, /\bdeadline\b/i, /\bcompliance\b/i, /\bhard constraint\b/i],
  },
  {
    deltaType: "option_detected",
    nodeType: "option",
    patterns: [/\boption\b/i, /\bapproach\b/i, /\bproposal\b/i, /\bwe could\b/i],
  },
  {
    deltaType: "tradeoff_detected",
    nodeType: "tradeoff",
    patterns: [/\btradeoff\b/i, /\bcost of\b/i, /\bin exchange\b/i, /\bbut it means\b/i],
  },
  { deltaType: "risk_detected", nodeType: "risk", patterns: [/\brisk\b/i, /\bfailure\b/i, /\bconcern\b/i] },
  {
    deltaType: "open_question_detected",
    nodeType: "open_question",
    patterns: [/\?$/, /\bopen question\b/i, /\bhow do we\b/i, /\bwho owns\b/i],
  },
  {
    deltaType: "agreement_signal",
    nodeType: "agreement",
    patterns: [/\bagree\b/i, /\baligned\b/i, /\bconsensus\b/i, /\bwe should proceed\b/i],
  },
  {
    deltaType: "disagreement_signal",
    nodeType: "unresolved_difference",
    patterns: [/\bdisagree\b/i, /\bnot convinced\b/i, /\bblocker\b/i, /\bconcerned that\b/i],
  },
];

const toSentenceList = (text: string) =>
  text
    .split(/[\n.]/)
    .map((part) => part.trim())
    .filter(Boolean);

function summarizeNodes(snapshot: RoomSnapshot, type: AlignmentNode["type"]) {
  return snapshot.alignmentNodes
    .filter((node) => node.type === type)
    .map((node) => node.text)
    .slice(0, 3);
}

function isSupportAgentDemo(snapshot: RoomSnapshot) {
  const topic = snapshot.room.topic.toLowerCase();
  return (
    topic.includes("support agent") ||
    snapshot.room.topicTags.includes("support-agent")
  );
}

function defaultSectionDraft(snapshot: RoomSnapshot, section: AdrSectionKey) {
  const goals = summarizeNodes(snapshot, "goal");
  const constraints = summarizeNodes(snapshot, "constraint");
  const options = summarizeNodes(snapshot, "option");
  const tradeoffs = summarizeNodes(snapshot, "tradeoff");
  const risks = summarizeNodes(snapshot, "risk");
  const agreements = summarizeNodes(snapshot, "agreement");
  const patterns = snapshot.patterns.map((pattern) => pattern.title).slice(0, 3);
  const components = snapshot.components.filter((component) => component.status === "confirmed").map((component) => component.title);
  const decisionOwners = snapshot.participants
    .filter((participant) => snapshot.room.decisionOwnerIds.includes(participant.id))
    .map((participant) => participant.displayName);

  const map: Record<AdrSectionKey, string> = {
    title: `${snapshot.room.topic} shared decision`,
    status: snapshot.adr.status === "approved" ? "Approved" : "Ready for review",
    context: [snapshot.room.decision, snapshot.room.scope, ...constraints].filter(Boolean).join("\n"),
    goals: goals.join("\n"),
    constraints: constraints.join("\n"),
    options_considered: options.join("\n"),
    decision: agreements[0] ?? options[0] ?? "Pending explicit room agreement.",
    tradeoffs: tradeoffs.join("\n"),
    consequences: risks.join("\n"),
    implementation_guidance: [
      components.length ? `Reuse: ${components.join(", ")}` : "",
      "Keep shared updates denoised and preserve section ownership locks.",
    ]
      .filter(Boolean)
      .join("\n"),
    related_patterns: patterns.join("\n"),
    approvers: decisionOwners.join(", "),
  };

  return map[section];
}

function buildPlan(snapshot: RoomSnapshot): GeneratedPlan {
  const planId = snapshot.plan.id ?? crypto.randomUUID();
  const components = snapshot.components.filter((component) => component.status === "confirmed");
  const decisionOwners = snapshot.participants.filter((participant) => snapshot.room.decisionOwnerIds.includes(participant.id));
  const reusable = components.map((component) => component.title);
  const firstOwnerId = decisionOwners[0]?.id ?? snapshot.participants[0]?.id ?? null;

  if (isSupportAgentDemo(snapshot)) {
    const marketingOwner = decisionOwners[0]?.id ?? firstOwnerId;
    const supportOwner = decisionOwners[1]?.id ?? firstOwnerId;
    const itOwner =
      decisionOwners[2]?.id ??
      snapshot.participants.find((p) => !snapshot.room.decisionOwnerIds.includes(p.id))?.id ??
      firstOwnerId;
    const workstreams: Workstream[] = [
      {
        id: crypto.randomUUID(),
        planId,
        title: "DLP gateway + managed LLM wiring",
        description:
          "Stand up the DLP gateway in front of the managed LLM so no customer PII ever reaches the provider. Covers auth, logging, and the redaction ruleset.",
        suggestedOwnerId: itOwner,
        ownerStatus: "proposed",
        size: "M",
        dependsOn: [],
        deliverables: [
          "DLP gateway deployed to staging",
          "Redaction ruleset for email, phone, order-id, CC fragments",
          "Audit log stream into the existing SIEM",
        ],
        acceptanceChecks: [
          "Every outbound prompt is redacted before it leaves our edge",
          "Failing a redaction rule blocks the response with a visible error",
          "SOC 2 reviewer signs off on the gateway diagram",
        ],
        componentRefs: [],
        guardrailExceptions: [],
        firstStep:
          "Fork the existing egress proxy config, bolt on the redaction middleware, and point one staging route through it.",
        rolloutNotes:
          "No production traffic until IT sign-off. Staging cutover first, with full logging on.",
        openQuestions: [],
        patternRefs: snapshot.patterns.slice(0, 1).map((pattern) => pattern.id),
      },
      {
        id: crypto.randomUUID(),
        planId,
        title: "Scripted top-10 FAQs + LLM fallback",
        description:
          "Author the scripted answers for the top-10 support FAQs, wire LLM fallback behind a confidence threshold, and make every response cite its source.",
        suggestedOwnerId: supportOwner,
        ownerStatus: "proposed",
        size: "M",
        dependsOn: [],
        deliverables: [
          "Scripted answers for the 10 highest-volume FAQs",
          "Confidence threshold (default 0.7) that gates LLM fallback",
          "Handoff packet containing the full redacted transcript + context",
        ],
        acceptanceChecks: [
          "Scripted answers resolve > 60% of shadow-mode transcripts",
          "When confidence < 0.7, the agent hands off within 2 minutes",
          "Support managers can review the top 20 disagreements weekly",
        ],
        componentRefs: [],
        guardrailExceptions: [],
        firstStep:
          "Pull the last 90 days of ticket subjects, cluster into the top-10 FAQs, and draft scripted answers with Support leads.",
        rolloutNotes:
          "Shadow mode first — agent drafts responses but a human still sends them for one full week before real replies.",
        openQuestions: [],
        patternRefs: snapshot.patterns.slice(0, 1).map((pattern) => pattern.id),
      },
      {
        id: crypto.randomUUID(),
        planId,
        title: "Pricing + docs launch + deflection metric",
        description:
          "Ship the agent surface on pricing and docs pages, publish the deflection metric dashboard marketing will report on, and instrument the rollout so we can cut it quickly if it misbehaves.",
        suggestedOwnerId: marketingOwner,
        ownerStatus: "proposed",
        size: "S",
        dependsOn: [],
        deliverables: [
          "Agent widget live on pricing + docs pages (behind a kill-switch)",
          "Deflection-rate dashboard (deflected / total shown)",
          "A one-pager marketing can share publicly",
        ],
        acceptanceChecks: [
          "Kill-switch hides the widget within 30s globally",
          "Dashboard shows deflection rate split by page",
          "Support CSAT does not regress during the first week",
        ],
        componentRefs: [],
        guardrailExceptions: [],
        firstStep:
          "Gate the widget behind a feature flag with marketing, support, and IT all listed as flag owners.",
        rolloutNotes:
          "Start at 10% of pricing + docs traffic; ramp to 100% only after the first weekly CSAT review.",
        openQuestions: [],
        patternRefs: snapshot.patterns.slice(0, 1).map((pattern) => pattern.id),
      },
    ];

    return {
      planId,
      sections: {
        summary:
          "Three workstreams, one per department, that together ship the agent safely: IT builds the DLP+LLM plumbing, Support authors the scripted answers and fallback rules, Marketing ships the pricing/docs surface and the deflection dashboard.",
        workstreams: workstreams
          .map((item) => `${item.title} (${item.size})`)
          .join("\n"),
        sequence_and_dependencies:
          "IT finishes the DLP gateway first. Support authors scripted FAQs in parallel but ships only after the gateway is live. Marketing turns on the pricing/docs surface last, behind a kill-switch, once both upstream workstreams are green.",
        deliverables_and_acceptance_checks: workstreams
          .map(
            (item) =>
              `${item.title}: ${item.deliverables.join(", ")} | checks: ${item.acceptanceChecks.join(", ")}`,
          )
          .join("\n"),
        open_implementation_questions:
          "Do we self-host the embedding model for FAQ retrieval, or reuse the managed provider's? Who owns the weekly CSAT review meeting?",
        existing_components_to_reuse:
          "Edge egress proxy for the DLP gateway\nFeature-flag service for the pricing/docs kill-switch\nSIEM stream for audit logs",
        pattern_references:
          "Deflect-then-escalate · Scoped rollout · Handoff-with-context · Feature-flag kill-switch",
        guardrail_exceptions:
          "None — the decision deliberately stays inside current guardrails (DLP, SOC 2, feature-flag kill-switch).",
        risks_and_rollout_notes:
          "LLM hallucinations on product-specific questions → mitigated by scripted-first and low-confidence handoff. DLP misses → mitigated by audit-log review in week 1. CSAT regression → mitigated by the 10% → 100% ramp gated on the weekly review.",
      },
      workstreams,
    };
  }

  const workstreams: Workstream[] = [
    {
      id: crypto.randomUUID(),
      planId,
      title: "Realtime room foundation",
      description: "Harden room creation, presence, timeline fanout, and alignment board rendering for steady multi-user sessions.",
      suggestedOwnerId: firstOwnerId,
      ownerStatus: "proposed",
      size: "M",
      dependsOn: [],
      deliverables: ["Stable room join flow", "Realtime timeline updates", "Presence strip with current focus"],
      acceptanceChecks: ["Two browsers can collaborate live", "Room mode changes fan out under 100ms locally"],
      componentRefs: reusable.slice(0, 2),
      guardrailExceptions: [],
      firstStep: "Validate the room event contract and fix any missing state transitions.",
      rolloutNotes: "Run a scripted two-person room before broader demos.",
      openQuestions: [
        {
          text: "Do we need stronger reconnect handling before the recorded demo?",
          resolverId: firstOwnerId ?? "unassigned",
          dueBefore: "demo rehearsal",
        },
      ],
      patternRefs: snapshot.patterns.slice(0, 1).map((pattern) => pattern.id),
    },
    {
      id: crypto.randomUUID(),
      planId,
      title: "Orchestrator and private-agent loop",
      description: "Refine classifier heuristics or LLM calls, promotion flow, and routed private insights so the shared room stays denoised.",
      suggestedOwnerId: decisionOwners[1]?.id ?? firstOwnerId,
      ownerStatus: "proposed",
      size: "L",
      dependsOn: [],
      deliverables: ["Promote/discard workflow", "Targeted routed insights", "At-most-one orchestrator update per window"],
      acceptanceChecks: ["Pending private deltas never leak into shared state", "Rejecting a synthesis records a correction event"],
      componentRefs: reusable.slice(0, 3),
      guardrailExceptions: [],
      firstStep: "Tune the classifier/orchestrator prompts or heuristics against a recorded brainstorm.",
      rolloutNotes: "Watch for false agreement and noisy routing during evaluation.",
      openQuestions: [
        {
          text: "Should synthesis stay heuristic by default or move fully to OpenAI-backed responses before demos?",
          resolverId: decisionOwners[1]?.id ?? firstOwnerId ?? "unassigned",
          dueBefore: "pilot session",
        },
      ],
      patternRefs: snapshot.patterns.slice(0, 2).map((pattern) => pattern.id),
    },
    {
      id: crypto.randomUUID(),
      planId,
      title: "Shared decision and plan approval flow",
      description: "Close the loop from decide mode into reviewed decision sections, immutable revisions, generated workstreams, and approved plan state.",
      suggestedOwnerId: decisionOwners[2]?.id ?? firstOwnerId,
      ownerStatus: "proposed",
      size: "M",
      dependsOn: [],
      deliverables: ["Section review gates", "Plan owner acceptance", "Handoff package export"],
      acceptanceChecks: ["Decision approval blocked until 12 sections are populated and reviewed", "Plan approval blocked until every workstream has an accepted owner"],
      componentRefs: reusable.slice(0, 2),
      guardrailExceptions: [],
      firstStep: "Walk the approval gates against one dissent scenario and one happy path.",
      rolloutNotes: "Check for drift between the approved decision and generated plan revisions.",
      openQuestions: [],
      patternRefs: snapshot.patterns.slice(0, 3).map((pattern) => pattern.id),
    },
  ];

  return {
    planId,
    sections: {
      summary: `This alignment plan turns the approved shared decision for ${snapshot.room.topic} into executable workstreams while preserving room guardrails, reuse decisions, and clear owners.`,
      workstreams: workstreams.map((item) => `${item.title} (${item.size})`).join("\n"),
      sequence_and_dependencies: "Start with realtime room hardening, then stabilize the orchestrator loop, then freeze decision review, plan approval, and handoff export.",
      deliverables_and_acceptance_checks: workstreams
        .map((item) => `${item.title}: ${item.deliverables.join(", ")} | checks: ${item.acceptanceChecks.join(", ")}`)
        .join("\n"),
      open_implementation_questions: workstreams
        .flatMap((item) => item.openQuestions.map((question) => `${item.title}: ${question.text} (${question.dueBefore})`))
        .join("\n"),
      existing_components_to_reuse: reusable.join("\n"),
      pattern_references: snapshot.patterns.map((pattern) => `${pattern.title}: ${pattern.summary}`).join("\n"),
      guardrail_exceptions: "No guardrail exceptions proposed in the initial draft.",
      risks_and_rollout_notes: "Watch for false agreement, stale section claims, and plan drift after decision approval.",
    },
    workstreams,
  };
}

export class HeuristicAiAdapter implements AiAdapter {
  async classifyUtterance(input: {
    text: string;
    mode: RoomSnapshot["room"]["mode"];
  }): Promise<DetectedDelta[]> {
    const sentences = toSentenceList(input.text);
    const deltas: DetectedDelta[] = [];

    for (const sentence of sentences) {
      let matched = false;

      for (const classifier of classifiers) {
        if (classifier.patterns.some((pattern) => pattern.test(sentence))) {
          matched = true;
          deltas.push({
            deltaType: classifier.deltaType,
            nodeType: classifier.nodeType,
            text: sentence,
            confidence: input.mode === "decide" ? 0.82 : 0.74,
          });
        }
      }

      if (!matched) {
        deltas.push({
          deltaType: "option_detected",
          nodeType: input.mode === "decide" ? "agreement" : "option",
          text: sentence,
          confidence: 0.58,
        });
      }
    }

    return deltas;
  }

  async synthesize(snapshot: RoomSnapshot, recentEventSummaries: string[]): Promise<OrchestratorResult> {
    const blockers = summarizeNodes(snapshot, "unresolved_difference").concat(summarizeNodes(snapshot, "open_question"));
    const commonGround = summarizeNodes(snapshot, "agreement").concat(summarizeNodes(snapshot, "goal"));
    const latestParticipant = [...snapshot.participants].sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt))[0];
    const firstBlockerOwner = snapshot.participants.find((participant) => !snapshot.room.decisionOwnerIds.includes(participant.id)) ?? latestParticipant;
    const firstOwner = snapshot.participants.find((participant) => snapshot.room.decisionOwnerIds.includes(participant.id)) ?? latestParticipant;

    const synthesis = [
      commonGround.length ? `The room is converging on ${commonGround[0]}.` : "The room is still exploring candidate directions.",
      blockers.length ? `The main blocker is ${blockers[0]}.` : "No blocking disagreement is visible right now.",
      recentEventSummaries[0] ? `Most recent signal: ${recentEventSummaries[0]}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const targetedFeedback =
      firstBlockerOwner && firstOwner && firstBlockerOwner.id !== firstOwner.id
        ? [
            {
              participantId: firstBlockerOwner.id,
              message: `${firstOwner.displayName}'s recent proposal may help resolve your current blocker.`,
              deliveryScope: "private" as const,
            },
          ]
        : [];

    const routedInsights =
      firstBlockerOwner && firstOwner && firstBlockerOwner.id !== firstOwner.id
        ? [
            {
              fromActorId: firstOwner.id,
              toActorId: firstBlockerOwner.id,
              reason: blockers.length ? "relevant_blocker_resolution" : "relevant_domain_constraint",
            },
          ]
        : [];

    return {
      synthesis,
      suggestedNextMove:
        snapshot.room.mode === "explore"
          ? "narrow to 2 options"
          : snapshot.room.mode === "narrow"
            ? "switch to decide mode"
            : snapshot.room.mode === "decide"
              ? "draft decision wording"
              : "review shared decision sections",
      targetedFeedback,
      routedInsights,
      alignmentNodeDeltas: [],
    };
  }

  async draftAdrSection(snapshot: RoomSnapshot, section: AdrSectionKey): Promise<string> {
    return defaultSectionDraft(snapshot, section);
  }

  async generatePlan(snapshot: RoomSnapshot): Promise<GeneratedPlan> {
    return buildPlan(snapshot);
  }
}

export function createDefaultAdrSections() {
  return Object.fromEntries(adrSectionOrder.map((section) => [section, ""])) as Record<AdrSectionKey, string>;
}
