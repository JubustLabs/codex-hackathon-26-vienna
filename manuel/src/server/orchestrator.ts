import { Agent, run } from "@openai/agents";
import { z } from "zod";
import type { ConflictPacket, Delta, ParticipantId, RoomPhase, RoomState } from "../types";

const packetRecommendationSchema = z.object({
  topic: z.string(),
  whyConflictDetected: z.string(),
  suggestedNextStep: z.string()
});

const orchestratorOutputSchema = z.object({
  phase: z.enum(["exploring", "conflicted", "converging", "ready_to_plan"]),
  synthesisTitle: z.string(),
  synthesisBody: z.string(),
  currentBlocker: z.string(),
  whatStillConflicts: z.array(z.string()).max(4),
  commonGround: z.array(z.string()).max(4),
  decision: z.string().nullable(),
  tradeoffs: z.array(z.string()).max(4),
  plan: z.array(z.string()).max(5),
  breadcrumbs: z.array(z.string()).max(5),
  packets: z.object({
    maya: packetRecommendationSchema.nullable(),
    alex: packetRecommendationSchema.nullable()
  })
});

type OrchestratorOutput = z.infer<typeof orchestratorOutputSchema>;

const orchestratorAgent = new Agent({
  name: "Converge Orchestrator",
  model: process.env.CONVERGE_ORCHESTRATOR_MODEL ?? "gpt-5.4",
  instructions: `
You are the shared orchestrator for Converge, a live architecture decision room.

Your job is to help a support lead and an engineering lead converge on a practical build decision for a customer service agent.

Output rules:
- Stay grounded in the evidence and published deltas only.
- Prefer calm, direct language. No hype.
- Keep the room legible for mixed domain and technical participants.
- If there is not enough information for a final decision, do not invent one.
- Use phase guidance:
  - exploring: one or zero published deltas total
  - conflicted: both lanes have published but there is still a core disagreement
  - converging: clear common ground is visible and a likely direction is emerging
  - ready_to_plan: a concrete architecture direction is agreed enough to plan
- In this seeded customer-service-agent scenario, you should be willing to finalize once the room has all of the following:
  - a retrieval-first answer path for low-risk questions
  - explicit early escalation for billing, refunds, account access, and low-confidence cases
  - agreement that the first version is workflow-driven, local-first, and reuses the current stack
- Do not block on perfect policy exhaustiveness. If the remaining ambiguity is only about fine-grained topic splits, but the v1 architecture direction is already clear, move to ready_to_plan and encode the remaining nuance as tradeoffs or plan steps rather than keeping the room conflicted.
- Only include packet recommendations when there is an active conflict that should be routed back to the private lanes.
- Plans should be concise and implementation-shaped.
- Breadcrumbs should read like short traces of how the decision formed.
`.trim(),
  outputType: orchestratorOutputSchema
});

export function getOrchestratorMode() {
  return process.env.OPENAI_API_KEY ? "openai-agent" : "scripted-fallback";
}

export async function recomputeRoom(roomState: RoomState) {
  if (!process.env.OPENAI_API_KEY) {
    applyFallbackUpdate(roomState);
    return;
  }

  try {
    const result = await run(orchestratorAgent, buildPrompt(roomState));
    const output = result.finalOutput as OrchestratorOutput | undefined;

    if (!output) {
      applyFallbackUpdate(roomState);
      return;
    }

    applyOrchestratorOutput(roomState, output);
    applyReadyToPlanPromotion(roomState);
  } catch (error) {
    console.error("Converge orchestrator failed, using fallback:", error);
    applyFallbackUpdate(roomState);
  }
}

function buildPrompt(roomState: RoomState) {
  const payload = {
    topic: roomState.topic,
    decisionToMake: roomState.decisionToMake,
    whyNow: roomState.whyNow,
    currentBlocker: roomState.currentBlocker,
    whatWereDeciding: roomState.whatWereDeciding,
    participants: Object.fromEntries(
      Object.entries(roomState.participants).map(([participantId, participant]) => [
        participantId,
        {
          name: participant.name,
          role: participant.role,
          laneTitle: participant.laneTitle,
          evidence: participant.evidence,
          published: participant.published.map((delta) => ({
            type: delta.type,
            text: delta.text,
            confidence: delta.confidence
          })),
          packetsAcknowledged: participant.packets.filter((packet) => packet.acknowledged).length
        }
      ])
    )
  };

  return `
Converge room state:
${JSON.stringify(payload, null, 2)}

Return the best current orchestration update for this room.
`;
}

