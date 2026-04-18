import { AbsoluteFill, useCurrentFrame } from "remotion";

import { font, theme } from "../lib/theme";
import { fadeUp, pop, pulse } from "../lib/motion";

const people = [
  { name: "Georg", role: "Owner", color: theme.accent },
  { name: "Anna", role: "Contributor", color: theme.goal },
  { name: "Sam", role: "Contributor", color: theme.agreement },
  { name: "Leo", role: "Observer", color: theme.tradeoff },
];

const columns = [
  {
    label: "Goal",
    color: theme.goal,
    nodes: [{ c: 92, t: "Ship the POC this weekend" }],
  },
  {
    label: "Constraint",
    color: theme.constraint,
    nodes: [{ c: 88, t: "Bun + SQLite, offline-first" }],
  },
  {
    label: "Option",
    color: theme.option,
    nodes: [
      { c: 78, t: "Heuristic + LLM hybrid" },
      { c: 64, t: "Pure LLM classifier" },
    ],
  },
  {
    label: "Tradeoff",
    color: theme.tradeoff,
    nodes: [{ c: 72, t: "Speed vs. fidelity" }],
  },
  {
    label: "Risk",
    color: theme.risk,
    nodes: [{ c: 80, t: "Silent LLM drift" }],
  },
  {
    label: "Open",
    color: theme.openQuestion,
    nodes: [{ c: 58, t: "Who owns rollout?" }],
  },
  {
    label: "Agreement",
    color: theme.agreement,
    nodes: [{ c: 94, t: "Room-first alignment" }],
  },
  {
    label: "Blocker",
    color: theme.unresolved,
    nodes: [],
  },
];

export const Room = () => {
  const frame = useCurrentFrame();
  const orchDot = pulse(frame, 40, 0.25);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${theme.bg} 0%, ${theme.bgDeep} 100%)`,
        padding: 72,
      }}
    >
      <div
        style={{
          fontFamily: font.sans,
          fontSize: 22,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: theme.muted,
          fontWeight: 600,
          ...fadeUp(frame, 0, 12),
        }}
      >
        Shared room
      </div>
      <div
        style={{
          fontFamily: font.serif,
          fontSize: 76,
          color: theme.ink,
          letterSpacing: "-0.015em",
          marginTop: 6,
          lineHeight: 1.05,
          ...fadeUp(frame, 5, 14),
        }}
      >
        How should the first POC room flow work?
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          margin: "28px 0 28px",
        }}
      >
        {people.map((p, i) => (
          <div
            key={p.name}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              padding: "10px 22px 10px 10px",
              borderRadius: 999,
              background: theme.panelGlass,
              border: "1px solid rgba(74,47,17,0.14)",
              boxShadow: "0 12px 30px rgba(64,42,13,0.06)",
              ...pop(frame, 14 + i * 5, 30),
            }}
          >
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: p.color,
                color: "#fffdf7",
                fontWeight: 700,
                fontSize: 16,
                display: "inline-grid",
                placeItems: "center",
                fontFamily: font.sans,
                letterSpacing: "0.02em",
              }}
            >
              {p.name.slice(0, 2).toUpperCase()}
            </span>
            <span
              style={{
                fontFamily: font.sans,
                fontSize: 22,
                color: theme.ink,
                fontWeight: 500,
              }}
            >
              {p.name}
            </span>
            <span
              style={{
                fontFamily: font.sans,
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: theme.muted,
                fontWeight: 700,
              }}
            >
              {p.role}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          background: `linear-gradient(135deg, rgba(184,74,45,0.12), rgba(255,253,247,0.8))`,
          border: "1px solid rgba(184,74,45,0.24)",
          borderRadius: 22,
          padding: "20px 24px 20px 28px",
          position: "relative",
          boxShadow: "0 18px 50px rgba(64,42,13,0.08)",
          marginBottom: 24,
          ...fadeUp(frame, 34, 20),
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0 auto 0 0",
            width: 5,
            borderTopLeftRadius: 22,
            borderBottomLeftRadius: 22,
            background: `linear-gradient(180deg, ${theme.accent}, ${theme.accentDeep})`,
          }}
        />
        <div
          style={{
            fontFamily: font.sans,
            fontSize: 14,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: theme.accentDeep,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: theme.accent,
              transform: `scale(${orchDot})`,
              boxShadow: `0 0 10px ${theme.accentGlow}`,
            }}
          />
          Orchestrator synthesis
        </div>
        <div
          style={{
            fontFamily: font.serif,
            fontSize: 26,
            color: theme.ink,
            lineHeight: 1.35,
          }}
        >
          The room has converged on a heuristic + LLM hybrid. Remaining blockers: rollout ownership.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 18,
          flex: 1,
        }}
      >
        {columns.map((col, i) => (
          <div
            key={col.label}
            style={{
              background: "rgba(255,253,247,0.55)",
              borderRadius: 18,
              padding: "16px 14px",
              border: "1px solid rgba(74,47,17,0.14)",
              minHeight: 130,
              ...fadeUp(frame, 48 + i * 5, 14),
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontFamily: font.sans,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: col.color,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: col.color,
                }}
              />
              {col.label}
            </div>
            {col.nodes.map((n, j) => (
              <div
                key={n.t}
                style={{
                  background: theme.panel,
                  borderRadius: 12,
                  borderLeft: `3px solid ${col.color}`,
                  padding: "10px 12px",
                  marginBottom: 8,
                  fontFamily: font.sans,
                  fontSize: 17,
                  color: theme.ink,
                  lineHeight: 1.35,
                  boxShadow: "0 4px 12px rgba(64,42,13,0.05)",
                  ...pop(frame, 80 + i * 8 + j * 14, 30),
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: col.color,
                    letterSpacing: "0.05em",
                    marginBottom: 4,
                  }}
                >
                  {n.c}%
                </div>
                {n.t}
              </div>
            ))}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
