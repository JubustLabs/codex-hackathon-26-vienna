export function RevisionTimeline({ revisions }: { revisions: any[] }) {
  return (
    <div className="card">
      <h3>Revision Timeline</h3>
      <div className="list">
        {revisions.map((r) => (
          <div key={r.id} className="list-item static">
            <div>rev {r.revision_number} · {r.id}</div>
            <small>{r.reason} · by {r.created_by} · {new Date(r.created_at).toLocaleString()}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
