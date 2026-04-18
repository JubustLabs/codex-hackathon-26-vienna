import { adrSectionOrder, type AdrSectionKey, type RoomMode } from "@shared/contracts";

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

// Sections that read better as a bulleted list when the author split them
// across multiple lines (options, tradeoffs, risks, …). Single-line values
// still render as a plain paragraph regardless of this set.
const BULLETED_SECTIONS: ReadonlySet<AdrSectionKey> = new Set([
  "options_considered",
  "tradeoffs",
  "consequences",
  "related_patterns",
  "approvers",
]);

export function buildAdrMarkdown(adr: {
  status: string;
  sections: Record<AdrSectionKey, string>;
}): string {
  const title = firstFilledLine(adr.sections.title) || "Shared decision";
  const lines: string[] = [`# ${title}`, "", `**Status:** ${String(adr.status).replaceAll("_", " ")}`];
  for (const section of adrSectionOrder) {
    if (section === "title" || section === "status") continue;
    const body = adr.sections[section]?.trim();
    if (!body) continue;
    lines.push("", `## ${labelDecisionSection(section)}`, "");
    const parts = splitDecisionText(body);
    if (BULLETED_SECTIONS.has(section) && parts.length > 1) {
      for (const part of parts) lines.push(`- ${part}`);
    } else {
      lines.push(parts.join("\n\n"));
    }
  }
  return `${lines.join("\n")}\n`;
}