function applyOrchestratorOutput(roomState: RoomState, output: OrchestratorOutput) {
  roomState.phase = output.phase;
  roomState.synthesisTitle = output.synthesisTitle;
  roomState.synthesisBody = output.synthesisBody;
  roomState.currentBlocker = output.currentBlocker;
  roomState.whatStillConflicts = output.whatStillConflicts;
  roomState.commonGround = output.commonGround;
  roomState.decision = output.decision;
  roomState.tradeoffs = output.tradeoffs;
  roomState.plan = output.plan;
  roomState.breadcrumbs = output.breadcrumbs.map((text, index) => ({
    id: `crumb-${index + 1}`,
    text
  }));

  roomState.participants.maya.packets = output.packets.maya
    ? [buildPacket("maya", roomState, output.packets.maya)]
    : [];
  roomState.participants.alex.packets = output.packets.alex
    ? [buildPacket("alex", roomState, output.packets.alex)]
    : [];
}

function applyReadyToPlanPromotion(roomState: RoomState) {
  const mayaTexts = roomState.participants.maya.published.map((delta) => delta.text.toLowerCase());
  const alexTexts = roomState.participants.alex.published.map((delta) => delta.text.toLowerCase());

  const hasMayaGuardrails = mayaTexts.some(
    (text) =>
      text.includes("billing") &&
      text.includes("refund") &&
      text.includes("account access") &&
      text.includes("low-confidence")
  );

  const hasAlexRetrieval = alexTexts.some(
    (text) => text.includes("retrieval-first") || (text.includes("low-risk") && text.includes("confidence"))
  );

  const hasEnoughSignals =
    roomState.participants.maya.published.length >= 2 &&
    roomState.participants.alex.published.length >= 2 &&
    hasMayaGuardrails &&
    hasAlexRetrieval;

  if (!hasEnoughSignals || roomState.decision) {
    return;
  }

  roomState.phase = "ready_to_plan";
  roomState.synthesisTitle = "Decision ready: retrieval-first answers with explicit early escalation";
  roomState.synthesisBody =
    "The room has enough alignment to commit the first architecture direction. Alex has narrowed the answer path to low-risk retrieval-backed questions with confidence thresholds, and Maya has made the safety boundary explicit: billing, refunds, account access, and low-confidence cases escalate immediately. That is sufficient to lock a workflow-first, local-first v1 without waiting for finer policy detail.";
  roomState.currentBlocker =
    "The core architecture direction is now agreed. Remaining nuance belongs in routing rules and rollout, not in the top-level decision.";
  roomState.whatStillConflicts = [];
  roomState.commonGround = [
    "Use retrieval first for common, low-risk support questions.",
    "Escalate billing, refunds, account access, and low-confidence cases immediately.",
    "Keep the MVP workflow-driven rather than fully autonomous.",
    "Stay local-first and reuse the current docs search and auth stack."
  ];
  roomState.decision =
    "Build a retrieval-first customer service agent that answers low-risk questions directly and uses explicit workflow-based escalation for billing, refunds, account access, and all low-confidence cases.";
  roomState.tradeoffs = [
    "This v1 is intentionally conservative and will escalate earlier than a more autonomous system.",
    "The narrower safe-answer scope improves trust and policy control, but limits early automation coverage.",
    "A workflow-first architecture ships faster on the current stack, but leaves more advanced autonomy for later iterations."
  ];
  roomState.plan = [
    "Define the v1 answer allowlist for clearly informational, low-risk support questions.",
    "Define the escalation denylist for billing, refunds, account access, and all low-confidence cases.",
    "Implement retrieval-backed answering on top of existing docs search.",
    "Add workflow routing and explicit handoff logic using the current auth and support stack.",
    "Validate the first release with confidence gating and operator-visible handoff paths."
  ];
  roomState.breadcrumbs = [
    { id: "crumb-1", text: "Alex narrowed the answer path to retrieval-first, low-risk questions." },
    { id: "crumb-2", text: "Maya narrowed the escalation policy to protected topics plus low-confidence cases." },
    { id: "crumb-3", text: "Both lanes already agreed on local-first, current-stack reuse, and workflow control." },
    { id: "crumb-4", text: "The remaining policy detail no longer blocks the top-level architecture choice." }
  ];
  roomState.participants.maya.packets = [];
  roomState.participants.alex.packets = [];
}

function buildPacket(
  participantId: ParticipantId,
  roomState: RoomState,
  recommendation: OrchestratorOutput["packets"]["maya"]
): ConflictPacket {
  const own = roomState.participants[participantId].published.at(-1);
  const otherParticipantId: ParticipantId = participantId === "maya" ? "alex" : "maya";
  const other = roomState.participants[otherParticipantId].published.at(-1);
  const previous = roomState.participants[participantId].packets[0];

  return {
    id: previous?.id ?? `conflict-${participantId}`,
    participantId,
    topic: recommendation?.topic ?? "agent direction",
    yourClaim: own?.text ?? "No claim published yet.",
    otherClaim: other?.text ?? "The other lane has not published yet.",
    whyConflictDetected: recommendation?.whyConflictDetected ?? "The room needs a sharper question.",
    suggestedNextStep: recommendation?.suggestedNextStep ?? "Clarify the next decision boundary.",
    acknowledged: previous?.acknowledged ?? false
  };
}

