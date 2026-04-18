import { Composition } from "remotion";

import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

import { TOTAL_FRAMES, Video } from "./Video";

// Preload webfonts so rendered frames are deterministic.
loadFraunces("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });
loadFraunces("italic", { weights: ["500", "600"], subsets: ["latin"] });
loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

const FPS = 30;

export const Root = () => (
  <>
    <Composition
      id="RealtimeAlignment"
      component={Video}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  </>
);
