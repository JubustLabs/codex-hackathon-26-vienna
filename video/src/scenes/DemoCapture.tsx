import { AbsoluteFill, Easing, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";

import { font, theme } from "../lib/theme";
import { clamp } from "../lib/motion";

// Each caption is (seconds-from-scene-start, text, kicker). At 30 fps the frame
// number is seconds * 30. Captions fade in, hold, and fade out.
type Caption = { at: number; hold: number; kicker: string; body: string };

const CAPTIONS: Caption[] = [
  { at: 0, hold: 7, kicker: "STEP 1 · HUMANS", body: "Marketing, support & IT state the decision in the room." },
  { at: 9, hold: 6, kicker: "STEP 2 · PRIVATE AGENT", body: "Each department's local codex drops a delta only its owner sees." },
  { at: 17, hold: 6, kicker: "STEP 3 · PROMOTE", body: "Humans promote the good deltas. Nothing leaks on its own." },
  { at: 25, hold: 5, kicker: "STEP 4 · SYNTHESIS", body: "Orchestrator re-anchors the three departments to one shared picture." },
  { at: 32, hold: 18, kicker: "STEP 5 · DECISION", body: "Every section claimed, drafted, reviewed — not a noisy transcript." },
  { at: 52, hold: 10, kicker: "STEP 6 · PLAN", body: "Workstreams, owners, first step — ready for execution." },
  { at: 64, hold: 8, kicker: "STEP 7 · HANDOFF", body: "One JSON envelope. One decision, not three divergent ones." },
];

// Camera waypoints that follow the autopilot + the recorder's programmatic
// scroll. The recorder keeps the page at the top for ~26s, then scrolls to
// "Shared decision draft" (~26s), "Alignment plan" (~54s), and nudges down
// toward the handoff button (~78s). Because the page is already scrolling to
// the right region, the camera mostly does gentle zoom/tilt for emphasis —
// not aggressive panning. focusX/Y are normalized (0..1) on the captured
// frame (0.5, 0.5 = dead center). The room is a three-column grid: left rail
// ≈ 0.0–0.18, center column ≈ 0.18–0.82 (alignment board top → ADR middle →
// plan bottom), right rail ≈ 0.82–1.0 (private helper lane with pending
// deltas + promote buttons).
type CameraKey = { at: number; zoom: number; focusX: number; focusY: number };

const CAMERA_KEYS: CameraKey[] = [
  // Establishing: the whole room.
  { at: 0, zoom: 1.03, focusX: 0.5, focusY: 0.5 },
  // STEP 1 HUMANS — alignment board (center, upper half) populates as the
  // three departments speak. Slight tilt left since the decision brief on
  // the left rail frames the topic.
  { at: 60, zoom: 1.28, focusX: 0.42, focusY: 0.45 },
  // STEP 2 PRIVATE AGENT — pending deltas land in the right-rail "Private
  // helper lane". Pan right.
  { at: 270, zoom: 1.4, focusX: 0.82, focusY: 0.48 },
  // STEP 3 PROMOTE — still in the right rail, slight tilt down so the
  // Promote/Discard buttons on the delta cards are centered.
  { at: 510, zoom: 1.4, focusX: 0.82, focusY: 0.58 },
  // STEP 4 SYNTHESIS — orchestrator card in the center column, top area.
  { at: 750, zoom: 1.3, focusX: 0.5, focusY: 0.4 },
  // STEP 5 DECISION — the page scrolls at ~26s so "Shared decision draft"
  // moves into view. Zoom slightly into the center column.
  { at: 960, zoom: 1.32, focusX: 0.5, focusY: 0.5 },
  // Hold on the sections being written (~30–50s of scene time).
  { at: 1440, zoom: 1.38, focusX: 0.5, focusY: 0.55 },
  // STEP 6 PLAN — page scrolls to "Alignment plan" at ~54s. Center column,
  // slight downward tilt.
  { at: 1620, zoom: 1.32, focusX: 0.5, focusY: 0.55 },
  // STEP 7 HANDOFF — page nudges further so "Create handoff" + the JSON
  // result are visible.
  { at: 1920, zoom: 1.3, focusX: 0.5, focusY: 0.6 },
  // Pull back slightly for the outro.
  { at: 2100, zoom: 1.08, focusX: 0.5, focusY: 0.5 },
];

const CAMERA_FRAMES = CAMERA_KEYS.map((k) => k.at);
const CAMERA_ZOOMS = CAMERA_KEYS.map((k) => k.zoom);
const CAMERA_FX = CAMERA_KEYS.map((k) => k.focusX);
const CAMERA_FY = CAMERA_KEYS.map((k) => k.focusY);
const CAMERA_EASING = Easing.inOut(Easing.cubic);

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
        <CameraStage frame={frame} />
      </div>

      <CaptionStrip frame={frame} />
    </AbsoluteFill>
  );
};

function CameraStage({ frame }: { frame: number }) {
  // Interpolate zoom + focal point across waypoints with a cubic in/out ease so
  // the pan feels cinematic rather than linear. transform-origin stays at 0 0
  // so the translate math (below) is a straight "move focal point to center"
  // calculation rather than depending on the element's current midpoint.
  const zoom = interpolate(frame, CAMERA_FRAMES, CAMERA_ZOOMS, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: CAMERA_EASING,
  });
  const focusX = interpolate(frame, CAMERA_FRAMES, CAMERA_FX, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: CAMERA_EASING,
  });
  const focusY = interpolate(frame, CAMERA_FRAMES, CAMERA_FY, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: CAMERA_EASING,
  });

  // With transform-origin (0,0), a point at (fx*W, fy*H) in the unscaled
  // element lands at (zoom*fx*W + tx*W, zoom*fy*H + ty*H) after
  // `translate(tx,ty) scale(zoom)`. Setting that equal to (0.5W, 0.5H) gives
  // tx = 0.5 - zoom*focusX, ty = 0.5 - zoom*focusY.
  const tx = (0.5 - zoom * focusX) * 100;
  const ty = (0.5 - zoom * focusY) * 100;

  return (
    <OffthreadVideo
      src={staticFile("autopilot-capture.webm")}
      muted
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transformOrigin: "0 0",
        transform: `translate(${tx}%, ${ty}%) scale(${zoom})`,
        willChange: "transform",
      }}
    />
  );
}

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
