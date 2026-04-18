export type ParticipantId = "maya" | "alex";

export type DeltaType =
  | "goal"
  | "constraint"
  | "option"
  | "risk"
  | "tradeoff"
  | "open_question"
  | "evidence"
  | "reuse_candidate";

export type RoomPhase = "exploring" | "conflicted" | "converging" | "ready_to_plan";

export type EvidenceFragment = {
  label: string;
  text: string;
  emphasis?: boolean;
};

export type Suggestion = {
  id: string;
  type: DeltaType;
  text: string;
  source: string;
  confidence: number;
};

export type Delta = {
  id: string;
  participantId: ParticipantId;
  type: DeltaType;
  text: string;
  source: string;
  confidence: number;
};

export type ConflictPacket = {
  id: string;
  participantId: ParticipantId;
  topic: string;
  yourClaim: string;
  otherClaim: string;
  whyConflictDetected: string;
  suggestedNextStep: string;
  acknowledged: boolean;
};

export type ParticipantState = {
  id: ParticipantId;
  name: string;
  role: string;
  laneTitle: string;
  connected: boolean;
  pluginConnected: boolean;
  evidence: EvidenceFragment[];
  suggestions: Suggestion[];
  published: Delta[];
  packets: ConflictPacket[];
};

export type DecisionBreadcrumb = {
  id: string;
  text: string;
};

export type RoomState = {
  roomId: string;
  topic: string;
  decisionToMake: string;
  whyNow: string;
  currentBlocker: string;
  phase: RoomPhase;
  participants: Record<ParticipantId, ParticipantState>;
  synthesisTitle: string;
  synthesisBody: string;
  whatWereDeciding: string[];
  whatStillConflicts: string[];
  commonGround: string[];
  decision: string | null;
  tradeoffs: string[];
  plan: string[];
  breadcrumbs: DecisionBreadcrumb[];
};