function applyFallbackUpdate(roomState: RoomState) {
  const mayaCount = roomState.participants.maya.published.length;
  const alexCount = roomState.participants.alex.published.length;

  if (mayaCount === 0 && alexCount === 0) {
    roomState.phase = "exploring";
    roomState.synthesisTitle = "Seeded room ready";
    roomState.synthesisBody =
      "The room is loaded with one clear disagreement: Maya wants earlier escalation for trust and control, while Alex wants direct answers where retrieval looks safe.";
    roomState.whatStillConflicts = [
      "How much autonomy should the agent have before human handoff?",
      "Where should confidence thresholds force escalation?"
    ];
    roomState.commonGround = [
      "The agent should reuse existing docs/search/auth pieces.",
      "High-risk support topics need explicit rules."
    ];
    roomState.decision = null;
    roomState.tradeoffs = [];
    roomState.plan = [];
    roomState.breadcrumbs = [];
    roomState.participants.maya.packets = [];
    roomState.participants.alex.packets = [];
    return;
  }

  if (mayaCount + alexCount === 1) {
    roomState.phase = "exploring";
    roomState.synthesisTitle = mayaCount === 1 ? "Maya shared a trust-first position" : "Alex shared a speed-first position";
    roomState.synthesisBody =
      mayaCount === 1
        ? "The room now has an explicit trust constraint: Maya wants early escalation for high-risk support topics."
        : "The room now has an explicit usefulness option: Alex wants direct answers where retrieval looks safe.";
    roomState.participants.maya.packets = [];
    roomState.participants.alex.packets = [];
    roomState.decision = null;
    roomState.tradeoffs = [];
    roomState.plan = [];
    roomState.breadcrumbs = [];
    return;
  }

  if (mayaCount < 2 || alexCount < 2) {
    roomState.phase = "conflicted";
    roomState.synthesisTitle = "Conflict detected";
    roomState.synthesisBody =
      "The room now has a real conflict: broader direct answering improves usefulness, while earlier escalation protects trust and policy compliance.";
    roomState.whatStillConflicts = [
      "Should the agent answer directly by default?",
      "Which support topics must escalate immediately?"
    ];
    roomState.commonGround = [
      "Reuse existing docs and support content.",
      "High-risk topics need explicit escalation rules."
    ];
    roomState.decision = null;
    roomState.tradeoffs = [];
    roomState.plan = [];
    roomState.breadcrumbs = [];
    roomState.participants.maya.packets = [
      buildPacket("maya", roomState, {
        topic: "agent autonomy",
        whyConflictDetected: "The two lanes imply different thresholds for when the agent should stop and hand off.",
        suggestedNextStep: "What topics must always escalate?"
      })
    ];
    roomState.participants.alex.packets = [
      buildPacket("alex", roomState, {
        topic: "agent autonomy",
        whyConflictDetected: "The two lanes imply different thresholds for when the agent should stop and hand off.",
        suggestedNextStep: "What questions are safe to answer directly?"
      })
    ];
    return;
  }

  roomState.phase = "ready_to_plan";
  roomState.synthesisTitle = "Common ground found";
  roomState.synthesisBody =
    "Maya and Alex now agree on a retrieval-first agent that answers low-risk questions directly but escalates early on high-risk and low-confidence cases.";
  roomState.whatStillConflicts = [];
  roomState.commonGround = [
    "Use retrieval over existing docs and support content.",
    "Escalate billing, refunds, account access, and low-confidence answers early.",
    "Keep escalation logic explicit and reviewable."
  ];
  roomState.decision =
    "Build a retrieval-first customer service agent with strict early escalation rules for high-risk topics and low-confidence answers.";
  roomState.tradeoffs = [
    "More early escalations reduce automation coverage.",
    "Strict escalation improves operator trust and policy safety."
  ];
  roomState.plan = [
    "Define safe answer vs escalation categories.",
    "Connect retrieval over existing support docs and help content.",
    "Add explicit escalation rules and confidence thresholds.",
    "Ship a first operator-visible handoff flow."
  ];
  roomState.breadcrumbs = [
    { id: "crumb-maya", text: "Maya: protect trust" },
    { id: "crumb-alex", text: "Alex: reuse existing systems" },
    { id: "crumb-conflict", text: "Conflict: autonomy vs escalation" },
    { id: "crumb-decision", text: "Decision: retrieval-first + early escalation" }
  ];
  roomState.participants.maya.packets = [];
  roomState.participants.alex.packets = [];
}
