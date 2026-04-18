import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { api } from "@/lib/api";
import {
  firstFilledLine,
  labelDecisionSection,
  splitDecisionText,
} from "@/lib/decision-language";
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
    return <section className="single-column-page">Loading shared decision…</section>;
  }

  const highlights = [
    {
      label: "Chosen path",
      value: firstFilledLine(adr.sections.decision) || "No final choice yet",
    },
    {
      label: "Tradeoff",
      value: firstFilledLine(adr.sections.tradeoffs) || "No tradeoff captured yet",
    },
    {
      label: "What happens next",
      value:
        firstFilledLine(adr.sections.consequences, adr.sections.implementation_guidance) ||
        "No next step captured yet",
    },
  ];

  return (
    <section className="single-column-page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Shared decision record</p>
            <h1>Review the choice after the fact</h1>
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
        <div className="summary-strip">
          {highlights.map((item) => (
            <article className="summary-card" key={item.label}>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
        {Object.entries(adr.sections).map(([key, value]) => (
          <article className="list-card" key={key}>
            <strong>{labelDecisionSection(key)}</strong>
            <span>{splitDecisionText(String(value)).join(" · ") || "Empty"}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
