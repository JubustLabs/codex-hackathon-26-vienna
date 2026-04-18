import { AbsoluteFill, useCurrentFrame } from "remotion";

import { font, theme } from "../lib/theme";
import { fadeUp } from "../lib/motion";

const lines = [
  { t: "No more fighting agents.", at: 0, size: 132 },
  { t: "No more lost context.", at: 60, size: 132 },
  {
    t: "One room — where people and their agents agree — before a single line of code is generated.",
    at: 130,
    size: 60,
    accent: true,
  },
];

export const Emotional = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${theme.bg} 0%, ${theme.bgDeep} 100%)`,
        padding: 120,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 1500 }}>
        {lines.map((line) => (
          <div
            key={line.t}
            style={{
              fontFamily: font.serif,
              fontStyle: line.accent ? "italic" : "normal",
              fontSize: line.size,
              fontWeight: line.accent ? 500 : 700,
              color: line.accent ? theme.accentDeep : theme.ink,
              lineHeight: 1.12,
              marginBottom: 28,
              letterSpacing: "-0.018em",
              ...fadeUp(frame, line.at, 28, 22),
            }}
          >
            {line.t}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
