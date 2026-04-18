import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import type { Participant } from "@shared/contracts";

import { api } from "@/lib/api";
import { participantKey, withParticipant } from "@/lib/room-navigation";

export function CreateRoomPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    topic: "Chocolate cookie flavor",
    decision: "Which chocolate cookie flavor should we choose for the bake sale?",
    goal: "Pick one cookie flavor that feels obvious, tasty, and easy to explain.",
    nonGoals: "Fancy baking techniques, nutrition debates, or offering lots of flavors at once",
    scope: "One simple choice between classic chocolate chip, double chocolate, and chocolate-orange",
    successBar: "Anyone can see the options, the tradeoffs, the final choice, and the next steps in under a minute",
    topicTags: "cookies,chocolate,kids,demo,choice",
    creatorName: "Alice",
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
      navigate(withParticipant(`/rooms/${room.id}`, participant.id));
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
            <p className="eyebrow">New shared decision space</p>
            <h1>Start with one clear choice</h1>
          </div>
          <Link className="button ghost" to="/">
            ← Workspace
          </Link>
          <p>Keep the first question concrete. The default room is a chocolate cookie demo so the flow is easy for anyone to follow.</p>
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
              {submitting ? "Creating…" : "Create space →"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
