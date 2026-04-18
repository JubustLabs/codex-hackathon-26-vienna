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
        <p className="eyebrow">POC vertical slice</p>
        <h1>Agreement before generation</h1>
        <p>
          This slice implements the plan as a runnable Bun + React + SQLite workspace: realtime room, private deltas, shared
          orchestrator, ADR flow, plan generation, and handoff export.
        </p>
        <div className="hero-actions">
          <Link className="button primary" to="/rooms/new">
            Create room
          </Link>
          {rooms[0] ? (
            <Link className="button" to={`/rooms/${rooms[0].id}`}>
              Open latest room
            </Link>
          ) : null}
        </div>
      </div>

      <div className="overview-columns">
        <section className="panel">
          <div className="panel-header">
            <h2>Live rooms</h2>
          </div>
          {rooms.length ? (
            rooms.map((room) => (
              <Link className="list-card" key={room.id} to={`/rooms/${room.id}`}>
                <strong>{room.topic}</strong>
                <span>{room.decision}</span>
                <small>{room.mode}</small>
              </Link>
            ))
          ) : (
            <p className="empty-state">No rooms yet. Start with one scoped decision.</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Guardrails</h2>
          </div>
          {guardrails.map((guardrail) => (
            <div className="list-card" key={guardrail.id}>
              <strong>{guardrail.title}</strong>
              <span>{guardrail.description}</span>
              <small>{guardrail.severity}</small>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Seeded context</h2>
          </div>
          <div className="list-card">
            <strong>{patterns.length} patterns</strong>
            <span>Seeded tag matches are available in-room from the start.</span>
          </div>
          <div className="list-card">
            <strong>{components.length} reusable components</strong>
            <span>Components, server, and event-log evidence are already catalogued.</span>
          </div>
        </section>
      </div>
    </section>
  );
}
