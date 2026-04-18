import { Card } from "@/components/ui/card";
import type { Proposal } from "@/lib/types";

export function ProposalDiffViewer({ currentContent, proposal }: { currentContent: string; proposal?: Proposal }) {
  if (!proposal) return <Card>Select a proposal to view diff.</Card>;
  return (
    <Card>
      <h3>Diff View</h3>
      <div className="diff-grid">
        <div>
          <h4>Before</h4>
          <pre className="markdown-block">{currentContent}</pre>
        </div>
        <div>
          <h4>After (Proposed)</h4>
          <pre className="markdown-block">{proposal.proposed_patch}</pre>
        </div>
      </div>
      <p><strong>Review summary:</strong> {proposal.review_summary}</p>
      {!!proposal.ambiguity_flags?.length && <p><strong>Ambiguities:</strong> {proposal.ambiguity_flags.join(", ")}</p>}
    </Card>
  );
}
