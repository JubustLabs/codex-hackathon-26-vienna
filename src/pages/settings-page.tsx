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
          <div>
            <p className="eyebrow">Settings</p>
            <h1>Workspace guardrails</h1>
          </div>
          <span className="badge">{guardrails.length}</span>
          <p>This slice keeps management read-only. The room reads these rules into orchestration and approval gates.</p>
        </div>
        {guardrails.map((guardrail) => (
          <article className="list-card" key={guardrail.id}>
            <strong>{guardrail.title}</strong>
            <span>{guardrail.description}</span>
            <small className="role-tag">{guardrail.key}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
