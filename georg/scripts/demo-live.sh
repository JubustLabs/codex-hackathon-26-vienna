#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_NAME="${1:-realtime-alignment-demo}"
BASE_URL="${BASE_URL:-http://localhost:3001}"
APP_URL="${APP_URL:-http://localhost:5173}"
ATTACH="${ATTACH:-1}"
OPEN_BROWSER="${OPEN_BROWSER:-1}"
# DEMO_MODE=manual  → two bridge panes wait for hand-typed input
# DEMO_MODE=auto    → autopilot drives the full flow, bridges still run so deltas are visible
DEMO_MODE="${DEMO_MODE:-manual}"
AUTOPILOT_TEMPO="${AUTOPILOT_TEMPO:-3500}"
AUTOPILOT_LOOP="${AUTOPILOT_LOOP:-0}"
AUTOPILOT_PAUSE_BEFORE_APPROVAL="${AUTOPILOT_PAUSE_BEFORE_APPROVAL:-0}"

wait_for_url() {
  local url="$1"
  local label="$2"

  for _ in $(seq 1 90); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "$label did not become ready at $url" >&2
  return 1
}

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is required for just demo" >&2
  exit 1
fi

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "tmux session '$SESSION_NAME' already exists. Close it or use a different name." >&2
  exit 1
fi

for port in 3001 5173; do
  if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use. Stop the existing process before running just demo." >&2
    exit 1
  fi
done

rm -f \
  "$ROOT_DIR/db/workspace.sqlite" \
  "$ROOT_DIR/db/workspace.sqlite-shm" \
  "$ROOT_DIR/db/workspace.sqlite-wal"

MAIN_PANE="$(tmux new-session -d -P -F '#{pane_id}' -s "$SESSION_NAME" -n demo -c "$ROOT_DIR")"
BOB_PANE="$(tmux split-window -h -P -F '#{pane_id}' -t "$MAIN_PANE" -c "$ROOT_DIR")"
ALICE_PANE="$(tmux split-window -v -P -F '#{pane_id}' -t "$MAIN_PANE" -c "$ROOT_DIR")"
INFO_PANE="$(tmux split-window -v -P -F '#{pane_id}' -t "$BOB_PANE" -c "$ROOT_DIR")"

tmux send-keys -t "$MAIN_PANE" 'export ALLOW_LOCAL_HEURISTIC_FALLBACK=1' C-m
tmux send-keys -t "$MAIN_PANE" 'just dev' C-m

if ! wait_for_url "$BASE_URL/api/rooms" "Server"; then
  tmux kill-session -t "$SESSION_NAME" || true
  exit 1
fi

if ! wait_for_url "$APP_URL" "Frontend"; then
  tmux kill-session -t "$SESSION_NAME" || true
  exit 1
fi

DEMO_JSON="$(BASE_URL="$BASE_URL" bun -e '
const base = process.env.BASE_URL ?? "http://localhost:3001";
const json = async (response) => {
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  }
  return response.json();
};
const room = await json(await fetch(`${base}/api/rooms`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    topic: "Realtime alignment workspace",
    decision: "How do humans and local coding agents converge on one ADR?",
    goal: "Show a denoised, human-controlled multi-agent decision room live.",
    nonGoals: "Full autonomy, chat spam, and leaking private agent context into shared state.",
    scope: "One live room, private agent deltas, shared alignment, ADR, plan, and handoff.",
    successBar: "Two people and two local agents reach a visible shared decision path in one session.",
    topicTags: ["hackathon", "agents", "adr", "alignment", "demo"],
  }),
}));
const alice = await json(await fetch(`${base}/api/rooms/${room.id}/join`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ displayName: "Alice", role: "decision_owner" }),
}));
const bob = await json(await fetch(`${base}/api/rooms/${room.id}/join`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ displayName: "Bob", role: "contributor" }),
}));
console.log(JSON.stringify({
  roomId: room.id,
  aliceId: alice.id,
  bobId: bob.id,
}));
')"

ROOM_ID="$(bun -e 'const payload = JSON.parse(process.argv[1]); console.log(payload.roomId);' "$DEMO_JSON")"
ALICE_ID="$(bun -e 'const payload = JSON.parse(process.argv[1]); console.log(payload.aliceId);' "$DEMO_JSON")"
BOB_ID="$(bun -e 'const payload = JSON.parse(process.argv[1]); console.log(payload.bobId);' "$DEMO_JSON")"

