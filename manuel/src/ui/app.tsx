import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  FileText,
  MessageSquareShare,
  PlugZap,
  RefreshCcw,
  Sparkles
} from "lucide-react";
import { initialRoomState } from "../demo-state";
import type { DeltaType, ParticipantId, RoomState, Suggestion } from "../types";

const API_URL = "http://localhost:3001";

const participantOrder: ParticipantId[] = ["maya", "alex"];

const refinedSuggestions: Record<ParticipantId, Suggestion> = {
  maya: {
    id: "maya-suggest-2",
    type: "constraint",
    text: "Escalate billing, refunds, account access, and low-confidence answers immediately.",
    source: "maya-plugin",
    confidence: 0.94
  },
  alex: {
    id: "alex-suggest-2",
    type: "option",
    text: "Use retrieval-first answers for low-risk questions with explicit confidence thresholds.",
    source: "alex-plugin",
    confidence: 0.91
  }
};

type WsStateMessage = {
  type: "room.state";
  payload: RoomState;
};

type SharedDoc = {
  title: string;
  summary: string;
  decision: string;
  notes: string;
};

const pillLabels: Record<RoomState["phase"], string> = {
  exploring: "Exploring",
  conflicted: "Conflict detected",
  converging: "Converging",
  ready_to_plan: "Ready to plan"
};

