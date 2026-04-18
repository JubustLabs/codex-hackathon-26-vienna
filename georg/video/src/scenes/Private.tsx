import { AbsoluteFill, useCurrentFrame } from "remotion";

import { font, theme } from "../lib/theme";
import { clamp, fadeUp } from "../lib/motion";

export const Private = () => {
  const frame = useCurrentFrame();
  const glow = clamp(frame, [80, 115], [0, 1]);
  const slideX = clamp(frame, [115, 160], [0, -520]);
  const cardOpacity = frame > 158 ? 0 : 1;
  const nodeIn = clamp(frame, [150, 172], [0, 1]);
  // Merge the fade-up enter with the slide-out exit so opacity/transform
  // are each specified once (avoids TS2783).
  const cardEnter = clamp(frame, [20, 40], [0, 1]);
  const cardLift = (1 - cardEnter) * 18;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${theme.bg} 0%, ${theme.bgDeep} 100%)`,
        padding: 80,
        display: "grid",
        gridTemplateColumns: "1fr 520px",
        gap: 60,
        alignItems: "center",
      }}
    >
      <div style={{ ...fadeUp(frame, 0, 14) }}>
        <div
          style={{
            fontFamily: font.sans,
            fontSize: 22,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: theme.muted,
            fontWeight: 600,
          }}
        >
          Your work
        </div>
        <div
          style={{
            fontFamily: font.serif,
            fontSize: 92,
            color: theme.ink,
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
            marginTop: 18,
          }}
        >
          Your agent suggests.
          <br />
          <span style={{ color: theme.accentDeep, fontStyle: "italic" }}>
            You decide what the room sees.
          </span>
        </div>
        <p
          style={{
            fontFamily: font.sans,
            fontSize: 28,
            color: theme.muted,
            lineHeight: 1.45,
            marginTop: 28,
            maxWidth: 720,
          }}
        >
          Private deltas stay private until a human promotes them. No leakage,
          no autopilot — humans steer.
        </p>

        <div
          style={{
            marginTop: 40,
            opacity: nodeIn,
            transform: `translateY(${(1 - nodeIn) * 20}px)`,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              gap: 10,
              alignItems: "center",
              padding: "12px 18px",
              borderRadius: 14,
              background: theme.panel,
              borderLeft: `3px solid ${theme.option}`,
              border: "1px solid rgba(74,47,17,0.14)",
              boxShadow: "0 18px 40px rgba(64,42,13,0.12)",
            }}
          >
            <span
              style={{
                fontFamily: font.sans,
                fontSize: 13,
                color: theme.option,
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              82% · OPTION
            </span>
            <span
              style={{
                fontFamily: font.sans,
                fontSize: 18,
                color: theme.ink,
              }}
            >
              Include event log in handoff for downstream replay
            </span>
          </div>
        </div>
      </div>

      <div style={{ position: "relative", minHeight: 380 }}>
        <div
          style={{
            background: theme.panel,
            borderRadius: 22,
            padding: "22px 24px",
            border: `1px solid rgba(184,74,45,${0.35})`,
            boxShadow: `0 30px 70px rgba(64,42,13,${0.16}), 0 0 0 1px rgba(184,74,45,${0.06})`,
            opacity: cardOpacity * cardEnter,
            transform: `translate(${slideX}px, ${cardLift}px)`,
          }}
        >
          <div
            style={{
              fontFamily: font.sans,
              fontSize: 14,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: theme.accentDeep,
              fontWeight: 700,
              marginBottom: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: theme.accent,
                boxShadow: `0 0 8px ${theme.accentGlow}`,
              }}
            />
            local-codex-plugin
          </div>
          <div
            style={{
              fontFamily: font.serif,
              fontSize: 30,
              color: theme.ink,
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
            }}
          >
            What if the handoff includes the event log so downstream tools can replay the decision?
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <div
              style={{
                padding: "14px 26px",
                borderRadius: 999,
                background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentDeep})`,
                color: "#fff8ee",
                fontFamily: font.sans,
                fontWeight: 600,
                fontSize: 18,
                boxShadow: `0 ${8 + 14 * glow}px ${16 + 24 * glow}px rgba(184,74,45,${0.25 + 0.35 * glow})`,
                transform: `translateY(-${glow * 2}px)`,
              }}
            >
              Promote
            </div>
            <div
              style={{
                padding: "14px 26px",
                borderRadius: 999,
                background: "transparent",
                border: "1px solid rgba(74,47,17,0.22)",
                fontFamily: font.sans,
                fontSize: 18,
                color: theme.muted,
              }}
            >
              Discard
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
