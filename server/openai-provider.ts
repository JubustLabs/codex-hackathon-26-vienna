import OpenAI from "openai";

import type { AdrSectionKey, RoomSnapshot } from "@shared/contracts";

import { HeuristicAiAdapter } from "./engine";
import type { AiAdapter, DetectedDelta, GeneratedPlan, OrchestratorResult } from "./provider";

function parseJsonFromText<T>(text: string, fallback: T): T {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as T;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export class OpenAiResponsesAdapter implements AiAdapter {
  private readonly client: OpenAI;
  private readonly fallback = new HeuristicAiAdapter();

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async classifyUtterance(input: {
    text: string;
    mode: RoomSnapshot["room"]["mode"];
  }): Promise<DetectedDelta[]> {
    const fallback = await this.fallback.classifyUtterance(input);
    const response = await this.client.responses.create({
      model: "gpt-5.4-nano",
      input: `Return JSON with a "deltas" array. Each delta needs deltaType, nodeType, text, confidence.\nMode: ${input.mode}\nText: ${input.text}`,
    });
    const parsed = parseJsonFromText<{ deltas: DetectedDelta[] }>(response.output_text ?? "", { deltas: fallback });
    return parsed.deltas.length ? parsed.deltas : fallback;
  }

  async synthesize(snapshot: RoomSnapshot, recentEventSummaries: string[]): Promise<OrchestratorResult> {
    const fallback = await this.fallback.synthesize(snapshot, recentEventSummaries);
    const response = await this.client.responses.create({
      model: "gpt-5.4-mini",
      input: `Summarize the room state as JSON with synthesis, suggestedNextMove, targetedFeedback, routedInsights.\nMode: ${snapshot.room.mode}\nRecent: ${recentEventSummaries.join(" | ")}`,
    });
    return parseJsonFromText<OrchestratorResult>(response.output_text ?? "", fallback);
  }

  async draftAdrSection(snapshot: RoomSnapshot, section: AdrSectionKey): Promise<string> {
    const fallback = await this.fallback.draftAdrSection(snapshot, section);
    const response = await this.client.responses.create({
      model: "gpt-5.4-mini",
      input: `Draft the ADR section "${section}" for this room.\nTopic: ${snapshot.room.topic}\nGoal: ${snapshot.room.goal}\nConstraints: ${snapshot.alignmentNodes
        .filter((node) => node.type === "constraint")
        .map((node) => node.text)
        .join("; ")}`,
    });
    return response.output_text?.trim() || fallback;
  }

  async generatePlan(snapshot: RoomSnapshot): Promise<GeneratedPlan> {
    return this.fallback.generatePlan(snapshot);
  }
}
