import { AbsoluteFill, useCurrentFrame } from "remotion";

import { font, theme } from "../lib/theme";
import { fadeUp, pop } from "../lib/motion";

const flags = ["ADR sections", "ADR reviewed", "No blockers", "Plan owners"];

export const Handoff = () => {
  const frame = useCurrentFrame();
  const owners = 3;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${theme.bg} 0%, ${theme.bgDeep} 100%)`,
        padding: 80,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div style={{ textAlign: "center", width: "100%" }}>
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
          Readiness
        </div>
        <div
          style={{
            display: "inline-flex",
            gap: 14,
            marginTop: 22,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {flags.map((label, i) => {
            const on = frame > 24 + i * 16;
            return (
              <div
                key={label}
                style={{
                  padding: "14px 22px",
                  borderRadius: 999,
                  background: on ? "rgba(42,122,80,0.14)" : "rgba(255,253,247,0.7)",
                  color: on ? theme.success : theme.muted,
                  border: `1px solid ${on ? "rgba(42,122,80,0.28)" : "rgba(74,47,17,0.14)"}`,
                  fontFamily: font.sans,
                  fontWeight: 500,
                  fontSize: 22,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: on ? theme.success : "transparent",
                    border: on ? "none" : "1.5px solid rgba(74,47,17,0.3)",
                    boxShadow: on ? `0 0 10px rgba(42,122,80,0.45)` : "none",
                  }}
                />
                {label}
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            marginTop: 32,
            padding: "10px 22px",
            borderRadius: 999,
            background: "rgba(255,253,247,0.7)",
            border: "1px solid rgba(74,47,17,0.14)",
            fontFamily: font.sans,
            fontSize: 22,
            color: theme.muted,
            ...fadeUp(frame, 90, 18),
          }}
        >
          {Array.from({ length: owners }).map((_, i) => {
            const filled = frame > 100 + i * 12;
            return (
              <span
                key={i}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: filled ? theme.success : "transparent",
                  border: filled
                    ? "none"
                    : "1.5px solid rgba(74,47,17,0.3)",
                  boxShadow: filled ? `0 0 8px rgba(42,122,80,0.45)` : "none",
                }}
              />
            );
          })}
          <span style={{ color: theme.ink, fontWeight: 700 }}>
            {Math.min(
              owners,
              Math.max(0, Math.floor((frame - 100) / 12) + 1),
            )}
            /{owners}
          </span>
          decision owners approved
        </div>

        <div
          style={{
            marginTop: 48,
            fontFamily: font.serif,
            fontSize: 108,
            color: theme.ink,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            ...fadeUp(frame, 130, 24, 22),
          }}
        >
          Ship the handoff.
        </div>

        <div
          style={{
            marginTop: 28,
            display: "inline-block",
            background: "#1d1811",
            color: "#f1e5cb",
            padding: "24px 32px",
            borderRadius: 18,
            textAlign: "left",
            fontFamily: font.mono,
            fontSize: 20,
            lineHeight: 1.55,
            boxShadow: "0 40px 80px rgba(64,42,13,0.22)",
            ...pop(frame, 158, 30),
          }}
        >
          {`{
  "room":    { "topic": "Realtime alignment" },
  "adr":     { "status": "approved", "approvals": 3 },
  "plan":    { "status": "approved", "workstreams": 4 },
  "handoff": "ready"
}`}
        </div>
      </div>
    </AbsoluteFill>
  );
};
