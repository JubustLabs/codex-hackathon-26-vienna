import { interpolate, spring } from "remotion";

export const clamp = (
  input: number,
  inRange: [number, number],
  outRange: [number, number],
) =>
  interpolate(input, inRange, outRange, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const fadeUp = (frame: number, startAt: number, duration = 16, lift = 18) => {
  const t = clamp(frame, [startAt, startAt + duration], [0, 1]);
  return {
    opacity: t,
    transform: `translateY(${(1 - t) * lift}px)`,
  };
};

export const fade = (frame: number, startAt: number, duration = 14) => ({
  opacity: clamp(frame, [startAt, startAt + duration], [0, 1]),
});

export const pop = (frame: number, startAt: number, fps = 30) => {
  const s = spring({
    frame: Math.max(0, frame - startAt),
    fps,
    config: { damping: 14, stiffness: 140, mass: 0.7 },
  });
  return { transform: `scale(${0.85 + 0.15 * s})`, opacity: s };
};

export const pulse = (frame: number, period = 60, amount = 0.18) =>
  1 + Math.sin((frame / period) * Math.PI * 2) * amount;
