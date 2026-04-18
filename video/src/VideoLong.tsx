import { AbsoluteFill, Series } from "remotion";

import { theme } from "./lib/theme";
import { Bridge } from "./scenes/Bridge";
import { Cold } from "./scenes/Cold";
import { DemoCapture, DEMO_CAPTURE_FRAMES } from "./scenes/DemoCapture";
import { Emotional } from "./scenes/Emotional";
import { Handoff } from "./scenes/Handoff";
import { Outro } from "./scenes/Outro";
import { Pain } from "./scenes/Pain";
import { Private } from "./scenes/Private";
import { Reveal } from "./scenes/Reveal";
import { Room } from "./scenes/Room";

// 30 fps. Same prologue as the short video, plus a bridge card, the recorded
// autopilot capture (with overlay captions), and a shortened outro.
export const LONG_SCENES = [
  { id: "cold", frames: 90, component: Cold },
  { id: "pain", frames: 120, component: Pain },
  { id: "reveal", frames: 150, component: Reveal },
  { id: "room", frames: 210, component: Room },
  { id: "private", frames: 180, component: Private },
  { id: "handoff", frames: 210, component: Handoff },
  { id: "emotional", frames: 240, component: Emotional },
  { id: "bridge", frames: 90, component: Bridge },
  { id: "capture", frames: DEMO_CAPTURE_FRAMES, component: DemoCapture },
  { id: "outro", frames: 150, component: Outro },
] as const;

export const LONG_TOTAL_FRAMES = LONG_SCENES.reduce(
  (sum, scene) => sum + scene.frames,
  0,
);

export const VideoLong = () => (
  <AbsoluteFill style={{ background: theme.bg }}>
    <Series>
      {LONG_SCENES.map((scene) => (
        <Series.Sequence key={scene.id} durationInFrames={scene.frames}>
          <scene.component />
        </Series.Sequence>
      ))}
    </Series>
  </AbsoluteFill>
);
