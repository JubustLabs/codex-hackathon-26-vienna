import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import {
  adrSectionOrder,
  roomModes,
  type AdrSectionKey,
  type OwnershipClaim,
  type Participant,
  type RoomSnapshot,
  type Workstream,
} from "@shared/contracts";

import { useLiveRoom } from "@/hooks/use-live-room";
import { api } from "@/lib/api";
import {
  firstFilledLine,
  labelDecisionSection,
  labelRoomMode,
  splitDecisionText,
} from "@/lib/decision-language";
import { participantKey, withParticipant } from "@/lib/room-navigation";

const AVATAR_COLORS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

const DECISION_MAP_TYPES = [
  "option",
  "tradeoff",
  "risk",
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

function claimOwnerName(
  snapshot: ReturnType<typeof useLiveRoom>["snapshot"],
  claim: OwnershipClaim | undefined,
) {
  if (!snapshot || !claim) {
    return null;
  }
  return (
    snapshot.participants.find(
      (participant) => participant.id === claim.ownerId,
    )?.displayName ?? "Unknown"
  );
}

const EVENT_FRIENDLY: Record<string, { label: string; kind: string }> = {
  "room.created": { label: "Room created", kind: "room" },
  "room.mode_changed": { label: "Mode changed", kind: "room" },
  "room.decision_owners.updated": { label: "Decision owners", kind: "room" },
  "participant.joined": { label: "Joined", kind: "presence" },
  "human.utterance.created": { label: "Message", kind: "message" },
  "classifier.delta.created": { label: "Classifier delta", kind: "classifier" },
  "alignment.node.updated": { label: "Alignment updated", kind: "alignment" },
  "orchestrator.update.published": { label: "Synthesis", kind: "orchestrator" },
  "agent.delta.submitted": { label: "Private delta", kind: "agent" },
  "agent.delta.promoted": { label: "Delta promoted", kind: "agent" },
  "agent.delta.discarded": { label: "Delta discarded", kind: "agent" },
  "adr.section.claimed": { label: "Decision section claimed", kind: "adr" },
  "adr.section.released": { label: "Decision section released", kind: "adr" },
  "adr.section.updated": { label: "Decision draft updated", kind: "adr" },
  "adr.section.reviewed": { label: "Decision section reviewed", kind: "adr" },
  "adr.section.overlap_warning": { label: "Decision draft conflict", kind: "warn" },
  "adr.approved": { label: "Decision approved", kind: "approval" },
  "adr.dissent_recorded": { label: "Dissent recorded", kind: "warn" },
  "plan.generated": { label: "Alignment plan generated", kind: "plan" },
  "plan.updated": { label: "Alignment plan updated", kind: "plan" },
  "plan.approved": { label: "Alignment plan approved", kind: "approval" },
  "plan_item.claimed": { label: "Plan item claimed", kind: "plan" },
  "plan_item.released": { label: "Plan item released", kind: "plan" },
  "plan_item.owner_accepted": { label: "Plan owner accepted", kind: "plan" },
  "plan_item.overlap_warning": { label: "Plan conflict", kind: "warn" },
  "implementation.package.generated": {
    label: "Handoff generated",
    kind: "approval",
  },
};

function describeEvent(type: string) {
  return (
    EVENT_FRIENDLY[type] ?? {
      label: type.replaceAll(".", " · "),
      kind: "default",
    }
  );
}

function relativeTime(iso: string, now: number) {
  const diff = now - Date.parse(iso);
  if (Number.isNaN(diff)) return "";
  const seconds = Math.max(0, Math.floor(diff / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function summarizeNodes(snapshot: RoomSnapshot, type: RoomSnapshot["alignmentNodes"][number]["type"], limit = 3) {
  return snapshot.alignmentNodes
    .filter((node) => node.type === type)
    .map((node) => node.text)
    .slice(0, limit);
}

type NextMove = { headline: string; detail: string };

function computeNextMove(
  snapshot: NonNullable<ReturnType<typeof useLiveRoom>["snapshot"]>,
): NextMove {
  const { readiness, adr, plan, room } = snapshot;
  const owners = room.decisionOwnerIds.length;
  if (!readiness.unresolvedDifferencesCleared) {
    return {
      headline: "Resolve blockers",
      detail: "Clear the open disagreements before locking the shared decision.",
    };
  }
  if (!readiness.adrSectionsPopulated) {
    return {
      headline: "Shape the shared decision",
      detail: "Claim each section and fill it in so the choice is easy to review later.",
    };
  }
  if (!readiness.adrReviewed) {
    return {
      headline: "Review every section",
      detail: "Each section needs at least one reviewer before the final approval.",
    };
  }
  if (adr.status !== "approved") {
    const done = adr.approvals.length;
    return {
      headline: "Approve the decision",
      detail: owners
        ? `${done} of ${owners} decision owners approved.`
        : "Add decision owners to approve.",
    };
  }
  if (!plan.id || plan.workstreams.length === 0) {
    return {
      headline: "Build the alignment plan",
      detail: "The shared decision is approved. Turn it into simple next steps.",
    };
  }
  if (!readiness.acceptedWorkstreamOwners) {
    return {
      headline: "Accept workstream owners",
      detail:
        "Every workstream needs an accepted owner, deliverables, and acceptance checks.",
    };
  }
  if (plan.status !== "approved") {
    const done = plan.approvals.length;
    return {
      headline: "Approve the alignment plan",
      detail: owners
        ? `${done} of ${owners} decision owners approved.`
        : "Add decision owners to approve.",
    };
  }
  return {
    headline: "Ship the handoff",
    detail: "Generate the handoff package and ship it downstream.",
  };
}

function Quorum({
  approvals,
  ownerIds,
}: {
  approvals: string[];
  ownerIds: string[];
}) {
  if (ownerIds.length === 0) return null;
  const approved = new Set(approvals);
  return (
    <span
      className="quorum"
      title={`${[...approved].filter((id) => ownerIds.includes(id)).length} of ${ownerIds.length} decision owners approved`}
    >
      {ownerIds.map((ownerId) => (
        <span
          key={ownerId}
          className={approved.has(ownerId) ? "quorum-pip filled" : "quorum-pip"}
        />
      ))}
      <span className="quorum-count">
        {[...approved].filter((id) => ownerIds.includes(id)).length}/
        {ownerIds.length}
      </span>
    </span>
  );
}

export function RoomPage() {
  const { roomId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const participantFromUrl = searchParams.get("participantId") ?? undefined;
  const [localParticipant, setLocalParticipant] = useState<string | undefined>(
    () =>
      participantFromUrl ??
      window.localStorage.getItem(participantKey(roomId)) ??
      undefined,
  );
  useEffect(() => {
    if (!roomId || !participantFromUrl) {
      return;
    }
    window.localStorage.setItem(participantKey(roomId), participantFromUrl);
  }, [participantFromUrl, roomId]);
  const { snapshot, loading, error, refresh } = useLiveRoom(
    roomId,
    localParticipant,
  );
  const [joinForm, setJoinForm] = useState({
    displayName: "",
    role: "contributor" as Participant["role"],
  });
  const [utterance, setUtterance] = useState("");
  const [agentDeltaText, setAgentDeltaText] = useState("");
  const [adrDrafts, setAdrDrafts] = useState<Record<string, string>>({});
  const [workstreamEdits, setWorkstreamEdits] = useState<
    Record<string, string>
  >({});
  const [actionError, setActionError] = useState<string | null>(null);
  const me = useMemo(
    () =>
      snapshot?.participants.find(
        (participant) => participant.id === localParticipant,
      ) ?? null,
    [localParticipant, snapshot?.participants],
  );

  useEffect(() => {
    if (!participantFromUrl || participantFromUrl === localParticipant) {
      return;
    }
    setLocalParticipant(participantFromUrl);
  }, [localParticipant, participantFromUrl]);

  const roomLinkParticipantId = participantFromUrl ?? localParticipant;

  const canParticipate = Boolean(me && me.role !== "observer");
  const canSteer = Boolean(
    me && snapshot?.room.decisionOwnerIds.includes(me.id),
  );

  const runAction = async (action: () => Promise<unknown>) => {
    try {
      setActionError(null);
      await action();
      await refresh();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error ? requestError.message : "Action failed",
      );
    }
  };

  const resolveBlocker = async (
    nodeId: string,
    resolution: "agreement" | "non_blocking" | "dissent",
    currentText: string,
  ) => {
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

    await runAction(() =>
      api.resolveAlignmentNode(
        roomId,
        me!.id,
        nodeId,
        resolution,
        proposedNote ?? "",
      ),
    );
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
    return (
      <section className="single-column-page">
        Failed to load room: {error}
      </section>
    );
  }

  const claimFor = (scopeType: OwnershipClaim["scopeType"], scopeId: string) =>
    snapshot.claims.find(
      (claim) => claim.scopeType === scopeType && claim.scopeId === scopeId,
    );

  const pendingCount = snapshot.pendingDeltas.filter(
    (item) => item.status === "pending",
  ).length;
  const nextMove = computeNextMove(snapshot);
  const renderNow = Date.now();
  const participantById = (id: string) =>
    snapshot.participants.find((participant) => participant.id === id);
  const decisionOptions = [
    ...splitDecisionText(snapshot.adr.sections.options_considered),
    ...summarizeNodes(snapshot, "option"),
  ].filter((value, index, list) => value && list.indexOf(value) === index);
  const decisionTradeoffs = [
    ...splitDecisionText(snapshot.adr.sections.tradeoffs),
    ...summarizeNodes(snapshot, "tradeoff"),
  ].filter((value, index, list) => value && list.indexOf(value) === index);
  const decisionRisks = [
    ...splitDecisionText(snapshot.adr.sections.consequences),
    ...summarizeNodes(snapshot, "risk"),
    ...summarizeNodes(snapshot, "unresolved_difference"),
  ].filter((value, index, list) => value && list.indexOf(value) === index);
  const chosenPath =
    firstFilledLine(
      snapshot.adr.sections.decision,
      summarizeNodes(snapshot, "agreement", 1)[0],
      decisionOptions[0],
    ) || "No clear front-runner yet";
  const whyThisHelps =
    firstFilledLine(snapshot.adr.sections.goals, snapshot.room.goal) ||
    "Capture why this choice matters.";

  return (
    <section className="room-shell">
      {!me ? (
        <aside className="join-overlay">
          <form className="panel stack-form" onSubmit={onJoin}>
            <div className="panel-header">
              <h1>Join room</h1>
              <p>
                Observers are read-only, contributors can edit claimed sections,
                decision owners steer the room and approve outputs.
              </p>
            </div>
            <label className="field">
              <span>Name</span>
              <input
                value={joinForm.displayName}
                onChange={(event) =>
                  setJoinForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Role</span>
              <select
                value={joinForm.role}
                onChange={(event) =>
                  setJoinForm((current) => ({
                    ...current,
                    role: event.target.value as Participant["role"],
                  }))
                }
              >
                <option value="decision_owner">Decision owner</option>
                <option value="contributor">Contributor</option>
                <option value="observer">Observer</option>
              </select>
            </label>
            {actionError ? (
              <p className="empty-state error-state">{actionError}</p>
            ) : null}
            <button className="button primary" type="submit">
              Enter room
            </button>
          </form>
        </aside>
      ) : null}

      <div className="room-column left-rail">
        <section className="panel">
          <div className="panel-header">
            <h2>Decision brief</h2>
            <span className="badge">{labelRoomMode(snapshot.room.mode)}</span>
          </div>
          <p>{snapshot.room.decision}</p>
          <small>{snapshot.room.goal}</small>
          <div className="presence-strip" style={{ marginTop: "0.6rem" }}>
            {snapshot.room.topicTags.map((tag) => (
              <span className="badge" key={tag}>
                #{tag}
              </span>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Decision tree</h2>
            <Link
              className="button ghost"
              to={withParticipant(`/adrs/${roomId}`, roomLinkParticipantId)}
            >
              Review →
            </Link>
          </div>
          <div className="summary-stack">
            <article className="summary-card">
              <small>Front-runner</small>
              <strong>{chosenPath}</strong>
            </article>
            <article className="summary-card">
              <small>Why it helps</small>
              <strong>{whyThisHelps}</strong>
            </article>
          </div>
          <div className="mini-stack">
            <article className="list-card">
              <strong>Options on the table</strong>
              <span>
                {decisionOptions.length
                  ? decisionOptions.join(" · ")
                  : "No options captured yet."}
              </span>
            </article>
            <article className="list-card">
              <strong>Main tradeoff</strong>
              <span>{decisionTradeoffs[0] ?? "No tradeoff captured yet."}</span>
            </article>
            <article className="list-card">
              <strong>Watch out for</strong>
              <span>{decisionRisks[0] ?? "No major risk captured yet."}</span>
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>People here</h2>
            <small>{snapshot.participants.length}</small>
          </div>
          <div className="presence-strip">
            {snapshot.participants.map((participant) => (
              <span
                className="presence-pill"
                key={participant.id}
                data-role={participant.role}
              >
                <span
                  className="avatar"
                  data-color={colorFor(participant.id)}
                  aria-hidden="true"
                >
                  {initialsFrom(participant.displayName)}
                </span>
                <span>{participant.displayName}</span>
                <span className="role-tag">{roleLabel(participant.role)}</span>
              </span>
            ))}
          </div>
          <small>
            {snapshot.room.decisionOwnerIds.length} decision owner(s) can approve
            the final choice.
          </small>
        </section>
      </div>

      <div className="room-column center-column">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Shared decision space</p>
              <h1>{snapshot.room.topic}</h1>
            </div>
            <div className="segmented" role="tablist" aria-label="Room mode">
              {roomModes.map((mode) => (
                <button
                  className={
                    snapshot.room.mode === mode ? "button primary" : "button"
                  }
                  disabled={!canSteer}
                  key={mode}
                  onClick={() =>
                    canSteer &&
                    void runAction(() => api.setMode(roomId, me!.id, mode))
                  }
                  type="button"
                >
                  {labelRoomMode(mode)}
                </button>
              ))}
            </div>
          </div>
          <div className="readiness-grid">
            <div
              className={
                snapshot.readiness.adrSectionsPopulated
                  ? "badge success"
                  : "badge"
              }
            >
              Decision draft
            </div>
            <div
              className={
                snapshot.readiness.adrReviewed ? "badge success" : "badge"
              }
            >
              Reviewed
            </div>
            <div
              className={
                snapshot.readiness.unresolvedDifferencesCleared
                  ? "badge success"
                  : "badge"
              }
            >
              No blockers
            </div>
            <div
              className={
                snapshot.readiness.acceptedWorkstreamOwners
                  ? "badge success"
                  : "badge"
              }
            >
              Owners ready
            </div>
          </div>
          <div className="next-move">
            <div className="next-move-copy">
              <span className="eyebrow">Next move</span>
              <strong>{nextMove.headline}</strong>
              <span>{nextMove.detail}</span>
            </div>
            {me ? (
              <span className="you-are" data-role={me.role}>
                <span
                  className="avatar"
                  data-color={colorFor(me.id)}
                  aria-hidden="true"
                >
                  {initialsFrom(me.displayName)}
                </span>
                <span>
                  You are <strong>{me.displayName}</strong>
                </span>
                <span className="role-tag">
                  {roleLabel(me.role)}
                  {canSteer
                    ? " · can steer"
                    : canParticipate
                      ? " · can edit claimed"
                      : " · read only"}
                </span>
              </span>
            ) : null}
          </div>
          <div className="row-actions" style={{ marginTop: "0.75rem" }}>
            <Link
              className="button ghost"
              to={withParticipant(`/adrs/${roomId}`, roomLinkParticipantId)}
            >
              Decision record →
            </Link>
            <Link
              className="button ghost"
              to={withParticipant(`/plans/${roomId}`, roomLinkParticipantId)}
            >
              Alignment plan →
            </Link>
            <Link
              className="button ghost"
              to={withParticipant(`/handoff/${roomId}`, roomLinkParticipantId)}
            >
              Handoff →
            </Link>
          </div>
          {actionError ? (
            <p className="empty-state error-state">{actionError}</p>
          ) : null}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Talk it through</h2>
            <button
              className="button"
              disabled={!canParticipate}
              onClick={() =>
                canParticipate &&
                void runAction(() => api.synthesizeNow(roomId, me!.id))
              }
              type="button"
            >
              Synthesize now
            </button>
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
              placeholder={
                canParticipate
                  ? "Add one clear thought everyone should see: an option, a tradeoff, a worry, or a reason."
                  : "Observers are read-only in this slice."
              }
              rows={3}
              value={utterance}
              onChange={(event) => setUtterance(event.target.value)}
            />
            <div className="row-actions">
              <small>The room turns clear messages into a simpler decision map.</small>
              <button
                className="button primary"
                disabled={!canParticipate || !utterance.trim()}
                type="submit"
              >
                Share thought
              </button>
            </div>
          </form>
          {snapshot.orchestratorUpdates[0] ? (
            <article className="orchestrator-card">
              <div className="card-meta">
                <span>Latest synthesis</span>
                <span className="timeline-time">
                  {relativeTime(
                    snapshot.orchestratorUpdates[0].createdAt,
                    renderNow,
                  )}
                </span>
              </div>
              <p>{snapshot.orchestratorUpdates[0].synthesis}</p>
              {snapshot.orchestratorUpdates[0].suggestedNextMove ? (
                <small>
                  Next move · {snapshot.orchestratorUpdates[0].suggestedNextMove}
                </small>
              ) : null}
            </article>
          ) : null}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Decision map</h2>
            <small>{snapshot.alignmentNodes.length} signals</small>
          </div>
          <div className="alignment-grid decision-map-grid">
            {DECISION_MAP_TYPES.map((type) => {
              const items = snapshot.alignmentNodes.filter(
                (node) => node.type === type,
              );
              return (
                <div className="alignment-column" key={type} data-type={type}>
                  <h3>{type.replaceAll("_", " ")}</h3>
                  {items.length ? (
                    items.map((node) => (
                      <div className="node-card" key={node.id}>
                        <strong>{Math.round(node.confidence * 100)}%</strong>
                        <span>{node.text}</span>
                        {node.type === "unresolved_difference" &&
                        canParticipate ? (
                          <div className="row-actions">
                            <button
                              className="button"
                              onClick={() =>
                                void resolveBlocker(
                                  node.id,
                                  "agreement",
                                  node.text,
                                )
                              }
                              type="button"
                            >
                              Resolve
                            </button>
                            <button
                              className="button"
                              onClick={() =>
                                void resolveBlocker(
                                  node.id,
                                  "dissent",
                                  node.text,
                                )
                              }
                              type="button"
                            >
                              Dissent
                            </button>
                            <button
                              className="button"
                              onClick={() =>
                                void resolveBlocker(
                                  node.id,
                                  "non_blocking",
                                  node.text,
                                )
                              }
                              type="button"
                            >
                              Non-blocking
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="empty-state compact-empty">
                      Nothing here yet.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Shared decision draft</h2>
            <div className="row-actions">
              <span className="status-chip" data-status={snapshot.adr.status}>
                {snapshot.adr.status.replaceAll("_", " ")}
              </span>
              <Quorum
                approvals={snapshot.adr.approvals}
                ownerIds={snapshot.room.decisionOwnerIds}
              />
              <button
                className="button"
                disabled={!canSteer}
                onClick={() =>
                  canSteer &&
                  void runAction(() => api.approveAdr(roomId, me!.id))
                }
                type="button"
              >
                Approve decision
              </button>
            </div>
          </div>
          {adrSectionOrder.map((section) => {
            const claim = claimFor("adr_section", section);
            const mine = claim?.ownerId === me?.id;
            const text = adrDrafts[section] ?? snapshot.adr.sections[section];
            return (
              <article
                className={mine ? "editor-card mine" : "editor-card"}
                key={section}
              >
                <div className="editor-header">
                  <div>
                    <strong>{labelDecisionSection(section)}</strong>
                    <small>
                      {claim
                        ? `Claimed by ${claimOwnerName(snapshot, claim)}`
                        : "Unclaimed"}
                    </small>
                  </div>
                  <div className="row-actions">
                    <button
                      className="button"
                      disabled={!canParticipate || Boolean(claim && !mine)}
                      onClick={() =>
                        canParticipate &&
                        void runAction(() =>
                          api.claim(roomId, me!.id, "adr_section", section),
                        )
                      }
                      type="button"
                    >
                      Claim
                    </button>
                    <button
                      className="button"
                      disabled={!mine}
                      onClick={() =>
                        mine &&
                        void runAction(() =>
                          api.releaseClaim(
                            roomId,
                            me!.id,
                            "adr_section",
                            section,
                          ),
                        )
                      }
                      type="button"
                    >
                      Release
                    </button>
                    <button
                      className="button"
                      disabled={!mine}
                      onClick={() =>
                        mine &&
                        void runAction(() =>
                          api.regenerateAdrSection(roomId, me!.id, section),
                        )
                      }
                      type="button"
                    >
                      Ask for draft
                    </button>
                    <button
                      className="button"
                      disabled={!canParticipate}
                      onClick={() =>
                        canParticipate &&
                        void runAction(() =>
                          api.reviewAdrSection(roomId, me!.id, section),
                        )
                      }
                      type="button"
                    >
                      Mark reviewed
                    </button>
                  </div>
                </div>
                <textarea
                  disabled={!mine}
                  rows={4}
                  value={text}
                  onChange={(event) =>
                    setAdrDrafts((current) => ({
                      ...current,
                      [section]: event.target.value,
                    }))
                  }
                />
                <div className="row-actions">
                  <small>{snapshot.adr.reviews[section].length} reviewer(s)</small>
                  <button
                    className="button primary"
                    disabled={!mine}
                    onClick={() =>
                      mine &&
                      void runAction(() =>
                        api.updateAdrSection(
                          roomId,
                          me!.id,
                          section as AdrSectionKey,
                          text,
                        ),
                      )
                    }
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
            <h2>Alignment plan</h2>
            <div className="row-actions">
              {snapshot.plan.status ? (
                <span
                  className="status-chip"
                  data-status={snapshot.plan.status}
                >
                  {snapshot.plan.status.replaceAll("_", " ")}
                </span>
              ) : null}
              {snapshot.plan.id ? (
                <Quorum
                  approvals={snapshot.plan.approvals}
                  ownerIds={snapshot.room.decisionOwnerIds}
                />
              ) : null}
              <button
                className="button"
                disabled={!canParticipate}
                onClick={() =>
                  canParticipate &&
                  void runAction(() => api.generatePlan(roomId, me!.id))
                }
                type="button"
              >
                Build plan
              </button>
              <button
                className="button"
                disabled={!canSteer || !snapshot.plan.id}
                onClick={() =>
                  canSteer &&
                  void runAction(() => api.approvePlan(roomId, me!.id))
                }
                type="button"
              >
                Approve plan
              </button>
              <button
                className="button"
                disabled={
                  !canParticipate ||
                  snapshot.adr.status !== "approved" ||
                  snapshot.plan.status !== "approved"
                }
                onClick={() =>
                  canParticipate &&
                  void runAction(() => api.generateHandoff(roomId, me!.id))
                }
                type="button"
              >
                Create handoff
              </button>
            </div>
          </div>
          {snapshot.plan.workstreams.length ? (
            snapshot.plan.workstreams.map((item) => {
              const claim = claimFor("plan_item", item.id);
              const mine = claim?.ownerId === me?.id;
              const draft = workstreamEdits[item.id] ?? item.description;
              return (
                <article
                  className={mine ? "editor-card mine" : "editor-card"}
                  key={item.id}
                >
                  <div className="editor-header">
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.size} · owner {item.ownerStatus}</small>
                    </div>
                    <div className="row-actions">
                      <button
                        className="button"
                        disabled={!canParticipate || Boolean(claim && !mine)}
                        onClick={() =>
                          canParticipate &&
                          void runAction(() =>
                            api.claim(roomId, me!.id, "plan_item", item.id),
                          )
                        }
                        type="button"
                      >
                        Claim
                      </button>
                      <button
                        className="button"
                        disabled={!mine}
                        onClick={() =>
                          mine &&
                          void runAction(() =>
                            api.releaseClaim(
                              roomId,
                              me!.id,
                              "plan_item",
                              item.id,
                            ),
                          )
                        }
                        type="button"
                      >
                        Release
                      </button>
                      <button
                        className="button"
                        disabled={!canParticipate}
                        onClick={() =>
                          canParticipate &&
                          void runAction(() =>
                            api.acceptPlanOwner(roomId, me!.id, item.id),
                          )
                        }
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
                    onChange={(event) =>
                      setWorkstreamEdits((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                  />
                  <div className="row-actions">
                    <small>First step · {item.firstStep}</small>
                    <button
                      className="button primary"
                      disabled={!mine}
                      onClick={() =>
                        mine &&
                        void runAction(() =>
                          api.updatePlanItem(roomId, me!.id, item.id, {
                            description: draft,
                          } as Partial<Workstream>),
                        )
                      }
                      type="button"
                    >
                      Save step
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="empty-state">
              Approve the shared decision first, then build the alignment plan.
            </p>
          )}
        </section>
      </div>

      <div className="room-column right-rail">
        <section className="panel">
          <div className="panel-header">
            <h2>Private helper lane</h2>
            <span className="badge">
              {pendingCount + snapshot.routedToParticipant.length}
            </span>
          </div>
          <small>
            Private helpers can suggest ideas. You decide what becomes shared.
          </small>
          <form
            className="stack-form"
            style={{ marginTop: "0.6rem" }}
            onSubmit={async (event) => {
              event.preventDefault();
              if (!canParticipate || !agentDeltaText.trim()) {
                return;
              }
              await runAction(() =>
                api.submitAgentDelta(
                  roomId,
                  me!.id,
                  agentDeltaText,
                  "local-codex-plugin",
                ),
              );
              setAgentDeltaText("");
            }}
          >
            <textarea
              disabled={!canParticipate}
              placeholder={
                canParticipate
                  ? "Add one private suggestion. Promote the good ones and drop the rest."
                  : "Observers cannot attach private helpers."
              }
              rows={3}
              value={agentDeltaText}
              onChange={(event) => setAgentDeltaText(event.target.value)}
            />
            <button
              className="button"
              disabled={!canParticipate || !agentDeltaText.trim()}
              type="submit"
            >
              Add private suggestion
            </button>
          </form>
          <div className="mini-stack" style={{ marginTop: "0.75rem" }}>
            {snapshot.routedToParticipant.map((item) => {
              const isConflict = item.kind === "conflict";
              return (
                <div
                  className={
                    isConflict ? "list-card routed-card conflict-ping" : "list-card routed-card"
                  }
                  key={item.id}
                >
                  <strong>{isConflict ? "⚠ Conflict — please resolve" : "Private nudge"}</strong>
                  <span>{item.message}</span>
                </div>
              );
            })}
            {snapshot.pendingDeltas
              .filter((item) => item.status === "pending")
              .map((item) => (
                <div className="editor-card" key={item.id}>
                  <strong>{item.sourceAgent}</strong>
                  <span>{item.text}</span>
                  <div className="row-actions">
                    <button
                      className="button primary"
                      disabled={!canParticipate}
                      onClick={() =>
                        canParticipate &&
                        void runAction(() =>
                          api.promoteAgentDelta(roomId, me!.id, item.id),
                        )
                      }
                      type="button"
                    >
                      Promote
                    </button>
                    <button
                      className="button"
                      disabled={!canParticipate}
                      onClick={() =>
                        canParticipate &&
                        void runAction(() =>
                          api.discardAgentDelta(roomId, me!.id, item.id),
                        )
                      }
                      type="button"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              ))}
          </div>
          {!pendingCount && !snapshot.routedToParticipant.length ? (
            <p className="empty-state" style={{ marginTop: "0.8rem" }}>
              No private suggestions waiting.
            </p>
          ) : null}
          <details className="bridge-details">
            <summary>Codex bridge ids</summary>
            <div className="mini-stack">
              <div className="list-card">
                <strong>Room id</strong>
                <code>{roomId}</code>
              </div>
              {me ? (
                <div className="list-card">
                  <strong>Your participant id</strong>
                  <code>{me.id}</code>
                </div>
              ) : null}
            </div>
          </details>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Recent activity</h2>
            <small>{Math.min(snapshot.recentEvents.length, 8)}</small>
          </div>
          <div className="timeline">
            {snapshot.recentEvents.slice(0, 8).map((event) => {
              const meta = describeEvent(event.type);
              const actor =
                event.actorId === "system"
                  ? null
                  : participantById(event.actorId);
              return (
                <article
                  className="timeline-row"
                  key={event.id}
                  data-kind={meta.kind}
                >
                  <div className="timeline-head">
                    <strong>{meta.label}</strong>
                    <span className="timeline-time">
                      {relativeTime(event.timestamp, renderNow)}
                    </span>
                  </div>
                  <span>{event.summary}</span>
                  {actor ? (
                    <span className="timeline-actor">
                      <span
                        className="avatar"
                        data-color={colorFor(actor.id)}
                        aria-hidden="true"
                      >
                        {initialsFrom(actor.displayName)}
                      </span>
                      {actor.displayName}
                    </span>
                  ) : event.actorId === "system" ? (
                    <span className="timeline-actor system">system</span>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
