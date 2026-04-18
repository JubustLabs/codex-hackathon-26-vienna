import { useEffect, useState } from "react";

import type { RoomSnapshot } from "@shared/contracts";

import { api } from "@/lib/api";

export function CataloguePage({ kind }: { kind: "components" | "patterns" }) {
  const [items, setItems] = useState<Array<RoomSnapshot["components"][number] | RoomSnapshot["patterns"][number]>>([]);

  useEffect(() => {
    void api.bootstrap().then((data) => setItems(kind === "components" ? data.components : data.patterns));
  }, [kind]);

  return (
    <section className="single-column-page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Catalogue</p>
            <h1>{kind === "components" ? "Component catalog" : "Pattern library"}</h1>
          </div>
          <span className="badge">{items.length}</span>
        </div>
        {items.map((item: any) => (
          <article className="list-card" key={item.id}>
            <strong>{item.title}</strong>
            <span>{item.summary}</span>
            <small className="role-tag">{kind === "components" ? item.evidence.join(" · ") : item.tags.join(" · ")}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
