import type { Proposal } from "@/lib/types";

export function ProposalList({ proposals, activeProposalId, onSelect }: { proposals: Proposal[]; activeProposalId?: string; onSelect: (p: Proposal) => void }) {
  return (
    <div>
      <h3>Proposals</h3>
      <div className="list">
        {proposals.map((p) => (
          <button key={p.id} className={`list-item ${activeProposalId === p.id ? "active" : ""}`} onClick={() => onSelect(p)}>
            <div>{p.summary}</div>
            <small>{p.status} | score {p.orchestrator_score?.toFixed?.(2) ?? "-"}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
