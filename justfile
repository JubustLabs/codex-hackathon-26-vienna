set shell := ["bash", "-cu"]

default:
  @just --list

# --- app ------------------------------------------------------------------

[private]
ensure-app:
  [ -d node_modules ] || bun install

[private]
ensure-slides:
  [ -d slides/node_modules ] || (cd slides && bun install)

[private]
ensure-video:
  [ -d video/node_modules ] || (cd video && bun install)

[private]
ensure-slide-video: ensure-video
  mkdir -p slides/public
  [ -f video/out/realtime-alignment.mp4 ] || (cd video && bun run build)
  cp video/out/realtime-alignment.mp4 slides/public/hackathon-video.mp4

setup:
  bun install
  cd slides && bun install
  cd video && bun install

install:
  bun install

clean:
  rm -f db/workspace.sqlite db/workspace.sqlite-shm db/workspace.sqlite-wal

dev: ensure-app
  bun run dev

build: ensure-app
  bun run build

start: ensure-app
  bun run start

lint: ensure-app
  bun run lint

fmt: ensure-app
  bun run format

typecheck: ensure-app
  bun run typecheck

check: ensure-app
  bun run check

bridge-watch room_id participant_id source_agent="codex-room-bridge" server="http://localhost:3001":
  bun plugins/codex-room-bridge/scripts/bridge.ts watch --room-id "{{room_id}}" --participant-id "{{participant_id}}" --source-agent "{{source_agent}}" --server "{{server}}"

bridge-submit room_id participant_id source_agent text server="http://localhost:3001":
  bun plugins/codex-room-bridge/scripts/bridge.ts submit --room-id "{{room_id}}" --participant-id "{{participant_id}}" --source-agent "{{source_agent}}" --server "{{server}}" --text "{{text}}"

precommit-install:
  pre-commit install -c .pre-commit-config.yaml --install-hooks

precommit-run:
  pre-commit run --all-files -c .pre-commit-config.yaml

# --- video (Remotion) -----------------------------------------------------

# Install video deps (Remotion + fonts).
video-install:
  cd video && bun install

# Open the Remotion Studio to tweak scenes live.
video-dev: ensure-video
  cd video && bun run dev

# Render the mp4 to video/out/realtime-alignment.mp4.
video-render: ensure-video
  cd video && bun run build

# Render a thumbnail still (mid-reveal) to video/out/thumbnail.png.
video-still: ensure-video
  cd video && bun run still

# Record a clean capture of the autopilot flow in the browser.
# Requires the dev servers to be running in another terminal:
#   export ALLOW_LOCAL_HEURISTIC_FALLBACK=1 && just dev
# Output: video/public/autopilot-capture.webm
#   duration   total seconds to record (default 90)
#   tempo      autopilot step delay in ms (default 3200)
video-capture duration="90" tempo="3200":
  mkdir -p video/public
  bun scripts/record-autopilot.ts --duration {{duration}} --tempo {{tempo}}

# Render the long video (prologue + autopilot capture + outro) to
# video/out/realtime-alignment-long.mp4. Expects video/public/autopilot-capture.webm to exist.
video-long-render: ensure-video
  cd video && bun run build-long

# Full pipeline: start server in the background, wait, capture, stop, render.
# Leaves the db/ files behind (or run `just clean` first for a pristine room).
video-long-pipeline: ensure-app ensure-video
  #!/usr/bin/env bash
  set -euo pipefail
  cleanup() {
    if [[ -n "${DEV_PID:-}" ]]; then
      kill "$DEV_PID" 2>/dev/null || true
      wait "$DEV_PID" 2>/dev/null || true
    fi
  }
  trap cleanup EXIT
  export ALLOW_LOCAL_HEURISTIC_FALLBACK=1
  bun run dev >/tmp/realtime-alignment-dev.log 2>&1 &
  DEV_PID=$!
  echo "• dev server pid=$DEV_PID (log: /tmp/realtime-alignment-dev.log)"
  for _ in $(seq 1 60); do
    if curl -fsS http://localhost:3001/api/rooms >/dev/null 2>&1; then break; fi
    sleep 1
  done
  mkdir -p video/public
  bun scripts/record-autopilot.ts --duration 90 --tempo 3200
  cleanup
  DEV_PID=
  cd video && bun run build-long

# --- slides (Slidev) ------------------------------------------------------

# Install slide-deck deps.
slides-install:
  cd slides && bun install

# Serve the deck locally.
slides-dev: ensure-slides ensure-slide-video
  cd slides && bun run dev

# Build the deck as a static site (slides/dist/).
slides-build: ensure-slides ensure-slide-video
  cd slides && bun run build

# Export the deck to slides-export.pdf.
slides-export: ensure-slides ensure-slide-video
  cd slides && bun run export

# --- integrated demo pipeline --------------------------------------------

# Fresh interactive demo: clean DB, create a room, spawn the app and two local agent bridges in tmux.
demo session="realtime-alignment-demo":
  bash scripts/demo-live.sh "{{session}}"

# Fully automated demo: same setup as `just demo`, but an autopilot drives the room
# through utterances → private deltas → promotes → synthesize → ADR → plan → handoff.
# You just open the browser URLs and watch.
#   tempo   delay between autopilot steps in ms (default 3500)
#   loop    1 = restart the scripted flow after each pass (default 0)
demo-interactive session="realtime-alignment-demo-auto" tempo="3500" loop="0":
  DEMO_MODE=auto AUTOPILOT_TEMPO={{tempo}} AUTOPILOT_LOOP={{loop}} bash scripts/demo-live.sh "{{session}}"

# Same as `demo-interactive`, but the autopilot stops right before Alice approves the ADR.
# You take over as Alice (open the printed Alice URL) and click:
#   Approve ADR → Generate plan → Accept owner (per workstream) → Approve plan → Generate handoff
# Great for a live presentation where you want to BE the decision owner for the final mile.
demo-copilot session="realtime-alignment-demo-copilot" tempo="3500":
  DEMO_MODE=auto AUTOPILOT_TEMPO={{tempo}} AUTOPILOT_PAUSE_BEFORE_APPROVAL=1 bash scripts/demo-live.sh "{{session}}"

demo-stop session="realtime-alignment-demo":
  tmux kill-session -t "{{session}}"

# Render the video, drop it into the deck's public folder, then start the deck.
# Great for the pitch flow.
demo-pitch: ensure-video ensure-slides
  cd video && bun run build
  mkdir -p slides/public
  cp video/out/realtime-alignment.mp4 slides/public/hackathon-video.mp4
  cd slides && bun run dev

# Same as `demo-pitch` but without re-rendering (uses the last mp4).
demo-pitch-quick: ensure-slides ensure-slide-video
  cd slides && bun run dev

# Render everything fresh: app check + video + slide deck build.
ship: ensure-app ensure-video ensure-slides
  bun run check
  cd video && bun run build
  mkdir -p slides/public
  cp video/out/realtime-alignment.mp4 slides/public/hackathon-video.mp4
  cd slides && bun run build
