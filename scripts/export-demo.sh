#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEMO_DIR="$ROOT_DIR/docs/demo"
SLIDES_OUT="$DEMO_DIR/slides"
VIDEOS_OUT="$DEMO_DIR/videos"
SHORT_VIDEO="$ROOT_DIR/video/out/realtime-alignment.mp4"
LONG_VIDEO="$ROOT_DIR/video/out/realtime-alignment-long.mp4"
THUMBNAIL="$ROOT_DIR/video/out/thumbnail.png"
AUTOPILOT_CAPTURE="$ROOT_DIR/video/public/autopilot-capture.webm"
EMBEDDED_DECK_VIDEO="$ROOT_DIR/slides/public/hackathon-video.mp4"

derive_github_pages_url() {
  local remote
  remote="$(git -C "$ROOT_DIR" remote get-url origin 2>/dev/null || true)"

  if [[ "$remote" =~ ^git@github\.com:([^/]+)/([^/.]+)(\.git)?$ ]]; then
    printf 'https://%s.github.io/%s/demo/\n' "${BASH_REMATCH[1],,}" "${BASH_REMATCH[2]}"
    return 0
  fi

  if [[ "$remote" =~ ^https://github\.com/([^/]+)/([^/.]+)(\.git)?$ ]]; then
    printf 'https://%s.github.io/%s/demo/\n' "${BASH_REMATCH[1],,}" "${BASH_REMATCH[2]}"
    return 0
  fi

  return 1
}

if [[ ! -f "$AUTOPILOT_CAPTURE" ]]; then
  echo "Missing long-video source asset: $AUTOPILOT_CAPTURE" >&2
  echo "Create it with 'just video-capture' or 'just video-long-pipeline' first." >&2
  exit 1
fi

mkdir -p "$DEMO_DIR" "$VIDEOS_OUT" "$ROOT_DIR/slides/public"

echo "• Rendering short video"
(cd "$ROOT_DIR/video" && bun run build)

echo "• Rendering thumbnail"
(cd "$ROOT_DIR/video" && bun run still)

echo "• Rendering long video"
(cd "$ROOT_DIR/video" && bun run build-long)

cp "$SHORT_VIDEO" "$EMBEDDED_DECK_VIDEO"

rm -rf "$SLIDES_OUT" "$VIDEOS_OUT"
mkdir -p "$VIDEOS_OUT"

echo "• Building Slidev deck for portable hosting"
(cd "$ROOT_DIR/slides" && bun x slidev build --base ./ --out ../docs/demo/slides)

cp "$SHORT_VIDEO" "$VIDEOS_OUT/realtime-alignment.mp4"
cp "$LONG_VIDEO" "$VIDEOS_OUT/realtime-alignment-long.mp4"
cp "$THUMBNAIL" "$VIDEOS_OUT/thumbnail.png"

PAGES_URL="$(derive_github_pages_url || true)"
PAGES_HTML=""
PAGES_MD=""
if [[ -n "$PAGES_URL" ]]; then
  PAGES_HTML="<p class=\"hint\">Expected GitHub Pages URL: <a href=\"$PAGES_URL\">$PAGES_URL</a></p>"
  PAGES_MD="- GitHub Pages URL: <$PAGES_URL>"
fi

cat >"$DEMO_DIR/index.html" <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Realtime Alignment Demo Export</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #eef5ff;
      --panel: rgba(255, 255, 255, 0.88);
      --ink: #12304a;
      --muted: #4d6780;
      --line: rgba(18, 48, 74, 0.12);
      --accent: #1f6fb2;
      --accent-soft: rgba(31, 111, 178, 0.1);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: "Inter", "Segoe UI", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(31, 111, 178, 0.18), transparent 30rem),
        linear-gradient(180deg, #f8fbff 0%, var(--bg) 100%);
    }

    main {
      width: min(1100px, calc(100vw - 2rem));
      margin: 0 auto;
      padding: 3rem 0 4rem;
    }

    .hero {
      padding: 2rem;
      border: 1px solid var(--line);
      border-radius: 1.5rem;
      background: var(--panel);
      backdrop-filter: blur(10px);
      box-shadow: 0 24px 60px rgba(22, 45, 78, 0.12);
    }

    h1, h2 {
      margin: 0;
      font-family: "Fraunces", "Georgia", serif;
      font-weight: 600;
      letter-spacing: -0.03em;
    }

    h1 {
      font-size: clamp(2.4rem, 6vw, 4.5rem);
      line-height: 0.95;
    }

    h2 {
      font-size: clamp(1.5rem, 3vw, 2.2rem);
      margin-bottom: 0.75rem;
    }

    p {
      margin: 0;
      line-height: 1.6;
      color: var(--muted);
    }

    .hero p {
      max-width: 52rem;
      margin-top: 1rem;
      font-size: 1.05rem;
    }

    .hint {
      margin-top: 1rem;
      font-size: 0.95rem;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    .actions a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 2.75rem;
      padding: 0 1rem;
      border-radius: 999px;
      border: 1px solid transparent;
      background: var(--accent);
      color: white;
      text-decoration: none;
      font-weight: 600;
    }

    .actions a.secondary {
      border-color: var(--line);
      background: var(--accent-soft);
      color: var(--accent);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .card {
      padding: 1.25rem;
      border: 1px solid var(--line);
      border-radius: 1.25rem;
      background: var(--panel);
      box-shadow: 0 18px 40px rgba(22, 45, 78, 0.08);
    }

    .stack {
      display: grid;
      gap: 1.5rem;
      margin-top: 2rem;
    }

    video {
      width: 100%;
      display: block;
      margin-top: 1rem;
      border-radius: 1rem;
      background: #0e2235;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    code {
      padding: 0.1rem 0.35rem;
      border-radius: 0.35rem;
      background: rgba(18, 48, 74, 0.08);
      color: var(--ink);
      font-family: "JetBrains Mono", "SFMono-Regular", monospace;
      font-size: 0.95em;
    }

    @media (max-width: 700px) {
      main {
        width: min(100vw - 1rem, 100%);
        padding-top: 1rem;
      }

      .hero,
      .card {
        padding: 1rem;
      }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <h1>Realtime Alignment Demo Export</h1>
      <p>Portable demo artifacts for GitHub Pages: the hosted slide deck, the short pitch video, the long walkthrough video, and a repo-friendly index page that links everything from one place.</p>
      ${PAGES_HTML}
      <div class="actions">
        <a href="./slides/index.html">Open Slides</a>
        <a class="secondary" href="./videos/realtime-alignment.mp4">Download Short Video</a>
        <a class="secondary" href="./videos/realtime-alignment-long.mp4">Download Long Video</a>
      </div>
    </section>

    <section class="stack">
      <div class="grid">
        <article class="card">
          <h2>Slides</h2>
          <p>The exported Slidev deck is rebuilt with a relative base so it can live cleanly under <code>docs/demo/slides/</code> on GitHub Pages.</p>
          <div class="actions">
            <a href="./slides/index.html">Launch Deck</a>
          </div>
        </article>

        <article class="card">
          <h2>Artifacts</h2>
          <p>Every export lives beside this page so the links remain stable in both local previews and project-site hosting.</p>
          <div class="actions">
            <a class="secondary" href="./README.md">Open README</a>
          </div>
        </article>
      </div>

      <article class="card">
        <h2>Short Video</h2>
        <p>The concise pitch cut used in the deck and on the landing page.</p>
        <video controls playsinline preload="metadata" poster="./videos/thumbnail.png">
          <source src="./videos/realtime-alignment.mp4" type="video/mp4">
        </video>
      </article>

      <article class="card">
        <h2>Long Video</h2>
        <p>The extended walkthrough with the recorded autopilot sequence.</p>
        <video controls playsinline preload="metadata" poster="./videos/thumbnail.png">
          <source src="./videos/realtime-alignment-long.mp4" type="video/mp4">
        </video>
      </article>
    </section>
  </main>
</body>
</html>
EOF

cat >"$DEMO_DIR/README.md" <<EOF
# Demo Export

Generated by \`just export-demo\`.

## Open

- [Demo landing page](./index.html)
- [Slides static site](./slides/index.html)
- [Short video](./videos/realtime-alignment.mp4)
- [Long video](./videos/realtime-alignment-long.mp4)
${PAGES_MD}

## Notes

- \`index.html\` is the GitHub Pages entrypoint.
- \`slides/\` contains the Slidev static export built with a relative base, so it can be hosted from a nested path.
- \`videos/\` contains the short pitch video, the long walkthrough video, and a thumbnail preview.

![Short demo thumbnail](./videos/thumbnail.png)
EOF

cat >"$ROOT_DIR/docs/index.html" <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=./demo/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Redirecting to demo</title>
  <link rel="canonical" href="./demo/">
</head>
<body>
  <p>Redirecting to <a href="./demo/">./demo/</a>…</p>
</body>
</html>
EOF

echo "Exported demo artifacts to $DEMO_DIR"
echo "  slides: $SLIDES_OUT"
echo "  videos: $VIDEOS_OUT"
echo "  index:  $DEMO_DIR/index.html"
