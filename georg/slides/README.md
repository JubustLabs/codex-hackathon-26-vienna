# Realtime Alignment — hackathon deck

A Slidev deck in the same parchment aesthetic as the app and the Remotion video.

Three moments, one story:
- **(a) slides** — the pitch and the why
- **(b) short video demo** — a 44s Remotion-rendered mp4 embedded on slide 6
- **(c) live demo** — the script on slide 7, executed against `http://localhost:5173`

## Develop

```bash
bun install
bun run dev          # opens http://localhost:3030
```

Keyboard on-stage:
- `→` / `←` — next / previous
- `o` — overview
- `p` — presenter mode
- `d` — dark mode
- `f` — fullscreen

## Embed the video

The deck looks for `public/hackathon-video.mp4`. Render it with Remotion and copy it in:

```bash
cd ../video
bun install
bun run build
cp out/realtime-alignment.mp4 ../slides/public/hackathon-video.mp4
```

Or, from `georg/`, use the bundled just recipe:

```bash
just demo
```

That renders the video, drops it into `slides/public/`, and starts the deck dev server.

## Build / export

```bash
bun run build        # static site → dist/
bun run export       # pdf → slides-export.pdf
```
