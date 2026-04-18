function extractOutputText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }
  if (Array.isArray(data?.output)) {
    const chunks = [];
    for (const item of data.output) {
      if (!Array.isArray(item?.content)) continue;
      for (const c of item.content) {
        if (typeof c?.text === "string" && c.text.trim()) chunks.push(c.text.trim());
      }
    }
    if (chunks.length) return chunks.join("\n");
  }
  return "";
}

async function callOpenAIJSON({ prompt, schemaName, schema, fallback }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ...fallback, _fallback_reason: "missing_openai_api_key" };

  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          schema
        }
      }
    })
  });

  if (!res.ok) {
    return { ...fallback, _fallback_reason: `openai_http_${res.status}` };
  }

  const data = await res.json();
  try {
    const text = extractOutputText(data);
    return JSON.parse(text || "{}");
  } catch {
    return { ...fallback, _fallback_reason: "openai_parse_failed" };
  }
}

function summarizeAuditContext(events) {
  if (!Array.isArray(events) || events.length === 0) return "(none)";
  return events
    .slice(0, 12)
    .map((e) => {
      let payloadSummary = "";
      try {
        const payload = JSON.parse(e.payload_json || "{}");
        if (payload.section_id) payloadSummary = `section=${payload.section_id}`;
        else if (payload.proposal_id) payloadSummary = `proposal=${payload.proposal_id}`;
        else payloadSummary = Object.keys(payload).slice(0, 2).join(",");
      } catch {
        payloadSummary = "";
      }
      return `${e.created_at} ${e.type} by ${e.actor_id}${payloadSummary ? ` (${payloadSummary})` : ""}`;
    })
    .join("\n");
}

export async function runOrchestrator(input) {
  const auditContext = summarizeAuditContext(input.auditContext);
  const parsed = await callOpenAIJSON({
    prompt: `You are an orchestrator for governed docs changes. Return strict JSON with keys qualityScore(0-1), ambiguities(string[]), reviewSummary(max 80 words), conflictExplanation(max 80 words).\nSection: ${input.sectionTitle}\nSummary: ${input.summary}\nRationale: ${input.rationale || ""}\nCurrent:\n${input.currentContent}\n\nProposed:\n${input.proposedPatch}\n\nRecent audit context:\n${auditContext}`,
    schemaName: "orchestrator_triage",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        qualityScore: { type: "number", minimum: 0, maximum: 1 },
        ambiguities: { type: "array", items: { type: "string" } },
        reviewSummary: { type: "string" },
        conflictExplanation: { type: "string" }
      },
      required: ["qualityScore", "ambiguities", "reviewSummary", "conflictExplanation"]
    },
    fallback: {
      qualityScore: 0.72,
      ambiguities: input.rationale ? [] : ["missing_rationale_context"],
      reviewSummary: "Proposal appears actionable. Review terminology consistency and policy impact before approval.",
      conflictExplanation: "If conflicts appear, compare changed lines and preserve policy-critical language in final merged text."
    }
  });

  return {
    qualityScore: parsed.qualityScore ?? 0.7,
    ambiguities: parsed.ambiguities ?? [],
    reviewSummary: parsed.reviewSummary ?? "Review manually.",
    conflictExplanation: parsed.conflictExplanation ?? "Merge carefully."
  };
}

export async function runAgentChat(input) {
  const latestMessage = String(input.message || "").toLowerCase();
  const historyText = (input.history || [])
    .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.text}`)
    .join("\n");
  const orchestrationText = input.orchestration
    ? `qualityScore=${input.orchestration.qualityScore}; ambiguities=${(input.orchestration.ambiguities || []).join(",")}; reviewSummary=${input.orchestration.reviewSummary}`
    : "none";
  const workspaceSignalsText = (input.workspaceSignals || [])
    .map((s) => `${s.status}: ${s.summary}`)
    .join(" | ");
  const auditContext = summarizeAuditContext(input.auditContext);

  const fallback = {
    reply: latestMessage.includes("sonnet")
      ? "Here is proposal-ready markdown you can paste into the section:\n\n## Shakespeare Sonnet\n\nShall I compare thee to a summer's day?\nThou art more lovely and more temperate:\nRough winds do shake the darling buds of May,\nAnd summer's lease hath all too short a date;\nSometime too hot the eye of heaven shines,\nAnd often is his gold complexion dimm'd;\nAnd every fair from fair sometime declines,\nBy chance or nature's changing course untrimm'd;\nBut thy eternal summer shall not fade,\nNor lose possession of that fair thou ow'st;\nNor shall death brag thou wander'st in his shade,\nWhen in eternal lines to time thou grow'st:\n  So long as men can breathe or eyes can see,\n  So long lives this, and this gives life to thee."
      : "I could not reach the model. I can still draft concrete markdown updates if you tell me exactly what should be added or changed.",
    suggestions: latestMessage.includes("sonnet")
      ? ["Use this as proposal patch text.", "Add rationale: 'demo literary example'.", "Submit as agent-assisted proposal."]
      : ["Ask for exact markdown to add.", "Ask for a concise proposed diff.", "Ask for risk/owner impact summary."]
  };

  const parsed = await callOpenAIJSON({
    prompt: `You are an assistant in a governed knowledge workspace. Be practical and action-oriented.
Section title: ${input.sectionTitle}
Section topic: ${input.sectionTopic}
Current section markdown:
${input.currentContent}

Conversation so far:
${historyText || "(none)"}

Background orchestrator signal:
${orchestrationText}

Other workspace agent/proposal signals:
${workspaceSignalsText || "(none)"}

Recent audit context:
${auditContext}

Latest user message:
${input.message}

If user asks to add content, include the exact markdown text they can paste into a proposal. Return strict JSON with keys:
- reply (string, <=220 words)
- suggestions (array of <=3 short actionable strings)`,
    schemaName: "agent_chat",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        reply: { type: "string" },
        suggestions: { type: "array", items: { type: "string" }, maxItems: 3 }
      },
      required: ["reply", "suggestions"]
    },
    fallback
  });

  return {
    reply: parsed.reply || fallback.reply,
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : fallback.suggestions,
    fallback_reason: parsed._fallback_reason || null
  };
}
