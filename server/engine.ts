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
    title: `${snapshot.room.topic} ADR`,
    status: snapshot.adr.status === "approved" ? "Approved" : "Draft",
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
      title: "ADR and plan approval workflow",
      description: "Close the loop from decide mode into reviewed ADR sections, immutable revisions, generated workstreams, and approved plan state.",
      suggestedOwnerId: decisionOwners[2]?.id ?? firstOwnerId,
      ownerStatus: "proposed",
      size: "M",
      dependsOn: [],
      deliverables: ["Section review gates", "Plan owner acceptance", "Handoff package export"],
      acceptanceChecks: ["ADR approval blocked until 12 sections are populated and reviewed", "Plan approval blocked until every workstream has an accepted owner"],
      componentRefs: reusable.slice(0, 2),
      guardrailExceptions: [],
      firstStep: "Walk the approval gates against one dissent scenario and one happy path.",
      rolloutNotes: "Check for drift between approved ADR and generated plan revisions.",
      openQuestions: [],
      patternRefs: snapshot.patterns.slice(0, 3).map((pattern) => pattern.id),
    },
  ];

  return {
    planId,
    sections: {
      summary: `This plan turns the approved ADR for ${snapshot.room.topic} into executable workstreams while preserving room guardrails, reuse decisions, and clear owners.`,
      workstreams: workstreams.map((item) => `${item.title} (${item.size})`).join("\n"),
      sequence_and_dependencies: "Start with realtime room hardening, then stabilize the orchestrator loop, then freeze ADR/plan approval and handoff export.",
      deliverables_and_acceptance_checks: workstreams
        .map((item) => `${item.title}: ${item.deliverables.join(", ")} | checks: ${item.acceptanceChecks.join(", ")}`)
        .join("\n"),
      open_implementation_questions: workstreams
        .flatMap((item) => item.openQuestions.map((question) => `${item.title}: ${question.text} (${question.dueBefore})`))
        .join("\n"),
      existing_components_to_reuse: reusable.join("\n"),
      pattern_references: snapshot.patterns.map((pattern) => `${pattern.title}: ${pattern.summary}`).join("\n"),
      guardrail_exceptions: "No guardrail exceptions proposed in the initial draft.",
      risks_and_rollout_notes: "Watch for false agreement, stale section claims, and plan drift after ADR approval.",
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
              : "review ADR sections",
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
