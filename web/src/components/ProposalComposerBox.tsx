import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export function ProposalComposerBox({ sectionId, actorId, onSubmit }: { sectionId: string; actorId: string; onSubmit: (p: any) => Promise<void> }) {
  const [summary, setSummary] = useState("");
  const [patch, setPatch] = useState("");
  const [rationale, setRationale] = useState("");
  const [sourceMode, setSourceMode] = useState("human");

  return (
    <div className="composer">
      <h3>Agent / Proposal Composer</h3>
      <Input placeholder="Summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
      <Textarea placeholder="Prompt or change text" value={patch} onChange={(e) => setPatch(e.target.value)} rows={6} />
      <Input placeholder="Rationale (optional)" value={rationale} onChange={(e) => setRationale(e.target.value)} />
      <div className="row">
        <label>
          <input type="radio" checked={sourceMode === "human"} onChange={() => setSourceMode("human")} /> human
        </label>
        <label>
          <input type="radio" checked={sourceMode === "agent"} onChange={() => setSourceMode("agent")} /> agent-assisted
        </label>
      </div>
      <Button
        onClick={() =>
          onSubmit({
            actor_id: actorId,
            source_client: "web",
            source_type: sourceMode,
            section_id: sectionId,
            summary,
            rationale,
            proposed_patch: patch
          })
        }
      >
        Submit Proposal
      </Button>
    </div>
  );
}
