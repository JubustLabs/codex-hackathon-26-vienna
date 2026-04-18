import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "@/lib/api";

export function PlanDetailPage() {
  const { roomId = "" } = useParams();
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    void api.planDetail(roomId).then(setPlan).catch(() => setPlan(null));
  }, [roomId]);

  if (!plan) {
    return <section className="single-column-page">No generated plan yet.</section>;
  }

  return (
    <section className="single-column-page">
      <div className="panel">
        <div className="panel-header">
          <h1>Plan detail</h1>
          <p>Status: {plan.status}</p>
        </div>
        {plan.workstreams.map((item: any) => (
          <article className="list-card" key={item.id}>
            <strong>{item.title}</strong>
            <span>{item.description}</span>
            <small>
              {item.size} · owner {item.ownerStatus}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}