export function App() {
  const [room, setRoom] = useState<RoomState>(initialRoomState);
  const [error, setError] = useState<string | null>(null);
  const [docDraft, setDocDraft] = useState<SharedDoc>(() => buildSharedDoc(initialRoomState));
  const [docDirty, setDocDirty] = useState(false);

  useEffect(() => {
    const connect = async () => {
      try {
        for (const participantId of participantOrder) {
          await new Promise((resolve) => window.setTimeout(resolve, participantId === "maya" ? 700 : 1100));
          await fetch(`${API_URL}/plugin/connect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participantId })
          });
        }
      } catch (connectError) {
        setError(connectError instanceof Error ? connectError.message : "Failed to connect plugin bridge.");
      }
    };

    void connect();
  }, []);

  useEffect(() => {
    if (!docDirty) {
      setDocDraft(buildSharedDoc(room));
    }
  }, [docDirty, room]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retryTimer: number | null = null;
    let cancelled = false;

    const connectSocket = () => {
      ws = new WebSocket("ws://localhost:3001/ws");

      ws.onopen = () => {
        setError((current) =>
          current === "WebSocket connection failed. Make sure the local room server is running." ? null : current
        );
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data) as WsStateMessage;
        if (message.type === "room.state") {
          setRoom(message.payload);
        }
      };

      ws.onerror = () => {
        setError("WebSocket connection failed. Make sure the local room server is running.");
      };

      ws.onclose = () => {
        if (cancelled) return;
        retryTimer = window.setTimeout(connectSocket, 1200);
      };
    };

    connectSocket();

    return () => {
      cancelled = true;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      ws?.close();
    };
  }, []);

  const publishSuggestion = async (participantId: ParticipantId, suggestion: Suggestion) => {
    const payload = {
      participantId,
      delta: {
        type: suggestion.type,
        text: suggestion.text,
        source: suggestion.source,
        confidence: suggestion.confidence
      }
    };

    await fetch(`${API_URL}/plugin/publish-delta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  };

  const acknowledgePacket = async (participantId: ParticipantId, packetId: string) => {
    await fetch(`${API_URL}/plugin/ack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, packetId })
    });
  };

  const resetDemo = async () => {
    await fetch(`${API_URL}/demo/reset`, {
      method: "POST"
    });
  };

  const participantSummary = participantOrder
    .map((participantId) => {
      const participant = room.participants[participantId];
      return `${participant.name} · ${participant.role}`;
    })
    .join(" / ");

  const connectedCount = participantOrder.filter((participantId) => room.participants[participantId].pluginConnected).length;
  const publishedTotal = participantOrder.reduce(
    (count, participantId) => count + room.participants[participantId].published.length,
    0
  );
  const bothConnected = connectedCount === participantOrder.length;

  const nextMoveLabel = room.decision ? "Decision ready" : "Next move for the room";
  const nextMoveBody = room.decision
    ? "The room has enough shared structure to commit to a build direction and move into planning."
    : room.whatStillConflicts[0] ?? "The room is waiting for each lane to publish one structured signal.";

  const updateDoc = (field: keyof SharedDoc, value: string) => {
    setDocDirty(true);
    setDocDraft((current) => ({ ...current, [field]: value }));
  };

  const resetDoc = () => {
    setDocDraft(buildSharedDoc(room));
    setDocDirty(false);
  };

  const sideLanes = useMemo(
    () =>
      participantOrder.map((participantId, index) => {
        const participant = room.participants[participantId];
        const publishedCount = participant.published.length;
        const nextSuggestion =
          publishedCount >= 1 && publishedCount < 2 ? refinedSuggestions[participantId] : participant.suggestions[0];
        const highlightedEvidence = participant.evidence.slice(0, 2);
        const remainingEvidence = participant.evidence.slice(2);

        if (!participant.pluginConnected) {
          return (
            <aside className="lane-card lane-card--pending" key={participant.id}>
              <header className="lane-card__head">
                <div className="lane-card__identity">
                  <span className="lane-index">0{index + 1}</span>
                  <div>
                    <p className="eyebrow">{participant.role}</p>
                    <h2>{participant.name}</h2>
                    <p className="lane-card__subtitle">{participant.laneTitle}</p>
                  </div>
                </div>
                <div className="status-dot">
                  <PlugZap size={14} />
                  <span>Connecting</span>
                </div>
              </header>

              <div className="pending-copy">
                <p>{participant.name}&apos;s lane is booting.</p>
              </div>
            </aside>
          );
        }

        return (
          <aside className="lane-card lane-card--live" key={participant.id}>
            <header className="lane-card__head">
              <div className="lane-card__identity">
                <span className="lane-index">0{index + 1}</span>
                <div>
                  <p className="eyebrow">{participant.role}</p>
                  <h2>{participant.name}</h2>
                  <p className="lane-card__subtitle">{participant.laneTitle}</p>
                </div>
              </div>
              <div className={`status-dot ${participant.pluginConnected ? "is-live" : ""}`}>
                <PlugZap size={14} />
                <span>{participant.pluginConnected ? "Plugin ready" : "Connecting"}</span>
              </div>
            </header>

            <p className="lane-card__summary">Private context stays here. One signal goes to the room.</p>

            <section className="lane-card__block">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Key evidence</p>
                  <h3>{highlightedEvidence[0]?.label ?? "Lane context"}</h3>
                </div>
              </div>

              {highlightedEvidence[0] ? (
                <article className={`evidence-chip ${highlightedEvidence[0].emphasis ? "is-emphasis" : ""}`}>
                  <p>{highlightedEvidence[0].text}</p>
                </article>
              ) : null}

              {remainingEvidence.length > 0 ? (
                <details className="lane-details">
                  <summary>More context</summary>
                  <div className="lane-details__body">
                    {remainingEvidence.map((evidence) => (
                      <article className="evidence-chip" key={evidence.label}>
                        <p>{evidence.text}</p>
                      </article>
                    ))}
                  </div>
                </details>
              ) : null}
            </section>

            <section className="lane-card__block">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Next signal</p>
                  <h3>{labelForType(nextSuggestion.type)}</h3>
                </div>
                <span className="badge badge--accent">{Math.round(nextSuggestion.confidence * 100)}% confidence</span>
              </div>

              <article className="signal-card">
                <p className="signal-card__text">{nextSuggestion.text}</p>
                <button className="button" onClick={() => void publishSuggestion(participantId, nextSuggestion)}>
                  <MessageSquareShare size={16} />
                  Share to room
                </button>
              </article>
            </section>

            <section className="lane-card__block">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Conflict return</p>
                  <h3>Only when needed</h3>
                </div>
              </div>

              {participant.packets.length > 0 ? (
                <div className="packet-list">
                  {participant.packets.map((packet) => (
                    <article className="packet-card" key={packet.id}>
                      <p className="eyebrow">{packet.topic}</p>
                      <p className="packet-card__prompt">{packet.suggestedNextStep}</p>
                      <button
                        className="button button--ghost"
                        disabled={packet.acknowledged}
                        onClick={() => void acknowledgePacket(participantId, packet.id)}
                      >
                        {packet.acknowledged ? "Seen" : "Acknowledge"}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="quiet-copy">No routed conflict right now.</p>
              )}
            </section>
          </aside>
        );
      }),
    [room]
  );

  return (
    <main className="app-shell">
      <div className="ambient ambient--halo" />
      <div className="ambient ambient--ember" />
      <div className="ambient ambient--grid" />

      <header className="brand-bar">
        <div className="wordmark">
          <span className="wordmark__mark">C</span>
          <div>
            <p className="eyebrow">Converge</p>
            <p className="wordmark__subcopy">Decision rooms for domain experts and builders</p>
          </div>
        </div>
        <button className="button button--ghost" onClick={() => void resetDemo()}>
          <RefreshCcw size={15} />
          Reset demo
        </button>
      </header>

      <section className="hero-band">
        <div className="hero-band__copy">
          <p className="eyebrow">Live demo</p>
          <h1>Private expert lanes. One shared decision.</h1>
          <p className="hero-band__lede">
            Support and Engineering align on the first customer service agent architecture without pouring all private
            reasoning into the room.
          </p>
        </div>

        <div className="hero-band__meta">
          <span className={`phase-pill phase-pill--${room.phase}`}>{pillLabels[room.phase]}</span>
          <span className="badge badge--accent">
            <Sparkles size={14} />
            {room.topic}
          </span>
        </div>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="workspace-grid">
        {sideLanes[0]}

        {bothConnected ? (
          <section className="shared-stage shared-stage--live">
            <header className="shared-stage__head">
              <div>
                <p className="eyebrow">Shared room</p>
                <h2>Working decision document</h2>
              </div>
              <div className="shared-stage__actions">
                <span className="badge badge--accent">
                  <FileText size={14} />
                  Editable draft
                </span>
                {docDirty ? (
                  <button className="button button--ghost" onClick={resetDoc}>
                    Reset to room
                  </button>
                ) : null}
              </div>
            </header>

            <div className="doc-editor">
              <label className="doc-field">
                <span className="eyebrow">Document title</span>
                <input value={docDraft.title} onChange={(event) => updateDoc("title", event.target.value)} />
              </label>

              <label className="doc-field">
                <span className="eyebrow">Working summary</span>
                <textarea
                  rows={6}
                  value={docDraft.summary}
                  onChange={(event) => updateDoc("summary", event.target.value)}
                />
              </label>

              <div className="doc-editor__grid">
                <label className="doc-field">
                  <span className="eyebrow">{room.decision ? "Decision" : "Proposed direction"}</span>
                  <textarea
                    rows={5}
                    value={docDraft.decision}
                    onChange={(event) => updateDoc("decision", event.target.value)}
                  />
                </label>

                <label className="doc-field">
                  <span className="eyebrow">Open notes</span>
                  <textarea rows={5} value={docDraft.notes} onChange={(event) => updateDoc("notes", event.target.value)} />
                </label>
              </div>
            </div>

            <div className="shared-stage__grid">
              <section className="shared-block shared-block--decision">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">{room.decision ? "Outcome" : "Next move"}</p>
                    <h3>{nextMoveLabel}</h3>
                  </div>
                </div>
                {room.decision ? <p className="decision-text">{room.decision}</p> : <p className="quiet-copy">{nextMoveBody}</p>}
              </section>

              {publishedTotal > 0 ? (
                <section className="shared-block">
                  <div className="section-head">
                    <div>
                      <p className="eyebrow">Decision frame</p>
                      <h3>What the room is deciding</h3>
                    </div>
                  </div>
                  <ul className="bullet-list">
                    {room.whatWereDeciding.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {publishedTotal > 0 ? (
                <section className="shared-block">
                  <div className="section-head">
                    <div>
                      <p className="eyebrow">Common ground</p>
                      <h3>What is already true</h3>
                    </div>
                    <span className="inline-signal inline-signal--success">
                      <CheckCircle2 size={15} />
                      Shared footing
                    </span>
                  </div>
                  <ul className="bullet-list bullet-list--success">
                    {room.commonGround.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {publishedTotal > 1 ? (
                <section className="shared-block shared-block--alert">
                  <div className="section-head">
                    <div>
                      <p className="eyebrow">Live conflict</p>
                      <h3>What still needs resolution</h3>
                    </div>
                    <span className="inline-signal">
                      <CircleAlert size={15} />
                      One disagreement
                    </span>
                  </div>
                  <ul className="bullet-list">
                    {room.whatStillConflicts.length > 0 ? (
                      room.whatStillConflicts.map((item) => <li key={item}>{item}</li>)
                    ) : (
                      <li>The central conflict is resolved and the room is ready to commit.</li>
                    )}
                  </ul>
                </section>
              ) : null}

              {room.decision ? (
                <section className="shared-block">
                  <p className="eyebrow">Decision trace</p>
                  <div className="breadcrumbs">
                    {room.breadcrumbs.map((breadcrumb) => (
                      <span className="breadcrumb" key={breadcrumb.id}>
                        {breadcrumb.text}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="shared-stage shared-stage--pending">
            <p className="eyebrow">Shared room</p>
            <h2>Waiting for both private lanes to connect.</h2>
            <p className="quiet-copy">The center lane stays quiet until the setup is complete.</p>
          </section>
        )}

        {sideLanes[1]}
      </section>
    </main>
  );
}

function labelForType(type: DeltaType) {
  return type.replaceAll("_", " ");
}

function buildSharedDoc(room: RoomState): SharedDoc {
  const summaryParts = [
    room.synthesisBody,
    room.commonGround.length > 0 ? `Common ground: ${room.commonGround.join(" ")}` : "",
    room.whatStillConflicts.length > 0 ? `Open conflict: ${room.whatStillConflicts.join(" ")}` : ""
  ].filter(Boolean);

  return {
    title: room.decision ? room.decision : room.synthesisTitle,
    summary: summaryParts.join("\n\n"),
    decision: room.decision ?? room.currentBlocker,
    notes: room.plan.length > 0 ? room.plan.join("\n") : room.whatWereDeciding.join("\n")
  };
}
