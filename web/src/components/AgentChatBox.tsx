import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMsg = {
  role: "user" | "assistant";
  text: string;
  suggestions?: string[];
  fallbackReason?: string | null;
};

export function AgentChatBox({
  actorId,
  sectionId,
  onAsk,
  onSubmitProposal
}: {
  actorId: string;
  sectionId: string;
  onAsk: (
    message: string,
    history: { role: "user" | "assistant"; text: string }[]
  ) => Promise<{ reply: string; suggestions: string[]; fallback_reason?: string | null }>;
  onSubmitProposal: (payload: { summary: string; proposed_patch: string; rationale: string }) => Promise<void>;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("Agent-assisted update");
  const [rationale, setRationale] = useState("Generated from agent chat");

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    setLoading(true);
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setInput("");
    try {
      const reply = await onAsk(msg, messages);
      setMessages((m) => [
        ...m,
        { role: "assistant", text: reply.reply, suggestions: reply.suggestions, fallbackReason: reply.fallback_reason || null }
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function submitLastAssistantMessage() {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last?.text?.trim()) return;
    await onSubmitProposal({
      summary,
      rationale,
      proposed_patch: last.text
    });
  }

  return (
    <div className="card">
      <h3>Agent Chat</h3>
      <small>Section: {sectionId} · Actor: {actorId}</small>
      <div className="chat-log">
        {messages.length === 0 && <small>No chat yet. Ask for rewrite ideas, ambiguity checks, or proposal text.</small>}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <strong>{m.role === "user" ? "You" : "Agent"}</strong>
            <pre>{m.text}</pre>
            {m.suggestions?.length ? (
              <div className="suggestion-list">
                {m.suggestions.map((s, idx) => (
                  <small key={idx}>- {s}</small>
                ))}
              </div>
            ) : null}
            {m.fallbackReason ? <small>(Agent fallback mode: {m.fallbackReason})</small> : null}
          </div>
        ))}
      </div>
      <div className="row">
        <Input
          placeholder="Ask the agent about this section..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <Button onClick={send} disabled={loading}>{loading ? "Thinking..." : "Send"}</Button>
      </div>
      <div className="row">
        <Input placeholder="Proposal summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
        <Input placeholder="Proposal rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} />
      </div>
      <Button variant="outline" onClick={submitLastAssistantMessage}>
        Submit Last Agent Reply As Proposal
      </Button>
    </div>
  );
}
