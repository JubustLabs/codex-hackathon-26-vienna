import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "@/lib/api";

export function PlanDetailPage() {
  const { roomId = "" } = useParams();
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    void api.planDetail(roomId).then(setPlan).catch(() => setPlan(null));
  }, [roomId]);

  if (!plan) {
    return (
      <section className="single-column-page">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Plan detail</p>
              <h1>No plan yet</h1>
            </div>
            <Link className="button ghost" to={`/rooms/${roomId}`}>
              ← Back to room
            </Link>
          </div>
          <p className="empty-state">Approve the ADR in the room, then generate the implementation plan.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="single-column-page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Plan detail</p>
            <h1>Implementation plan</h1>
          </div>
          <div className="row-actions">
            <span className="status-chip" data-status={plan.status}>
              {String(plan.status).replaceAll("_", " ")}
            </span>
            <Link className="button ghost" to={`/rooms/${roomId}`}>
              ← Back to room
            </Link>
          </div>
        </div>
        {plan.workstreams.map((item: any) => (
          <article className="list-card" key={item.id}>
            <strong>{item.title}</strong>
            <span>{item.description}</span>
            <small className="role-tag">
              {item.size} · owner {item.ownerStatus}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}
