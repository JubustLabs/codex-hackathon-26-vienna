import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import type { Proposal } from "@/lib/types";

export function ReviewDecisionPanel({
  actorId,
  proposal,
  onDecision,
  onRequestChanges
}: {
  actorId: string;
  proposal?: Proposal;
  onDecision: (decision: "approve" | "reject" | "request_changes", note?: string) => Promise<void>;
  onRequestChanges: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  if (!proposal) return null;
  return (
    <div className="card">
      <h3>Review Decision</h3>
      <small>Acting as: {actorId}</small>
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Decision note" />
      <div className="row">
        <Button onClick={() => onDecision("approve", note)}>Approve</Button>
        <Button variant="danger" onClick={() => onDecision("reject", note)}>Reject</Button>
        <Button variant="outline" onClick={() => onRequestChanges(note)}>Request Changes</Button>
      </div>
    </div>
  );
}
