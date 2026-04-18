import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { Principal, Proposal, Section } from "@/lib/types";
import { SectionTreeNav } from "@/components/SectionTreeNav";
import { SectionContentView } from "@/components/SectionContentView";
import { ProposalList } from "@/components/ProposalList";
import { ProposalDiffViewer } from "@/components/ProposalDiffViewer";
import { ReviewDecisionPanel } from "@/components/ReviewDecisionPanel";
import { ConflictResolutionPanel } from "@/components/ConflictResolutionPanel";
import { RevisionTimeline } from "@/components/RevisionTimeline";
import { Button } from "@/components/ui/button";
import { SectionCreateBox } from "@/components/SectionCreateBox";
import { AgentChatBox } from "@/components/AgentChatBox";

export function App() {
  const [sections, setSections] = useState<Section[]>([]);
  const [section, setSection] = useState<Section | null>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [actorId, setActorId] = useState("usr_owner");
  const [activeProposal, setActiveProposal] = useState<Proposal | undefined>();
  const [message, setMessage] = useState("");

  const canOwnerActions = useMemo(() => ["usr_owner", "usr_admin"].includes(actorId), [actorId]);
  const agentOnlyMode = (import.meta.env.VITE_DEMO_AGENT_ONLY ?? "true") !== "false";

  async function refreshSections(selectedId?: string) {
    const all = await api.sections();
    setSections(all);
    const sid = selectedId || section?.id || all[0]?.id;
    if (sid) {
      const data = await api.section(sid);
      setSection(data);
      setActiveProposal((prev) => data.proposals?.find((p) => p.id === prev?.id));
      setRevisions(await api.revisions(sid));
    }
  }

  useEffect(() => {
    Promise.all([refreshSections(), api.principals().then(setPrincipals)]).catch((e) => setMessage(String(e)));

    const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
    ws.onmessage = () => {
      refreshSections().catch(() => {});
    };
    return () => ws.close();
  }, []);

  async function createProposal(payload: any) {
    try {
      await api.createProposal({ ...payload, base_revision_id: section?.published_revision_id });
      setMessage("Proposal submitted");
      await refreshSections(section?.id);
    } catch (e) {
      setMessage(String(e));
    }
  }

  async function handleDecision(decision: "approve" | "reject" | "request_changes", note?: string) {
    if (!activeProposal) return;
    try {
      await api.reviewProposal(activeProposal.id, { actor_id: actorId, source_client: "web", decision, note });
      setMessage(`Decision recorded: ${decision}`);
      await refreshSections(section?.id);
    } catch (e) {
      setMessage(String(e));
    }
  }

  async function handleRequestChanges(note: string) {
    if (!activeProposal) return;
    try {
      await api.requestChanges(activeProposal.id, { actor_id: actorId, source_client: "web", note });
      setMessage("Requested changes");
      await refreshSections(section?.id);
    } catch (e) {
      setMessage(String(e));
    }
  }

  async function handleResolveConflict(payload: { resolved_content_markdown: string; resolution_note: string }) {
    if (!activeProposal) return;
    try {
      await api.resolveConflict(activeProposal.id, { actor_id: actorId, source_client: "web", ...payload });
      setMessage("Conflict resolved and published");
      await refreshSections(section?.id);
    } catch (e) {
      setMessage(String(e));
    }
  }

  async function ownerQuickEdit() {
    if (!section) return;
    const reason = prompt("Reason (required)", "Owner quick edit");
    if (!reason) return;
    const content = prompt("New section markdown", section.content_markdown);
    if (!content) return;
    try {
      await api.ownerQuickEdit(section.id, { actor_id: actorId, source_client: "web", reason, content_markdown: content });
      setMessage("Owner quick edit published");
      await refreshSections(section.id);
    } catch (e) {
      setMessage(String(e));
    }
  }

  async function rollbackLatestPrevious() {
    if (!section || revisions.length < 2) return;
    try {
      await api.rollback(section.id, {
        actor_id: actorId,
        source_client: "web",
        target_revision_id: revisions[1].id,
        reason: "Demo rollback"
      });
      setMessage("Rollback complete");
      await refreshSections(section.id);
    } catch (e) {
      setMessage(String(e));
    }
  }

  async function setReviewers() {
    if (!section) return;
    try {
      await api.setReviewers(section.id, {
        actor_id: actorId,
        source_client: "web",
        reviewer_ids: ["usr_rev1", "usr_rev2"]
      });
      setMessage("Reviewers set for section");
      await refreshSections(section.id);
    } catch (e) {
      setMessage(String(e));
    }
  }

  async function createSection(payload: any) {
    try {
      const res = await api.createSection(payload) as { section_id: string };
      setMessage("Section created. You are now owner.");
      await refreshSections(res.section_id);
    } catch (e) {
      setMessage(String(e));
    }
  }

  async function askAgent(message: string, history: { role: "user" | "assistant"; text: string }[]) {
    if (!section) return { reply: "No section selected.", suggestions: [] };
    return api.agentChat({
      actor_id: actorId,
      source_client: "web",
      section_id: section.id,
      message,
      history
    });
  }

  async function submitAgentProposal(payload: { summary: string; proposed_patch: string; rationale: string }) {
    if (!section) return;
    await createProposal({
      actor_id: actorId,
      source_client: "web",
      source_type: "agent",
      section_id: section.id,
      summary: payload.summary,
      rationale: payload.rationale,
      proposed_patch: payload.proposed_patch
    });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>Governed Knowledge Base Workspace</h1>
        <div className="row">
          <select value={actorId} onChange={(e) => setActorId(e.target.value)}>
            {principals.map((p) => (
              <option key={p.id} value={p.id}>{p.display_name} ({p.role})</option>
            ))}
          </select>
          <span className="status">{message}</span>
        </div>
      </header>

      <main className="layout-grid">
        <aside className="panel">
          <SectionTreeNav sections={sections} activeSectionId={section?.id} onSelect={(id) => refreshSections(id)} />
          <SectionCreateBox actorId={actorId} onCreate={createSection} />
        </aside>

        <section className="panel middle">
          {section && (
            <>
              <SectionContentView title={section.title} markdown={section.content_markdown} />
              <ProposalDiffViewer currentContent={section.content_markdown} proposal={activeProposal} />
              <ConflictResolutionPanel
                actorId={actorId}
                proposal={activeProposal}
                currentContent={section.content_markdown}
                onResolve={handleResolveConflict}
              />
              <AgentChatBox
                actorId={actorId}
                sectionId={section.id}
                onAsk={askAgent}
                onSubmitProposal={submitAgentProposal}
              />
            </>
          )}
        </section>

        <aside className="panel">
          {section && (
            <>
              <div className="card">
                <h3>Metadata</h3>
                <small>Owner: {section.primary_owner_id}</small>
                <small>Topic: {section.topic}</small>
                <small>Risk: {section.risk_class}</small>
                <small>Published rev: {section.published_revision_id}</small>
                <small>Reviewers: {(section.reviewers || []).map((r) => r.display_name).join(", ") || "none"}</small>
                <div className="row wrap">
                  <Button variant="outline" onClick={setReviewers}>Set Demo Reviewers</Button>
                  {!agentOnlyMode && canOwnerActions && <Button onClick={ownerQuickEdit}>Owner Quick Edit</Button>}
                  {canOwnerActions && <Button variant="outline" onClick={rollbackLatestPrevious}>Rollback</Button>}
                </div>
              </div>

              <ProposalList
                proposals={(section.proposals || []) as Proposal[]}
                activeProposalId={activeProposal?.id}
                onSelect={setActiveProposal}
              />

              <ReviewDecisionPanel
                actorId={actorId}
                proposal={activeProposal}
                onDecision={handleDecision}
                onRequestChanges={handleRequestChanges}
              />

              <RevisionTimeline revisions={revisions} />
            </>
          )}
        </aside>
      </main>
    </div>
  );
}
