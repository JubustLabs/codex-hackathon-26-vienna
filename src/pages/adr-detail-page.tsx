import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { api } from "@/lib/api";
import { participantKey, withParticipant } from "@/lib/room-navigation";

export function AdrDetailPage() {
  const { roomId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const [adr, setAdr] = useState<any>(null);
  const participantId =
    searchParams.get("participantId") ??
    window.localStorage.getItem(participantKey(roomId)) ??
    undefined;

  useEffect(() => {
    void api.adrDetail(roomId).then(setAdr);
  }, [roomId]);

  if (!adr) {
    return <section className="single-column-page">Loading ADR…</section>;
  }

  return (
    <section className="single-column-page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">ADR detail</p>
            <h1>Architecture decision record</h1>
          </div>
          <div className="row-actions">
            <span className="status-chip" data-status={adr.status}>
              {String(adr.status).replaceAll("_", " ")}
            </span>
            <Link
              className="button ghost"
              to={withParticipant(`/rooms/${roomId}`, participantId)}
            >
              ← Back to room
            </Link>
          </div>
        </div>
        {Object.entries(adr.sections).map(([key, value]) => (
          <article className="list-card" key={key}>
            <strong>{key.replaceAll("_", " ")}</strong>
            <span>{String(value) || "Empty"}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
