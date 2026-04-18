export function AuditLogTable({ events }: { events: any[] }) {
  return (
    <div className="card">
      <h3>Audit Log</h3>
      <div className="audit-table">
        {events.map((e) => (
          <div key={e.id} className="audit-row">
            <div>{e.type}</div>
            <div>{e.actor_id}</div>
            <div>{e.source_client}</div>
            <div>{new Date(e.created_at).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
