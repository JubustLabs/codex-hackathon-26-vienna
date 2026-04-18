import { FormEvent, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { adrSectionOrder, roomModes, type AdrSectionKey, type OwnershipClaim, type Participant, type Workstream } from "@shared/contracts";

import { useLiveRoom } from "@/hooks/use-live-room";
import { api } from "@/lib/api";

const participantKey = (roomId: string) => `georg.participant.${roomId}`;

const AVATAR_COLORS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

const ALIGNMENT_TYPES = [
  "goal",
  "constraint",
  "option",
  "tradeoff",
  "risk",
  "open_question",
  "agreement",
  "unresolved_difference",
] as const;

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(id: string) {
  let sum = 0;
  for (let i = 0; i < id.length; i++) {
    sum = (sum + id.charCodeAt(i)) % 997;
  }
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function roleLabel(role: Participant["role"]) {
  if (role === "decision_owner") return "Owner";
  if (role === "contributor") return "Contributor";
  return "Observer";
}

function claimOwnerName(snapshot: ReturnType<typeof useLiveRoom>["snapshot"], claim: OwnershipClaim | undefined) {
  if (!snapshot || !claim) {
    return null;
  }
  return snapshot.participants.find((participant) => participant.id === claim.ownerId)?.displayName ?? "Unknown";
}

export function RoomPage() {
  const { roomId = "" } = useParams();
  const [localParticipant, setLocalParticipant] = useState<string | undefined>(() => window.localStorage.getItem(participantKey(roomId)) ?? undefined);
  const { snapshot, loading, error, refresh } = useLiveRoom(roomId, localParticipant);
  const [joinForm, setJoinForm] = useState({ displayName: "", role: "contributor" as Participant["role"] });
  const [utterance, setUtterance] = useState("");
  const [agentDeltaText, setAgentDeltaText] = useState("");
  const [adrDrafts, setAdrDrafts] = useState<Record<string, string>>({});
  const [workstreamEdits, setWorkstreamEdits] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const me = useMemo(
    () => snapshot?.participants.find((participant) => participant.id === localParticipant) ?? null,
    [localParticipant, snapshot?.participants],
  );

  const canParticipate = Boolean(me && me.role !== "observer");
  const canSteer = Boolean(me && snapshot?.room.decisionOwnerIds.includes(me.id));

  const runAction = async (action: () => Promise<unknown>) => {
    try {
      setActionError(null);
      await action();
      await refresh();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Action failed");
    }
  };

  const resolveBlocker = async (nodeId: string, resolution: "agreement" | "non_blocking" | "dissent", currentText: string) => {
    if (!canParticipate) {
      return;
    }

    const promptCopy =
      resolution === "agreement"
        ? "Agreement wording"
        : resolution === "dissent"
          ? "Dissent note"
          : "Optional non-blocking note";
    const proposedNote = window.prompt(promptCopy, currentText);
    if (proposedNote === null && resolution !== "non_blocking") {
      return;
    }

    await runAction(() => api.resolveAlignmentNode(roomId, me!.id, nodeId, resolution, proposedNote ?? ""));
  };

  const onJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction(async () => {
      const participant = await api.joinRoom(roomId, joinForm);
      window.localStorage.setItem(participantKey(roomId), participant.id);
      setLocalParticipant(participant.id);
    });
  };

  if (loading || !snapshot) {
    return <section className="single-column-page">Loading room…</section>;
  }

  if (error) {
    return <section className="single-column-page">Failed to load room: {error}</section>;
  }

  const claimFor = (scopeType: OwnershipClaim["scopeType"], scopeId: string) =>
    snapshot.claims.find((claim) => claim.scopeType === scopeType && claim.scopeId === scopeId);

  const pendingCount = snapshot.pendingDeltas.filter((item) => item.status === "pending").length;

  return (
    <section className="room-shell">
      {!me ? (
        <aside className="join-overlay">
          <form className="panel stack-form" onSubmit={onJoin}>
            <div className="panel-header">
              <h1>Join room</h1>
              <p>Observers are read-only, contributors can edit claimed sections, decision owners steer the room and approve outputs.</p>
            </div>
            <label className="field">
              <span>Name</span>
              <input value={joinForm.displayName} onChange={(event) => setJoinForm((current) => ({ ...current, displayName: event.target.value }))} />
            </label>
            <label className="field">
              <span>Role</span>
              <select value={joinForm.role} onChange={(event) => setJoinForm((current) => ({ ...current, role: event.target.value as Participant["role"] }))}>
                <option value="decision_owner">Decision owner</option>
                <option value="contributor">Contributor</option>
                <option value="observer">Observer</option>
              </select>
            </label>
            {actionError ? <p className="empty-state error-state">{actionError}</p> : null}
            <button className="button primary" type="submit">
              Enter room
            </button>
          </form>
        </aside>
      ) : null}

      <div className="room-column left-rail">
        <section className="panel">
          <div className="panel-header">
            <h2>Brief</h2>
            <span className="badge">{snapshot.room.mode.replaceAll("_", " ")}</span>
          </div>
          <p>{snapshot.room.decision}</p>
          <p>{snapshot.room.goal}</p>
          <div className="presence-strip" style={{ marginTop: "0.4rem" }}>
            {snapshot.room.topicTags.map((tag) => (
              <span className="badge" key={tag}>
                #{tag}
              </span>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Guardrails</h2>
            <small>{snapshot.guardrails.length}</small>
          </div>
          {snapshot.guardrails.map((guardrail) => (
            <div className="list-card" key={guardrail.id}>
              <strong>{guardrail.title}</strong>
              <span>{guardrail.description}</span>
              <small className="role-tag">{guardrail.severity}</small>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Components</h2>
            <small>{snapshot.components.length}</small>
          </div>
          {snapshot.components.map((component) => (
            <div className="list-card" key={component.id}>
              <strong>{component.title}</strong>
              <span>{component.summary}</span>
              <small>{component.evidence.join(" · ")}</small>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Patterns</h2>
            <small>{snapshot.patterns.length}</small>
          </div>
          {snapshot.patterns.map((pattern) => (
            <div className="list-card" key={pattern.id}>
              <strong>{pattern.title}</strong>
              <span>{pattern.summary}</span>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Ownership</h2>
            <small>{snapshot.claims.length}</small>
          </div>
          {snapshot.claims.length ? (
            snapshot.claims.map((claim) => (
              <div className="list-card" key={claim.id}>
                <strong>{claim.scopeType.replaceAll("_", " ")}</strong>
                <span>{claim.scopeId}</span>
                <small className="role-tag">claimed by {claimOwnerName(snapshot, claim)}</small>
              </div>
            ))
          ) : (
            <p className="empty-state">No active section claims.</p>
          )}
        </section>
      </div>

      <div className="room-column center-column">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Decision room</p>
              <h1>{snapshot.room.topic}</h1>
            </div>
            <div className="segmented" role="tablist" aria-label="Room mode">
              {roomModes.map((mode) => (
                <button
                  className={snapshot.room.mode === mode ? "button primary" : "button"}
                  disabled={!canSteer}
                  key={mode}
                  onClick={() => canSteer && void runAction(() => api.setMode(roomId, me!.id, mode))}
                  type="button"
                >
                  {mode.replaceAll("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <div className="readiness-grid">
            <div className={snapshot.readiness.adrSectionsPopulated ? "badge success" : "badge"}>ADR sections</div>
            <div className={snapshot.readiness.adrReviewed ? "badge success" : "badge"}>ADR reviewed</div>
            <div className={snapshot.readiness.unresolvedDifferencesCleared ? "badge success" : "badge"}>No blockers</div>
            <div className={snapshot.readiness.acceptedWorkstreamOwners ? "badge success" : "badge"}>Plan owners</div>
          </div>
          {actionError ? <p className="empty-state error-state">{actionError}</p> : null}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Shared room</h2>
            <div className="row-actions">
              <button className="button" disabled={!canParticipate} onClick={() => canParticipate && void runAction(() => api.synthesizeNow(roomId, me!.id))} type="button">
                Synthesize now
              </button>
              <Link className="button ghost" to={`/adrs/${roomId}`}>
                ADR →
              </Link>
              <Link className="button ghost" to={`/plans/${roomId}`}>
                Plan →
              </Link>
            </div>
          </div>
          <div className="presence-strip">
            {snapshot.participants.map((participant) => (
              <span className="presence-pill" key={participant.id} data-role={participant.role}>
                <span className="avatar" data-color={colorFor(participant.id)} aria-hidden="true">
                  {initialsFrom(participant.displayName)}
                </span>
                <span>{participant.displayName}</span>
                <span className="role-tag">{roleLabel(participant.role)}</span>
              </span>
            ))}
          </div>

          <form
            className="composer"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!canParticipate || !utterance.trim()) {
                return;
              }
              await runAction(() => api.addUtterance(roomId, me!.id, utterance));
              setUtterance("");
            }}
          >
            <textarea
              disabled={!canParticipate}
              placeholder={canParticipate ? "Contribute to the shared room — a thought, a constraint, an option…" : "Observers are read-only in this slice."}
              rows={3}
              value={utterance}
              onChange={(event) => setUtterance(event.target.value)}
            />
            <div className="row-actions">
              <small>Posts to the shared timeline and is classified into alignment nodes.</small>
              <button className="button primary" disabled={!canParticipate || !utterance.trim()} type="submit">
                Send to room
              </button>
            </div>
          </form>

          <div className="timeline">
            {snapshot.orchestratorUpdates.map((update) => (
              <article className="orchestrator-card" key={update.id}>
                <div className="card-meta">Orchestrator synthesis</div>
                <p>{update.synthesis}</p>
                {update.suggestedNextMove ? <small>Next move · {update.suggestedNextMove}</small> : null}
              </article>
            ))}
            {snapshot.recentEvents.map((event) => (
              <article className="timeline-row" key={event.id}>
                <strong>{event.type.replaceAll(".", " · ")}</strong>
                <span>{event.summary}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Alignment board</h2>
            <small>{snapshot.alignmentNodes.length} nodes</small>
          </div>
          <div className="alignment-grid">
            {ALIGNMENT_TYPES.map((type) => (
              <div className="alignment-column" key={type} data-type={type}>
                <h3>{type.replaceAll("_", " ")}</h3>
                {snapshot.alignmentNodes
                  .filter((node) => node.type === type)
                  .map((node) => (
                    <div className="node-card" key={node.id}>
                      <strong>{Math.round(node.confidence * 100)}%</strong>
                      <span>{node.text}</span>
                      {node.type === "unresolved_difference" && canParticipate ? (
                        <div className="row-actions">
                          <button className="button" onClick={() => void resolveBlocker(node.id, "agreement", node.text)} type="button">
                            Resolve
                          </button>
                          <button className="button" onClick={() => void resolveBlocker(node.id, "dissent", node.text)} type="button">
                            Dissent
                          </button>
                          <button className="button" onClick={() => void resolveBlocker(node.id, "non_blocking", node.text)} type="button">
                            Non-blocking
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>ADR editor</h2>
            <div className="row-actions">
              <span className="status-chip" data-status={snapshot.adr.status}>
                {snapshot.adr.status.replaceAll("_", " ")}
              </span>
              <button className="button" disabled={!canSteer} onClick={() => canSteer && void runAction(() => api.approveAdr(roomId, me!.id))} type="button">
                Approve ADR
              </button>
            </div>
          </div>
          {adrSectionOrder.map((section) => {
            const claim = claimFor("adr_section", section);
            const mine = claim?.ownerId === me?.id;
            const text = adrDrafts[section] ?? snapshot.adr.sections[section];
            return (
              <article className="editor-card" key={section}>
                <div className="editor-header">
                  <div>
                    <strong>{section.replaceAll("_", " ")}</strong>
                    <small>{claim ? `Claimed by ${claimOwnerName(snapshot, claim)}` : "Unclaimed"}</small>
                  </div>
                  <div className="row-actions">
                    <button
                      className="button"
                      disabled={!canParticipate || Boolean(claim && !mine)}
                      onClick={() => canParticipate && void runAction(() => api.claim(roomId, me!.id, "adr_section", section))}
                      type="button"
                    >
                      Claim
                    </button>
                    <button
                      className="button"
                      disabled={!mine}
                      onClick={() => mine && void runAction(() => api.releaseClaim(roomId, me!.id, "adr_section", section))}
                      type="button"
                    >
                      Release
                    </button>
                    <button
                      className="button"
                      disabled={!mine}
                      onClick={() => mine && void runAction(() => api.regenerateAdrSection(roomId, me!.id, section))}
                      type="button"
                    >
                      Regenerate
                    </button>
                    <button
                      className="button"
                      disabled={!canParticipate}
                      onClick={() => canParticipate && void runAction(() => api.reviewAdrSection(roomId, me!.id, section))}
                      type="button"
                    >
                      Review
                    </button>
                  </div>
                </div>
                <textarea
                  disabled={!mine}
                  rows={4}
                  value={text}
                  onChange={(event) => setAdrDrafts((current) => ({ ...current, [section]: event.target.value }))}
                />
                <div className="row-actions">
                  <small>{snapshot.adr.reviews[section].length} reviewer(s)</small>
                  <button
                    className="button primary"
                    disabled={!mine}
                    onClick={() => mine && void runAction(() => api.updateAdrSection(roomId, me!.id, section as AdrSectionKey, text))}
                    type="button"
                  >
                    Save section
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Implementation plan</h2>
            <div className="row-actions">
              {snapshot.plan.status ? (
                <span className="status-chip" data-status={snapshot.plan.status}>
                  {snapshot.plan.status.replaceAll("_", " ")}
                </span>
              ) : null}
              <button className="button" disabled={!canParticipate} onClick={() => canParticipate && void runAction(() => api.generatePlan(roomId, me!.id))} type="button">
                Generate plan
              </button>
              <button className="button" disabled={!canSteer || !snapshot.plan.id} onClick={() => canSteer && void runAction(() => api.approvePlan(roomId, me!.id))} type="button">
                Approve plan
              </button>
              <button
                className="button"
                disabled={!canParticipate || snapshot.adr.status !== "approved" || snapshot.plan.status !== "approved"}
                onClick={() => canParticipate && void runAction(() => api.generateHandoff(roomId, me!.id))}
                type="button"
              >
                Generate handoff
              </button>
              <Link className="button ghost" to={`/handoff/${roomId}`}>
                Handoff →
              </Link>
            </div>
          </div>
          {snapshot.plan.workstreams.length ? (
            snapshot.plan.workstreams.map((item) => {
              const claim = claimFor("plan_item", item.id);
              const mine = claim?.ownerId === me?.id;
              const draft = workstreamEdits[item.id] ?? item.description;
              return (
                <article className="editor-card" key={item.id}>
                  <div className="editor-header">
                    <div>
                      <strong>{item.title}</strong>
                      <small>
                        {item.size} · owner {item.ownerStatus}
                      </small>
                    </div>
                    <div className="row-actions">
                      <button
                        className="button"
                        disabled={!canParticipate || Boolean(claim && !mine)}
                        onClick={() => canParticipate && void runAction(() => api.claim(roomId, me!.id, "plan_item", item.id))}
                        type="button"
                      >
                        Claim
                      </button>
                      <button
                        className="button"
                        disabled={!mine}
                        onClick={() => mine && void runAction(() => api.releaseClaim(roomId, me!.id, "plan_item", item.id))}
                        type="button"
                      >
                        Release
                      </button>
                      <button
                        className="button"
                        disabled={!canParticipate}
                        onClick={() => canParticipate && void runAction(() => api.acceptPlanOwner(roomId, me!.id, item.id))}
                        type="button"
                      >
                        Accept owner
                      </button>
                    </div>
                  </div>
                  <textarea
                    disabled={!mine}
                    rows={4}
                    value={draft}
                    onChange={(event) => setWorkstreamEdits((current) => ({ ...current, [item.id]: event.target.value }))}
                  />
                  <div className="row-actions">
                    <small>First step · {item.firstStep}</small>
                    <button
                      className="button primary"
                      disabled={!mine}
                      onClick={() => mine && void runAction(() => api.updatePlanItem(roomId, me!.id, item.id, { description: draft } as Partial<Workstream>))}
                      type="button"
                    >
                      Save workstream
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="empty-state">Generate a plan after the ADR is approved.</p>
          )}
        </section>
      </div>

      <div className="room-column right-rail">
        <section className="panel">
          <div className="panel-header">
            <h2>Your work</h2>
          </div>
          <small>Pending deltas visible only to you and the orchestrator.</small>
          <form
            className="stack-form"
            style={{ marginTop: "0.6rem" }}
            onSubmit={async (event) => {
              event.preventDefault();
              if (!canParticipate || !agentDeltaText.trim()) {
                return;
              }
              await runAction(() => api.submitAgentDelta(roomId, me!.id, agentDeltaText, "local-codex-plugin"));
              setAgentDeltaText("");
            }}
          >
            <textarea
              disabled={!canParticipate}
              placeholder={canParticipate ? "Simulate a private agent delta or a local insight you might promote." : "Observers cannot attach private agents."}
              rows={3}
              value={agentDeltaText}
              onChange={(event) => setAgentDeltaText(event.target.value)}
            />
            <button className="button" disabled={!canParticipate || !agentDeltaText.trim()} type="submit">
              Add pending delta
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Pending</h2>
            <span className="badge">{pendingCount}</span>
          </div>
          {snapshot.pendingDeltas.filter((item) => item.status === "pending").map((item) => (
            <div className="editor-card" key={item.id}>
              <strong>{item.sourceAgent}</strong>
              <span>{item.text}</span>
              <div className="row-actions">
                <button
                  className="button primary"
                  disabled={!canParticipate}
                  onClick={() => canParticipate && void runAction(() => api.promoteAgentDelta(roomId, me!.id, item.id))}
                  type="button"
                >
                  Promote
                </button>
                <button className="button" disabled={!canParticipate} onClick={() => canParticipate && void runAction(() => api.discardAgentDelta(roomId, me!.id, item.id))} type="button">
                  Discard
                </button>
              </div>
            </div>
          ))}
          {!pendingCount ? <p className="empty-state">No pending private deltas.</p> : null}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Routed to me</h2>
            <span className="badge">{snapshot.routedToParticipant.length}</span>
          </div>
          {snapshot.routedToParticipant.map((item) => (
            <div className="list-card" key={item.id}>
              <strong>Private nudge</strong>
              <span>{item.message}</span>
            </div>
          ))}
          {!snapshot.routedToParticipant.length ? <p className="empty-state">No routed insights yet.</p> : null}
        </section>
      </div>
    </section>
  );
}
