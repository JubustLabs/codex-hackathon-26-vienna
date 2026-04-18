import { AbsoluteFill, useCurrentFrame } from "remotion";

import { font, theme } from "../lib/theme";
import { clamp, fadeUp } from "../lib/motion";

export const Cold = () => {
  const frame = useCurrentFrame();
  const glow = clamp(frame, [36, 78], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${theme.bgInk} 0%, #2a2318 100%)`,
        display: "grid",
        placeItems: "center",
        padding: 120,
      }}
    >
      <div style={{ textAlign: "center", color: "#f1e5cb", maxWidth: 1600 }}>
        <div
          style={{
            fontFamily: font.sans,
            fontSize: 30,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#a89e88",
            marginBottom: 32,
            fontWeight: 500,
            ...fadeUp(frame, 4, 16),
          }}
        >
          Generating code has never been easier.
        </div>
        <div
          style={{
            fontFamily: font.serif,
            fontSize: 124,
            fontWeight: 700,
            letterSpacing: "-0.022em",
            lineHeight: 1.02,
            color: "#f7ecd1",
            ...fadeUp(frame, 22, 20, 24),
          }}
        >
          Agreeing on{" "}
          <span
            style={{
              fontStyle: "italic",
              color: theme.accent,
              textShadow: `0 0 ${60 * glow}px rgba(184, 74, 45, ${0.55 * glow})`,
            }}
          >
            what
          </span>{" "}
          to build
        </div>
        <div
          style={{
            fontFamily: font.serif,
            fontSize: 124,
            fontWeight: 700,
            letterSpacing: "-0.022em",
            lineHeight: 1.02,
            color: "#f7ecd1",
            marginTop: 10,
            ...fadeUp(frame, 40, 22, 26),
          }}
        >
          is still <span style={{ fontStyle: "italic", color: theme.accent }}>hard</span>.
        </div>
      </div>
    </AbsoluteFill>
  );
};
