import { AbsoluteFill, useCurrentFrame } from "remotion";

import { font, theme } from "../lib/theme";
import { clamp, fadeUp } from "../lib/motion";

const columns = [
  {
    owner: "Alice",
    agent: "her codex",
    color: theme.goal,
    lines: ["fn handle() {", "  retry(3);", "  await task", "  ship.ok", "}"],
  },
  {
    owner: "Bob",
    agent: "his codex",
    color: theme.option,
    lines: ["def handle():", "  return task()", "  # no retry", "  return none", ""],
  },
  {
    owner: "Chen",
    agent: "their codex",
    color: theme.risk,
    lines: ["func handle() {", "  if !ok {", "    panic(err)", "  }", "}"],
  },
];

export const Pain = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${theme.bgInk} 0%, #241c11 100%)`,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 44,
        padding: "140px 120px 220px",
        alignItems: "center",
      }}
    >
      {columns.map((col, i) => {
        const shake =
          Math.sin((frame - 30 - i * 8) * 0.28) *
          clamp(frame, [40 + i * 10, 120], [0, 10]);
        const tilt =
          Math.sin((frame - 44 - i * 11) * 0.18) *
          clamp(frame, [60 + i * 6, 130], [0, 1.2]);
        return (
          <div
            key={col.owner}
            style={{
              ...fadeUp(frame, 8 + i * 10, 20, 24),
              transform: `translate(${shake}px, 0) rotate(${tilt}deg)`,
              background: "#242019",
              border: `1px solid ${col.color}66`,
              borderRadius: 22,
              padding: "28px 32px",
              fontFamily: font.mono,
              color: "#f1e5cb",
              fontSize: 28,
              lineHeight: 1.55,
              boxShadow: `0 30px 70px rgba(0,0,0,0.45), 0 0 0 1px ${col.color}22 inset`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontFamily: font.sans,
                  fontSize: 22,
                  color: col.color,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                }}
              >
                {col.owner}
              </div>
              <div
                style={{
                  fontFamily: font.sans,
                  fontSize: 12,
                  color: "#a89e88",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {col.agent}
              </div>
            </div>
            {col.lines.map((l, j) => (
              <div key={j} style={{ opacity: l ? 1 : 0.2 }}>
                {l || "·"}
              </div>
            ))}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          bottom: 90,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: font.serif,
          fontSize: 52,
          color: "#f1e5cb",
          letterSpacing: "-0.01em",
          ...fadeUp(frame, 60, 22, 18),
        }}
      >
        Your agents{" "}
        <span style={{ color: theme.accent, fontStyle: "italic" }}>fight</span>{" "}
        your colleague's agents.
      </div>
    </AbsoluteFill>
  );
};
