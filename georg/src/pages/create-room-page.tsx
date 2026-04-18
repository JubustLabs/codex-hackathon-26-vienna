import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import type { Participant } from "@shared/contracts";

import { api } from "@/lib/api";

const participantKey = (roomId: string) => `georg.participant.${roomId}`;

export function CreateRoomPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    topic: "Realtime alignment workspace",
    decision: "How should the first POC room flow work end-to-end?",
    goal: "Reach a shared ADR and plan without devolving into noisy shared chat.",
    nonGoals: "CRDT editing, voice/video, autonomous decision making",
    scope: "Vertical slice covering room, orchestrator, ADR, plan, and export",
    successBar: "A small group can create, discuss, approve, and export one decision path",
    topicTags: "adr,alignment,realtime,workspace,agents",
    creatorName: "Session owner",
    creatorRole: "decision_owner" as Participant["role"],
  });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const room = await api.createRoom({
        topic: form.topic,
        decision: form.decision,
        goal: form.goal,
        nonGoals: form.nonGoals,
        scope: form.scope,
        successBar: form.successBar,
        topicTags: form.topicTags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      const participant = await api.joinRoom(room.id, { displayName: form.creatorName, role: form.creatorRole });
      window.localStorage.setItem(participantKey(room.id), participant.id);
      navigate(`/rooms/${room.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create room");
      setSubmitting(false);
    }
  };

  return (
    <section className="single-column-page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">New decision</p>
            <h1>Create room</h1>
          </div>
          <Link className="button ghost" to="/">
            ← Workspace
          </Link>
          <p>Start with a bounded decision brief. This flow also records the first room participant so the approval set starts anchored.</p>
        </div>
        <form className="stack-form" onSubmit={onSubmit}>
          <div className="overview-columns" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <label className="field">
              <span>Your name</span>
              <input value={form.creatorName} onChange={(event) => setForm((current) => ({ ...current, creatorName: event.target.value }))} />
            </label>
            <label className="field">
              <span>Your role</span>
              <select
                value={form.creatorRole}
                onChange={(event) => setForm((current) => ({ ...current, creatorRole: event.target.value as Participant["role"] }))}
              >
                <option value="decision_owner">Decision owner</option>
                <option value="contributor">Contributor</option>
                <option value="observer">Observer</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span>Topic</span>
            <input value={form.topic} onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))} />
          </label>
          <label className="field">
            <span>Decision</span>
            <textarea value={form.decision} onChange={(event) => setForm((current) => ({ ...current, decision: event.target.value }))} rows={3} />
          </label>
          <label className="field">
            <span>Goal</span>
            <textarea value={form.goal} onChange={(event) => setForm((current) => ({ ...current, goal: event.target.value }))} rows={3} />
          </label>
          <label className="field">
            <span>Non goals</span>
            <textarea value={form.nonGoals} onChange={(event) => setForm((current) => ({ ...current, nonGoals: event.target.value }))} rows={3} />
          </label>
          <label className="field">
            <span>Scope</span>
            <textarea value={form.scope} onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value }))} rows={3} />
          </label>
          <label className="field">
            <span>Success bar</span>
            <textarea value={form.successBar} onChange={(event) => setForm((current) => ({ ...current, successBar: event.target.value }))} rows={3} />
          </label>
          <label className="field">
            <span>Topic tags (comma-separated)</span>
            <input value={form.topicTags} onChange={(event) => setForm((current) => ({ ...current, topicTags: event.target.value }))} />
          </label>
          {error ? <p className="empty-state error-state">{error}</p> : null}
          <div className="row-actions" style={{ justifyContent: "flex-end" }}>
            <button className="button primary" disabled={submitting} type="submit">
              {submitting ? "Creating…" : "Create room →"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
