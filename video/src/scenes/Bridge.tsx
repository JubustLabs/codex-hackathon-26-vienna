import { AbsoluteFill, useCurrentFrame } from "remotion";

import { font, theme } from "../lib/theme";
import { fadeUp, pulse } from "../lib/motion";

export const Bridge = () => {
  const frame = useCurrentFrame();
  const dotScale = pulse(frame, 48, 0.22);

  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(1000px 600px at 50% 0%, rgba(184, 74, 45, 0.16), transparent 60%),
          linear-gradient(180deg, ${theme.bg} 0%, ${theme.bgDeep} 100%)
        `,
        display: "grid",
        placeItems: "center",
        padding: 120,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 1500 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 22,
            marginBottom: 32,
            ...fadeUp(frame, 4, 16),
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: theme.accent,
              transform: `scale(${dotScale})`,
              boxShadow: `0 0 0 8px rgba(184,74,45,0.14), 0 0 30px ${theme.accentGlow}`,
            }}
          />
          <span
            style={{
              fontFamily: font.sans,
              fontSize: 24,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: theme.muted,
              fontWeight: 700,
            }}
          >
            Live capture follows
          </span>
        </div>
        <div
          style={{
            fontFamily: font.serif,
            fontSize: 104,
            fontWeight: 700,
            color: theme.ink,
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
            ...fadeUp(frame, 14, 20, 26),
          }}
        >
          Now watch it happen <span style={{ fontStyle: "italic", color: theme.accentDeep }}>for real.</span>
        </div>
        <p
          style={{
            marginTop: 28,
            fontFamily: font.sans,
            fontSize: 28,
            color: theme.muted,
            lineHeight: 1.4,
            ...fadeUp(frame, 32, 22, 20),
          }}
        >
          One browser. One autopilot. Humans steer · agents collaborate.
        </p>
      </div>
    </AbsoluteFill>
  );
};
