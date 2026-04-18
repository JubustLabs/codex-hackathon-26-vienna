import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { api } from "@/lib/api";
import {
  firstFilledLine,
  splitDecisionText,
} from "@/lib/decision-language";
import { participantKey, withParticipant } from "@/lib/room-navigation";

export function HandoffPage() {
  const { roomId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const [payload, setPayload] = useState<any>(null);
  const participantId =
    searchParams.get("participantId") ??
    window.localStorage.getItem(participantKey(roomId)) ??
    undefined;

  useEffect(() => {
    void api.handoffDetail(roomId).then(setPayload).catch(() => setPayload(null));
  }, [roomId]);

  const highlights = payload
    ? [
        {
          label: "Question",
          value: payload.room.decision,
        },
        {
          label: "Chosen path",
          value: firstFilledLine(payload.adr.sections.decision) || "No final choice yet",
        },
        {
          label: "Big tradeoff",
          value: firstFilledLine(payload.adr.sections.tradeoffs) || "No tradeoff captured yet",
        },
      ]
    : [];

  return (
    <section className="single-column-page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Shareable handoff</p>
            <h1>Decision summary you can pass on</h1>
          </div>
          <div className="row-actions">
            {payload ? <span className="status-chip" data-status="approved">ready</span> : <span className="status-chip" data-status="draft">pending</span>}
            <Link
              className="button ghost"
              to={withParticipant(`/rooms/${roomId}`, participantId)}
            >
              ← Back to room
            </Link>
          </div>
        </div>
        {payload ? (
          <>
            <div className="summary-strip">
              {highlights.map((item) => (
                <article className="summary-card" key={item.label}>
                  <small>{item.label}</small>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
            <section className="panel-section">
              <div className="panel-header">
                <h2>Why this path won</h2>
              </div>
              {splitDecisionText(payload.adr.sections.tradeoffs).map((item: string) => (
                <article className="list-card" key={item}>
                  <span>{item}</span>
                </article>
              ))}
            </section>
            <section className="panel-section">
              <div className="panel-header">
                <h2>Alignment plan</h2>
              </div>
              {payload.plan.workstreams.map((item: any) => (
                <article className="list-card" key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                  <small className="role-tag">{item.size} · owner {item.ownerStatus}</small>
                </article>
              ))}
            </section>
          </>
        ) : (
          <p className="empty-state">The handoff appears after the shared decision and alignment plan are both approved.</p>
        )}
      </div>
    </section>
  );
}
