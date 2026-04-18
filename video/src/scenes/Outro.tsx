import { AbsoluteFill, useCurrentFrame } from "remotion";

import { font, theme } from "../lib/theme";
import { fadeUp, pop, pulse } from "../lib/motion";

export const Outro = () => {
  const frame = useCurrentFrame();
  const dotScale = pulse(frame, 48, 0.22);

  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(1000px 600px at 15% 0%, rgba(184, 74, 45, 0.16), transparent 60%),
          linear-gradient(180deg, ${theme.bg} 0%, ${theme.bgDeep} 100%)
        `,
        display: "grid",
        placeItems: "center",
        padding: 120,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 22,
            ...pop(frame, 0, 30),
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: theme.accent,
              transform: `scale(${dotScale})`,
              boxShadow: `0 0 0 10px rgba(184,74,45,0.16), 0 0 40px ${theme.accentGlow}`,
            }}
          />
          <span
            style={{
              fontFamily: font.serif,
              fontSize: 86,
              color: theme.ink,
              letterSpacing: "-0.015em",
              fontWeight: 700,
            }}
          >
            Realtime Decision Alignment
          </span>
        </div>
        <div
          style={{
            fontFamily: font.serif,
            fontStyle: "italic",
            fontSize: 50,
            color: theme.accentDeep,
            marginTop: 26,
            lineHeight: 1.15,
            ...fadeUp(frame, 18, 24, 18),
          }}
        >
          Humans steer. Agents collaborate.
          <br />
          Agreement before generation.
        </div>
        <div
          style={{
            marginTop: 60,
            fontFamily: font.sans,
            fontSize: 22,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: theme.muted,
            fontWeight: 600,
            ...fadeUp(frame, 44, 22),
          }}
        >
          Tackling multiplayer · Codex Hackathon · Vienna · 2026
        </div>
      </div>
    </AbsoluteFill>
  );
};
