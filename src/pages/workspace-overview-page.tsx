import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import type { RoomSnapshot, RoomSummary } from "@shared/contracts";

import { api } from "@/lib/api";

export function WorkspaceOverviewPage() {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [guardrails, setGuardrails] = useState<RoomSnapshot["guardrails"]>([]);
  const [patterns, setPatterns] = useState<RoomSnapshot["patterns"]>([]);
  const [components, setComponents] = useState<RoomSnapshot["components"]>([]);

  useEffect(() => {
    void api.bootstrap().then((data) => {
      setRooms(data.rooms);
      setGuardrails(data.guardrails);
      setPatterns(data.patterns);
      setComponents(data.components);
    });
  }, []);

  return (
    <section className="page-grid">
      <div className="hero-card">
        <p className="eyebrow">POC · vertical slice</p>
        <h1>Agreement before generation</h1>
        <p>
          Generating code has never been easier. Agreeing on <em>what</em> to build is still hard.
          This is the room where your agents stop fighting your colleague's agents — and you, the human, stay in the loop to steer.
          One shared decision, one ADR, one plan, one handoff.
        </p>
        <div className="hero-actions">
          <Link className="button primary" to="/rooms/new">
            Create a room →
          </Link>
          {rooms[0] ? (
            <Link className="button" to={`/rooms/${rooms[0].id}`}>
              Open latest room
            </Link>
          ) : null}
        </div>
        <div className="stat-strip">
          <div className="stat">
            <span className="stat-value">{rooms.length}</span>
            <span className="stat-label">Live rooms</span>
          </div>
          <div className="stat">
            <span className="stat-value">{guardrails.length}</span>
            <span className="stat-label">Guardrails</span>
          </div>
          <div className="stat">
            <span className="stat-value">{patterns.length}</span>
            <span className="stat-label">Patterns</span>
          </div>
          <div className="stat">
            <span className="stat-value">{components.length}</span>
            <span className="stat-label">Components</span>
          </div>
        </div>
      </div>

      <div className="overview-columns">
        <section className="panel">
          <div className="panel-header">
            <h2>Live rooms</h2>
            <Link className="button ghost" to="/rooms/new">
              New room
            </Link>
          </div>
          {rooms.length ? (
            rooms.map((room) => (
              <Link className="list-card" key={room.id} to={`/rooms/${room.id}`}>
                <strong>{room.topic}</strong>
                <span>{room.decision}</span>
                <small className="role-tag">{room.mode.replaceAll("_", " ")}</small>
              </Link>
            ))
          ) : (
            <p className="empty-state">No rooms yet. Start with one scoped decision.</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Guardrails</h2>
            <Link className="button ghost" to="/settings">
              All
            </Link>
          </div>
          {guardrails.map((guardrail) => (
            <div className="list-card" key={guardrail.id}>
              <strong>{guardrail.title}</strong>
              <span>{guardrail.description}</span>
              <small className="role-tag">{guardrail.severity}</small>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Seeded context</h2>
          </div>
          <Link className="list-card" to="/patterns">
            <strong>{patterns.length} patterns</strong>
            <span>Tag-matched, ready in every room from the first utterance.</span>
          </Link>
          <Link className="list-card" to="/components">
            <strong>{components.length} reusable components</strong>
            <span>Catalogued with evidence so proposals trace back to real code.</span>
          </Link>
        </section>
      </div>
    </section>
  );
}
