import type {
  AdrSectionKey,
  AlignmentNode,
  ComponentEntry,
  Guardrail,
  Pattern,
  RoomMode,
  RoomSnapshot,
  Workstream,
} from "@shared/contracts";

export interface DetectedDelta {
  deltaType: string;
  nodeType:
    | "goal"
    | "constraint"
    | "option"
    | "tradeoff"
    | "risk"
    | "open_question"
    | "agreement"
    | "unresolved_difference";
  text: string;
  confidence: number;
}

export interface OrchestratorResult {
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
  alignmentNodeDeltas: Array<{
    op: "add" | "update";
    node: AlignmentNode;
  }>;
}

export interface GeneratedPlan {
  planId: string;
  sections: RoomSnapshot["plan"]["sections"];
  workstreams: Workstream[];
}

export interface AiAdapter {
  classifyUtterance(input: {
    text: string;
    mode: RoomMode;
    guardrails: Guardrail[];
    components: ComponentEntry[];
  }): Promise<DetectedDelta[]>;
  synthesize(snapshot: RoomSnapshot, recentEventSummaries: string[]): Promise<OrchestratorResult>;
  draftAdrSection(snapshot: RoomSnapshot, section: AdrSectionKey): Promise<string>;
  generatePlan(snapshot: RoomSnapshot): Promise<GeneratedPlan>;
}

export function matchPatterns(patterns: Pattern[], topicTags: string[], text: string) {
  const lowered = `${topicTags.join(" ")} ${text}`.toLowerCase();
  return patterns
    .map((pattern) => ({
      pattern,
      score: pattern.tags.filter((tag) => lowered.includes(tag.toLowerCase())).length,
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map((entry) => entry.pattern);
}
