import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";

import { font, theme } from "../lib/theme";
import { clamp } from "../lib/motion";

// Each caption is (seconds-from-scene-start, text, kicker). At 30 fps the frame
// number is seconds * 30. Captions fade in, hold, and fade out.
type Caption = { at: number; hold: number; kicker: string; body: string };

const CAPTIONS: Caption[] = [
  { at: 0, hold: 6, kicker: "STEP 1 · HUMAN", body: "Alice & Bob state the decision in the room." },
  { at: 8, hold: 6, kicker: "STEP 2 · PRIVATE AGENT", body: "Each local codex drops a delta only its owner sees." },
  { at: 16, hold: 6, kicker: "STEP 3 · PROMOTE", body: "Humans promote the good deltas. Nothing leaks on its own." },
  { at: 24, hold: 6, kicker: "STEP 4 · SYNTHESIS", body: "Orchestrator re-anchors the room to one shared picture." },
  { at: 32, hold: 10, kicker: "STEP 5 · DECISION", body: "Every section claimed, drafted, reviewed — not a noisy transcript." },
  { at: 46, hold: 10, kicker: "STEP 6 · PLAN", body: "Workstreams, owners, first step — ready for execution." },
  { at: 58, hold: 12, kicker: "STEP 7 · HANDOFF", body: "One JSON envelope. One decision, not four divergent ones." },
];

const CAPTURE_SECONDS = 72;
const FPS = 30;
export const DEMO_CAPTURE_FRAMES = CAPTURE_SECONDS * FPS;

export const DemoCapture = () => {
  const frame = useCurrentFrame();

  // Inward fade to soften the browser capture edges against the parchment bg.
  const vignetteIn = clamp(frame, [0, 12], [0, 1]);
  const vignetteOut = clamp(frame, [DEMO_CAPTURE_FRAMES - 18, DEMO_CAPTURE_FRAMES], [1, 0]);
  const vignette = Math.min(vignetteIn, vignetteOut);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${theme.bg} 0%, ${theme.bgDeep} 100%)`,
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: 24,
        padding: 48,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            fontFamily: font.sans,
            fontSize: 20,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: theme.muted,
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: theme.accent,
              boxShadow: `0 0 14px ${theme.accentGlow}`,
            }}
          />
          Autopilot · recorded session
        </div>
        <div
          style={{
            fontFamily: font.serif,
            fontSize: 26,
            color: theme.accentDeep,
            fontStyle: "italic",
          }}
        >
          Humans steer · agents collaborate.
        </div>
      </div>

      <div
        style={{
          position: "relative",
          borderRadius: 22,
          overflow: "hidden",
          border: `1px solid rgba(74,47,17,0.18)`,
          boxShadow: "0 40px 90px rgba(64,42,13,0.22)",
          opacity: vignette,
        }}
      >
        <OffthreadVideo
          src={staticFile("autopilot-capture.webm")}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <CaptionStrip frame={frame} />
    </AbsoluteFill>
  );
};

function CaptionStrip({ frame }: { frame: number }) {
  const activeCaption = [...CAPTIONS]
    .reverse()
    .find((caption) => frame >= caption.at * FPS);
  if (!activeCaption) return <div style={{ minHeight: 96 }} />;

  const localFrame = frame - activeCaption.at * FPS;
  const appear = clamp(localFrame, [0, 14], [0, 1]);
  const disappearFrames = activeCaption.hold * FPS;
  const disappear = clamp(localFrame, [disappearFrames - 12, disappearFrames], [1, 0]);
  const opacity = Math.min(appear, disappear);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        alignItems: "center",
        gap: 28,
        padding: "18px 28px",
        background: "rgba(255,253,247,0.92)",
        border: "1px solid rgba(74,47,17,0.16)",
        borderLeft: `4px solid ${theme.accent}`,
        borderRadius: 18,
        boxShadow: "0 12px 40px rgba(64,42,13,0.12)",
        opacity,
        transform: `translateY(${(1 - appear) * 12}px)`,
      }}
    >
      <div
        style={{
          fontFamily: font.sans,
          fontSize: 16,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: theme.accentDeep,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {activeCaption.kicker}
      </div>
      <div
        style={{
          fontFamily: font.serif,
          fontSize: 36,
          color: theme.ink,
          letterSpacing: "-0.01em",
          lineHeight: 1.2,
        }}
      >
        {activeCaption.body}
      </div>
    </div>
  );
}
