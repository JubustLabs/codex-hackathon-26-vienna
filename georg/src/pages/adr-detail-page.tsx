import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "@/lib/api";

export function AdrDetailPage() {
  const { roomId = "" } = useParams();
  const [adr, setAdr] = useState<any>(null);

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
          <h1>ADR detail</h1>
          <p>Status: {adr.status}</p>
        </div>
        {Object.entries(adr.sections).map(([key, value]) => (
          <article className="list-card" key={key}>
            <strong>{key}</strong>
            <span>{String(value) || "Empty"}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
