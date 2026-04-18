import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "@/lib/api";

export function HandoffPage() {
  const { roomId = "" } = useParams();
  const [payload, setPayload] = useState<any>(null);

  useEffect(() => {
    void api.handoffDetail(roomId).then(setPayload).catch(() => setPayload(null));
  }, [roomId]);

  return (
    <section className="single-column-page">
      <div className="panel">
        <div className="panel-header">
          <h1>Handoff package</h1>
        </div>
        <pre className="code-block">{payload ? JSON.stringify(payload, null, 2) : "Handoff package becomes available after plan approval."}</pre>
      </div>
    </section>
  );
}
