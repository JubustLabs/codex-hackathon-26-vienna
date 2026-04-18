import { useEffect, useState } from "react";

import type { RoomSnapshot } from "@shared/contracts";

import { api } from "@/lib/api";

export function SettingsPage() {
  const [guardrails, setGuardrails] = useState<RoomSnapshot["guardrails"]>([]);

  useEffect(() => {
    void api.bootstrap().then((data) => setGuardrails(data.guardrails));
  }, []);

  return (
    <section className="single-column-page">
      <div className="panel">
        <div className="panel-header">
          <h1>Workspace guardrails</h1>
          <p>This slice keeps management read-only. The room reads these rules into orchestration and approval gates.</p>
        </div>
        {guardrails.map((guardrail) => (
          <div className="list-card" key={guardrail.id}>
            <strong>{guardrail.title}</strong>
            <span>{guardrail.description}</span>
            <small>{guardrail.key}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
