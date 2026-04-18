import type { AdrSectionKey, RoomMode } from "@shared/contracts";

export const roomModeLabels: Record<RoomMode, string> = {
  explore: "explore",
  narrow: "narrow",
  decide: "pick a direction",
  draft_adr: "shape the shared decision",
};

export const decisionSectionLabels: Record<AdrSectionKey, string> = {
  title: "Decision title",
  status: "Status",
  context: "What is happening",
  goals: "What matters most",
  constraints: "Limits",
  options_considered: "Options we looked at",
  decision: "Chosen path",
  tradeoffs: "Tradeoffs",
  consequences: "What happens because of this",
  implementation_guidance: "How to carry it out",
  related_patterns: "Helpful examples",
  approvers: "Who agrees",
};

export function labelRoomMode(mode: RoomMode) {
  return roomModeLabels[mode];
}

export function labelDecisionSection(section: AdrSectionKey | string) {
  return decisionSectionLabels[section as AdrSectionKey] ?? section.replaceAll("_", " ");
}

export function splitDecisionText(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function firstFilledLine(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) {
      continue;
    }
    const line = splitDecisionText(value)[0];
    if (line) {
      return line;
    }
  }
  return "";
}