ALICE_URL="$APP_URL/rooms/$ROOM_ID?participantId=$ALICE_ID"
BOB_URL="$APP_URL/rooms/$ROOM_ID?participantId=$BOB_ID"

tmux send-keys -t "$ALICE_PANE" "just bridge-watch $ROOM_ID $ALICE_ID alice-codex" C-m
tmux send-keys -t "$BOB_PANE" "just bridge-watch $ROOM_ID $BOB_ID bob-codex" C-m

if [ "$DEMO_MODE" = "auto" ]; then
  AUTOPILOT_CMD="bun scripts/demo-autopilot.ts --server \"$BASE_URL\" --room-id \"$ROOM_ID\" --alice-id \"$ALICE_ID\" --bob-id \"$BOB_ID\" --tempo $AUTOPILOT_TEMPO"
  if [ "$AUTOPILOT_LOOP" = "1" ]; then
    AUTOPILOT_CMD="$AUTOPILOT_CMD --loop"
  fi
  if [ "$AUTOPILOT_PAUSE_BEFORE_APPROVAL" = "1" ]; then
    AUTOPILOT_CMD="$AUTOPILOT_CMD --pause-before-approval"
  fi
  INFO_SCRIPT="$(cat <<EOF
clear
printf 'Realtime Decision Alignment — interactive autopilot\n\n'
printf 'Room id: %s\n' '$ROOM_ID'
printf 'Alice: %s\n' '$ALICE_URL'
printf 'Bob:   %s\n\n' '$BOB_URL'
printf 'Panes:\n'
printf '  top-left: app server + frontend\n'
printf '  bottom-left: Alice bridge (watches private deltas)\n'
printf '  right: Bob bridge (watches private deltas)\n'
printf '  bottom-right: autopilot (this pane)\n\n'
printf 'Autopilot: drives utterances → private deltas → promotes →\n'
printf '           synthesize → ADR → plan → handoff. Starts in 4s…\n\n'
sleep 4
$AUTOPILOT_CMD
printf '\nautopilot done. Press Enter for a shell.\n'
read _
exec bash
EOF
)"
else
  INFO_SCRIPT="$(cat <<EOF
clear
printf 'Realtime Decision Alignment demo is ready.\n\n'
printf 'Room id: %s\n' '$ROOM_ID'
printf 'Alice participant id: %s\n' '$ALICE_ID'
printf 'Bob participant id: %s\n\n' '$BOB_ID'
printf 'Open these URLs in separate tabs or windows:\n'
printf '  Alice: %s\n' '$ALICE_URL'
printf '  Bob:   %s\n\n' '$BOB_URL'
printf 'What each tmux pane does:\n'
printf '  top-left: app server and frontend\n'
printf '  bottom-left: Alice local agent bridge\n'
printf '  right: Bob local agent bridge\n'
printf '  bottom-right: this helper pane\n\n'
printf 'Try typing lines into the Alice and Bob panes, then promote them in the browser.\n'
printf 'Suggested lines:\n'
printf '  Alice: Keep private agent output pending until a human promotes it.\n'
printf '  Bob: The shared room should converge on one ADR, not a noisy transcript.\n\n'
printf 'Attach to the tmux session with:\n'
printf '  tmux attach -t %s\n' '$SESSION_NAME'
exec bash
EOF
)"
fi

HELPER_SCRIPT="$(mktemp "${TMPDIR:-/tmp}/realtime-alignment-demo.${SESSION_NAME}.XXXXXX.sh")"
printf '%s\n' "$INFO_SCRIPT" >"$HELPER_SCRIPT"
chmod +x "$HELPER_SCRIPT"
tmux send-keys -t "$INFO_PANE" "bash \"$HELPER_SCRIPT\"" C-m

if [ "$OPEN_BROWSER" = "1" ] && command -v open >/dev/null 2>&1; then
  open "$ALICE_URL" >/dev/null 2>&1 || true
  open "$BOB_URL" >/dev/null 2>&1 || true
fi

tmux select-layout -t "$SESSION_NAME":demo tiled >/dev/null 2>&1 || true

printf 'tmux session: %s\n' "$SESSION_NAME"
printf 'room id: %s\n' "$ROOM_ID"
printf 'alice url: %s\n' "$ALICE_URL"
printf 'bob url: %s\n' "$BOB_URL"
printf '\nAttach with:\n  tmux attach -t %s\n' "$SESSION_NAME"

if [ "$ATTACH" = "1" ]; then
  tmux attach -t "$SESSION_NAME"
fi
