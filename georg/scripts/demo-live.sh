#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_NAME="${1:-realtime-alignment-demo}"
BASE_URL="${BASE_URL:-http://localhost:3001}"
APP_URL="${APP_URL:-http://localhost:5173}"
ATTACH="${ATTACH:-1}"
OPEN_BROWSER="${OPEN_BROWSER:-1}"

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

for _ in $(seq 1 90); do
  if curl -fsS "$BASE_URL/api/rooms" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "$BASE_URL/api/rooms" >/dev/null 2>&1; then
  echo "Server did not become ready at $BASE_URL" >&2
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

INFO_SCRIPT="$(cat <<EOF
clear
printf 'Realtime Alignment demo is ready.\n\n'
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

tmux send-keys -t "$INFO_PANE" "$INFO_SCRIPT" C-m

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
