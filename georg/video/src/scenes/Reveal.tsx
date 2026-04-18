import { AbsoluteFill, useCurrentFrame } from "remotion";

import { font, theme } from "../lib/theme";
import { clamp, fadeUp, pop, pulse } from "../lib/motion";

export const Reveal = () => {
  const frame = useCurrentFrame();
  const parchment = clamp(frame, [0, 26], [0, 1]);
  const dotScale = pulse(frame, 48, 0.22);

  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(1200px 700px at 10% -5%, rgba(184, 74, 45, 0.22), transparent 60%),
          radial-gradient(900px 520px at 100% 10%, rgba(110, 75, 158, 0.16), transparent 55%),
          linear-gradient(180deg, ${theme.bg} 0%, ${theme.bgDeep} 100%)
        `,
        opacity: parchment,
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
            marginBottom: 48,
            ...pop(frame, 18, 30),
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
              fontFamily: font.sans,
              fontSize: 26,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: theme.muted,
              fontWeight: 600,
            }}
          >
            POC · vertical slice
          </span>
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: font.serif,
            fontSize: 112,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            color: theme.ink,
            lineHeight: 1.02,
            ...fadeUp(frame, 36, 22, 24),
          }}
        >
          Real-time decision alignment,
          <br />
          <span style={{ color: theme.accentDeep, fontStyle: "italic" }}>
            steered by humans.
          </span>
        </h1>
        <p
          style={{
            fontFamily: font.sans,
            fontSize: 32,
            color: theme.muted,
            marginTop: 40,
            letterSpacing: "0.01em",
            fontWeight: 500,
            ...fadeUp(frame, 84, 22, 18),
          }}
        >
          One room. Agents collaborate. You decide.
        </p>
      </div>
    </AbsoluteFill>
  );
};
