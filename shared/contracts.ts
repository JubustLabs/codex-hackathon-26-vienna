export const roomModes = ["explore", "narrow", "decide", "draft_adr"] as const;
export type RoomMode = (typeof roomModes)[number];

export const alignmentNodeTypes = [
  "goal",
  "constraint",
  "option",
  "tradeoff",
  "risk",
  "open_question",
  "agreement",
  "unresolved_difference",
] as const;
export type AlignmentNodeType = (typeof alignmentNodeTypes)[number];

export const adrSectionOrder = [
  "title",
  "status",
  "context",
  "goals",
  "constraints",
  "options_considered",
  "decision",
  "tradeoffs",
  "consequences",
  "implementation_guidance",
  "related_patterns",
  "approvers",
] as const;
export type AdrSectionKey = (typeof adrSectionOrder)[number];
export function isAdrSectionKey(value: string): value is AdrSectionKey {
  return adrSectionOrder.includes(value as AdrSectionKey);
}

export const planSectionOrder = [
  "summary",
  "workstreams",
  "sequence_and_dependencies",
  "deliverables_and_acceptance_checks",
  "open_implementation_questions",
  "existing_components_to_reuse",
  "pattern_references",
  "guardrail_exceptions",
  "risks_and_rollout_notes",
] as const;
export type PlanSectionKey = (typeof planSectionOrder)[number];
export function isPlanSectionKey(value: string): value is PlanSectionKey {
  return planSectionOrder.includes(value as PlanSectionKey);
}

export interface Participant {
  id: string;
  roomId: string;
  displayName: string;
  role: "decision_owner" | "contributor" | "observer";
  joinedAt: string;
  lastSeenAt: string;
}

export interface AlignmentNode {
  id: string;
  roomId: string;
  type: AlignmentNodeType;
  text: string;
  confidence: number;
  createdBy: string;
  lastTouchedAt: string;
  sourceEventIds: string[];
  supersedesId?: string | null;
}

export interface OrchestratorUpdate {
  id: string;
  roomId: string;
  synthesis: string;
  suggestedNextMove: string | null;
  targetedFeedback: Array<{
    participantId: string;
    message: string;
    deliveryScope: "private";
  }>;
  routedInsights: Array<{
    fromActorId: string;
    toActorId: string;
    reason: string;
  }>;
  sourceEventIds: string[];
  createdAt: string;
}

export interface PendingAgentDelta {
  id: string;
  roomId: string;
  ownerId: string;
  sourceAgent: string;
  type: string;
  text: string;
  confidence: number;
  status: "pending" | "promoted" | "discarded";
  createdAt: string;
}

export interface SocketPingMessage {
  type: "ping";
}

export interface SocketPongMessage {
  type: "pong";
}

export interface SocketErrorMessage {
  type: "socket.error";
  error: string;
  requestId?: string;
}

export interface RoomSocketReadyMessage {
  type: "room.socket.ready";
  roomId: string;
  participantId?: string;
}

export interface RoomInvalidateMessage {
  type: "room.invalidate";
  roomId: string;
  reason?: string;
}

export type RoomSocketClientMessage = SocketPingMessage;
export type RoomSocketServerMessage =
  | RoomSocketReadyMessage
  | RoomInvalidateMessage
  | SocketPongMessage;

export interface AgentSocketReadyMessage {
  type: "agent.socket.ready";
  roomId: string;
  participantId: string;
  sourceAgent: string;
}

export interface AgentDeltaSubmitMessage {
  type: "agent.delta.submit";
  requestId?: string;
  sourceAgent?: string;
  deltaType?: string;
  text: string;
  confidence?: number;
}

export interface AgentDeltaAcceptedMessage {
  type: "agent.delta.accepted";
  requestId?: string;
  roomId: string;
  participantId: string;
  delta: PendingAgentDelta;
}

export interface AgentDeltaStatusMessage {
  type: "agent.delta.status";
  roomId: string;
  participantId: string;
  status: PendingAgentDelta["status"];
  delta: PendingAgentDelta;
}

export type AgentSocketClientMessage =
  | SocketPingMessage
  | AgentDeltaSubmitMessage;
export type AgentSocketServerMessage =
  | AgentSocketReadyMessage
  | AgentDeltaAcceptedMessage
  | AgentDeltaStatusMessage
  | RoomInvalidateMessage
  | SocketErrorMessage
  | SocketPongMessage;

export interface Guardrail {
  id: string;
  key: string;
  title: string;
  description: string;
  severity: "hard" | "soft";
}

export interface Pattern {
  id: string;
  title: string;
  tags: string[];
  summary: string;
}

export interface ComponentEntry {
  id: string;
  title: string;
  kind: string;
  summary: string;
  evidence: string[];
  status: "candidate" | "confirmed" | "ignored";
}

export interface OwnershipClaim {
  id: string;
  roomId: string;
  scopeType: "adr_section" | "plan_item";
  scopeId: string;
  ownerId: string;
  updatedAt: string;
  expiresAt: string;
}

export interface Workstream {
  id: string;
  planId: string;
  title: string;
  description: string;
  suggestedOwnerId: string | null;
  ownerStatus: "proposed" | "accepted";
  size: "S" | "M" | "L";
  dependsOn: string[];
  deliverables: string[];
  acceptanceChecks: string[];
  componentRefs: string[];
  guardrailExceptions: string[];
  firstStep: string;
  rolloutNotes: string;
  openQuestions: Array<{ text: string; resolverId: string; dueBefore: string }>;
  patternRefs: string[];
}

export interface RoomSummary {
  id: string;
  topic: string;
  decision: string;
  goal: string;
  nonGoals: string;
  scope: string;
  successBar: string;
  topicTags: string[];
  mode: RoomMode;
  createdAt: string;
  decisionOwnerIds: string[];
}

export interface RoomSnapshot {
  room: RoomSummary;
  participants: Participant[];
  guardrails: Guardrail[];
  patterns: Pattern[];
  components: ComponentEntry[];
  alignmentNodes: AlignmentNode[];
  orchestratorUpdates: OrchestratorUpdate[];
  pendingDeltas: PendingAgentDelta[];
  routedToParticipant: Array<{
    id: string;
    participantId: string;
    message: string;
    createdAt: string;
    /** "conflict" items ask the participant to resolve an inconsistency
     *  (an overlapped claim, recorded dissent, …). Absent or "orchestrator"
     *  means a routine nudge from the synthesis step. */
    kind?: "orchestrator" | "conflict";
  }>;
  adr: {
    id: string;
    status: "draft" | "in_review" | "approved";
    sections: Record<AdrSectionKey, string>;
    reviews: Record<AdrSectionKey, string[]>;
    approvals: string[];
  };
  plan: {
    id: string | null;
    status: "draft" | "in_review" | "approved" | null;
    sections: Record<PlanSectionKey, string>;
    workstreams: Workstream[];
    approvals: string[];
  };
  claims: OwnershipClaim[];
  recentEvents: Array<{
    id: string;
    type: string;
    actorId: string;
    timestamp: string;
    summary: string;
  }>;
  readiness: {
    adrSectionsPopulated: boolean;
    adrReviewed: boolean;
    unresolvedDifferencesCleared: boolean;
    acceptedWorkstreamOwners: boolean;
  };
}
