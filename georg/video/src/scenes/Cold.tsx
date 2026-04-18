import { AbsoluteFill, useCurrentFrame } from "remotion";

import { font, theme } from "../lib/theme";
import { clamp, fadeUp } from "../lib/motion";

export const Cold = () => {
  const frame = useCurrentFrame();
  const glow = clamp(frame, [20, 70], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${theme.bgInk} 0%, #2a2318 100%)`,
        display: "grid",
        placeItems: "center",
        padding: 120,
      }}
    >
      <div style={{ textAlign: "center", color: "#f1e5cb" }}>
        <div
          style={{
            fontFamily: font.sans,
            fontSize: 30,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#a89e88",
            marginBottom: 44,
            fontWeight: 500,
            ...fadeUp(frame, 6, 18),
          }}
        >
          Every AI coding tool skips the hardest part.
        </div>
        <div
          style={{
            fontFamily: font.serif,
            fontSize: 220,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            color: theme.accent,
            textShadow: `0 0 ${60 * glow}px rgba(184, 74, 45, ${0.55 * glow})`,
            ...fadeUp(frame, 30, 22, 28),
          }}
        >
          Agreement.
        </div>
      </div>
    </AbsoluteFill>
  );
};
