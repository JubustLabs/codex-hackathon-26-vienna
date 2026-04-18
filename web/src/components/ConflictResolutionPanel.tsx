import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Proposal } from "@/lib/types";
import { useState } from "react";

export function ConflictResolutionPanel({
  proposal,
  currentContent,
  onResolve,
  actorId
}: {
  proposal?: Proposal;
  currentContent: string;
  onResolve: (payload: { resolved_content_markdown: string; resolution_note: string }) => Promise<void>;
  actorId: string;
}) {
  const [note, setNote] = useState("Owner conflict resolution");
  const [resolved, setResolved] = useState(currentContent);

  if (!proposal || proposal.status !== "conflict_detected") return null;

  return (
    <div className="card">
      <h3>Conflict Resolution</h3>
      <p><strong>Agent explanation:</strong> {proposal.conflict_explanation}</p>
      <div className="diff-grid">
        <div>
          <h4>Current Published</h4>
          <pre className="markdown-block">{currentContent}</pre>
        </div>
        <div>
          <h4>Incoming Proposal</h4>
          <pre className="markdown-block">{proposal.proposed_patch}</pre>
        </div>
      </div>
      <h4>Manual Patch Editor</h4>
      <Textarea rows={8} value={resolved} onChange={(e) => setResolved(e.target.value)} />
      <Input value={note} onChange={(e) => setNote(e.target.value)} />
      <Button onClick={() => onResolve({ resolved_content_markdown: resolved, resolution_note: note })}>Resolve and Publish</Button>
      <small>Actor: {actorId}</small>
    </div>
  );
}
