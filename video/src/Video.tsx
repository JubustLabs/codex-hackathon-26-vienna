import { AbsoluteFill, Series } from "remotion";

import { theme } from "./lib/theme";
import { Cold } from "./scenes/Cold";
import { Emotional } from "./scenes/Emotional";
import { Handoff } from "./scenes/Handoff";
import { Outro } from "./scenes/Outro";
import { Pain } from "./scenes/Pain";
import { Private } from "./scenes/Private";
import { Reveal } from "./scenes/Reveal";
import { Room } from "./scenes/Room";

// 30 fps scene timings — total 1320 frames (~44s).
export const SCENES = [
  { id: "cold", frames: 90, component: Cold },
  { id: "pain", frames: 120, component: Pain },
  { id: "reveal", frames: 150, component: Reveal },
  { id: "room", frames: 210, component: Room },
  { id: "private", frames: 180, component: Private },
  { id: "handoff", frames: 210, component: Handoff },
  { id: "emotional", frames: 240, component: Emotional },
  { id: "outro", frames: 120, component: Outro },
] as const;

export const TOTAL_FRAMES = SCENES.reduce((sum, scene) => sum + scene.frames, 0);

export const Video = () => (
  <AbsoluteFill style={{ background: theme.bg }}>
    <Series>
      {SCENES.map((scene) => (
        <Series.Sequence key={scene.id} durationInFrames={scene.frames}>
          <scene.component />
        </Series.Sequence>
      ))}
    </Series>
  </AbsoluteFill>
);
