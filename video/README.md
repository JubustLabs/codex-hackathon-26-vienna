# Realtime Alignment — hackathon demo video

A ~44s Remotion composition that tells the story of the app:

1. **Cold** — every AI coding tool skips the hardest part: *agreement*.
2. **Pain** — four engineers, three LLMs, zero alignment.
3. **Reveal** — Realtime Alignment Workspace · agreement before generation.
4. **Room** — shared alignment board populates live.
5. **Private** — private deltas promote into the room.
6. **Handoff** — readiness flips green, quorum fills, ship the handoff.
7. **Emotional** — no more drift, no more lost context.
8. **Outro** — logo, tagline, credits.

Palette + type match `../src/styles.css` so the video feels like one product with the app.

## Develop

```bash
bun install
bun run dev       # opens the Remotion Studio
```

## Render

```bash
bun run build     # produces out/realtime-alignment.mp4 (1920x1080 @ 30fps)
bun run still     # produces out/thumbnail.png (mid-reveal)
```

## Integrate with the deck

After rendering, copy the mp4 into the slides project so the embedded `<video>` tag picks it up:

```bash
cp out/realtime-alignment.mp4 ../slides/public/hackathon-video.mp4
```

Or use the top-level justfile tasks from the repo root:

```bash
just video-render     # renders video
just demo             # render video + copy into slides + start slides dev
```
