import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { api } from "@/lib/api";
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

  return (
    <section className="single-column-page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Handoff package</p>
            <h1>Shippable artifact</h1>
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
          <pre className="code-block">{JSON.stringify(payload, null, 2)}</pre>
        ) : (
          <p className="empty-state">The handoff package is generated after both ADR and plan are approved in the room.</p>
        )}
      </div>
    </section>
  );
}
