#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_NAME="${1:-realtime-alignment-demo}"
BASE_URL="${BASE_URL:-http://localhost:3001}"
APP_URL="${APP_URL:-http://localhost:5173}"
ATTACH="${ATTACH:-1}"
OPEN_BROWSER="${OPEN_BROWSER:-1}"
OPEN_SECONDARY_BROWSERS="${OPEN_SECONDARY_BROWSERS:-0}"
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
SUPPORT_PANE="$(tmux split-window -h -P -F '#{pane_id}' -t "$MAIN_PANE" -c "$ROOT_DIR")"
MARKETING_PANE="$(tmux split-window -v -P -F '#{pane_id}' -t "$MAIN_PANE" -c "$ROOT_DIR")"
IT_PANE="$(tmux split-window -v -P -F '#{pane_id}' -t "$SUPPORT_PANE" -c "$ROOT_DIR")"
INFO_PANE="$(tmux split-window -v -P -F '#{pane_id}' -t "$MARKETING_PANE" -c "$ROOT_DIR")"

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
    topic: "Website support agent",
    decision: "Ship a customer support agent on the website — what does it do on day one?",
    goal: "One cross-functional scope that marketing, support, and IT all agree on before any code ships.",
    nonGoals: "Handling authenticated checkout flows, replacing Tier-2 support, or changing our CRM of record.",
    scope: "An AI agent that answers the top-10 FAQs on pricing + docs pages and hands off to a human with full context within 2 minutes.",
    successBar: "Marketing sees a deflection metric, Support trusts the escalation path, IT signs off on the data/security posture — all without a follow-up meeting.",
    topicTags: ["support-agent", "marketing", "support", "it", "demo"],
  }),
}));
const marketing = await json(await fetch(`${base}/api/rooms/${room.id}/join`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ displayName: "Maya (Marketing)", role: "decision_owner" }),
}));
const support = await json(await fetch(`${base}/api/rooms/${room.id}/join`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ displayName: "Sam (Support)", role: "decision_owner" }),
}));
const it = await json(await fetch(`${base}/api/rooms/${room.id}/join`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ displayName: "Ivo (IT)", role: "contributor" }),
}));
console.log(JSON.stringify({
  roomId: room.id,
  marketingId: marketing.id,
  supportId: support.id,
  itId: it.id,
}));
')"

ROOM_ID="$(bun -e 'const payload = JSON.parse(process.argv[1]); console.log(payload.roomId);' "$DEMO_JSON")"
MARKETING_ID="$(bun -e 'const payload = JSON.parse(process.argv[1]); console.log(payload.marketingId);' "$DEMO_JSON")"
SUPPORT_ID="$(bun -e 'const payload = JSON.parse(process.argv[1]); console.log(payload.supportId);' "$DEMO_JSON")"
IT_ID="$(bun -e 'const payload = JSON.parse(process.argv[1]); console.log(payload.itId);' "$DEMO_JSON")"

MARKETING_URL="$APP_URL/rooms/$ROOM_ID?participantId=$MARKETING_ID"
SUPPORT_URL="$APP_URL/rooms/$ROOM_ID?participantId=$SUPPORT_ID"
IT_URL="$APP_URL/rooms/$ROOM_ID?participantId=$IT_ID"

# Make the multi-codex + MCP plugin story visible at a glance: every bridge
# pane gets a titled border and a startup banner. Anyone watching the tmux
# can immediately see *three independent codexes* connecting through the MCP
# bridge into one shared room.
tmux set -t "$SESSION_NAME" -w pane-border-status top >/dev/null 2>&1 || true
tmux set -t "$SESSION_NAME" -w pane-border-format " #{pane_title} " >/dev/null 2>&1 || true
tmux select-pane -t "$MAIN_PANE"       -T "🛠  app server + frontend" >/dev/null 2>&1 || true
tmux select-pane -t "$MARKETING_PANE"  -T "📣  Maya · marketing-codex → MCP bridge" >/dev/null 2>&1 || true
tmux select-pane -t "$SUPPORT_PANE"    -T "🛟  Sam · support-codex → MCP bridge"    >/dev/null 2>&1 || true
tmux select-pane -t "$IT_PANE"         -T "🛡  Ivo · it-codex → MCP bridge"         >/dev/null 2>&1 || true
tmux select-pane -t "$INFO_PANE"       -T "ℹ️   demo helper"                        >/dev/null 2>&1 || true

codex_banner() {
  local pane="$1"
  local display="$2"
  local emoji="$3"
  local agent="$4"
  local participant_id="$5"
  tmux send-keys -t "$pane" "clear" C-m
  tmux send-keys -t "$pane" "printf '\n%s %s local codex\n' '$emoji' '$display'" C-m
  tmux send-keys -t "$pane" "printf '   codex agent    : %s\n' '$agent'" C-m
  tmux send-keys -t "$pane" "printf '   participant    : %s\n' '$participant_id'" C-m
  tmux send-keys -t "$pane" "printf '   MCP bridge     : plugins/codex-room-bridge\n'" C-m
  tmux send-keys -t "$pane" "printf '   shared room    : %s\n\n' '$ROOM_ID'" C-m
  tmux send-keys -t "$pane" "printf 'streaming private deltas from this codex into the room →\n\n'" C-m
}

codex_banner "$MARKETING_PANE" "Maya · Marketing"  "📣" "marketing-codex" "$MARKETING_ID"
codex_banner "$SUPPORT_PANE"   "Sam · Support"     "🛟" "support-codex"   "$SUPPORT_ID"
codex_banner "$IT_PANE"        "Ivo · IT"          "🛡" "it-codex"        "$IT_ID"

tmux send-keys -t "$MARKETING_PANE" "just bridge-watch $ROOM_ID $MARKETING_ID marketing-codex" C-m
tmux send-keys -t "$SUPPORT_PANE" "just bridge-watch $ROOM_ID $SUPPORT_ID support-codex" C-m
tmux send-keys -t "$IT_PANE" "just bridge-watch $ROOM_ID $IT_ID it-codex" C-m

if [ "$DEMO_MODE" = "auto" ]; then
  AUTOPILOT_CMD="bun scripts/demo-autopilot.ts --server \"$BASE_URL\" --room-id \"$ROOM_ID\" --marketing-id \"$MARKETING_ID\" --support-id \"$SUPPORT_ID\" --it-id \"$IT_ID\" --tempo $AUTOPILOT_TEMPO"
  if [ "$AUTOPILOT_LOOP" = "1" ]; then
    AUTOPILOT_CMD="$AUTOPILOT_CMD --loop"
  fi
  if [ "$AUTOPILOT_PAUSE_BEFORE_APPROVAL" = "1" ]; then
    AUTOPILOT_CMD="$AUTOPILOT_CMD --pause-before-approval"
  fi
  INFO_SCRIPT="$(cat <<EOF
clear
printf 'Website support agent demo — interactive autopilot\n\n'
printf 'Room id: %s\n' '$ROOM_ID'
printf 'Open this URL as the control seat (Maya · Marketing · decision owner):\n'
printf '  %s\n\n' '$MARKETING_URL'
printf 'Optional second/third views:\n'
printf '  Sam (Support, decision owner): %s\n' '$SUPPORT_URL'
printf '  Ivo (IT, contributor):         %s\n\n' '$IT_URL'
printf 'Panes:\n'
printf '  top-left: app server + frontend\n'
printf '  left-middle: Maya bridge (marketing codex)\n'
printf '  middle: Sam bridge (support codex)\n'
printf '  right: Ivo bridge (IT codex)\n'
printf '  bottom-right: autopilot (this pane)\n\n'
printf 'Autopilot: drives utterances → private deltas → promotes →\n'
printf '           synthesize → shared decision → alignment plan → handoff. Starts in 4s…\n\n'
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
printf 'Website support agent demo is ready.\n\n'
printf 'Room id: %s\n' '$ROOM_ID'
printf 'Maya  (marketing owner):    %s\n' '$MARKETING_ID'
printf 'Sam   (support owner):      %s\n' '$SUPPORT_ID'
printf 'Ivo   (IT contributor):     %s\n\n' '$IT_ID'
printf 'Open these URLs to steer each seat:\n'
printf '  Maya (Marketing, owner):  %s\n' '$MARKETING_URL'
printf '  Sam  (Support,   owner):  %s\n' '$SUPPORT_URL'
printf '  Ivo  (IT,        contrib): %s\n\n' '$IT_URL'
printf 'What each tmux pane does:\n'
printf '  top-left:   app server + frontend\n'
printf '  left-mid:   Maya local agent bridge (marketing-codex)\n'
printf '  middle:     Sam  local agent bridge (support-codex)\n'
printf '  right:      Ivo  local agent bridge (it-codex)\n'
printf '  bottom-right: this helper pane\n\n'
printf 'Try typing lines into each bridge pane, then promote them in the browser.\n'
printf 'Suggested lines:\n'
printf '  Maya: Launch on pricing + docs pages first — lower blast radius, marketing gets a clean story.\n'
printf '  Sam:  Scripted FAQ answers first, LLM fallback only when confidence is high.\n'
printf '  Ivo:  No PII in prompts without DLP. Launch waits for SOC 2 review.\n\n'
printf 'Attach to the tmux session with:\n'
printf '  tmux attach -t %s\n' '$SESSION_NAME'
exec bash
EOF
)"
fi

HELPER_SCRIPT="$(mktemp "${TMPDIR:-/tmp}/realtime-alignment-demo.${SESSION_NAME}.XXXXXX")"
printf '%s\n' "$INFO_SCRIPT" >"$HELPER_SCRIPT"
chmod +x "$HELPER_SCRIPT"
tmux send-keys -t "$INFO_PANE" "bash \"$HELPER_SCRIPT\"" C-m

if [ "$OPEN_BROWSER" = "1" ] && command -v open >/dev/null 2>&1; then
  open "$MARKETING_URL" >/dev/null 2>&1 || true
  if [ "$OPEN_SECONDARY_BROWSERS" = "1" ]; then
    open "$SUPPORT_URL" >/dev/null 2>&1 || true
    open "$IT_URL" >/dev/null 2>&1 || true
  fi
fi

tmux select-layout -t "$SESSION_NAME":demo tiled >/dev/null 2>&1 || true

printf 'tmux session: %s\n' "$SESSION_NAME"
printf 'room id: %s\n' "$ROOM_ID"
printf 'control url  (Maya · marketing owner): %s\n' "$MARKETING_URL"
printf 'optional url (Sam  · support  owner):  %s\n' "$SUPPORT_URL"
printf 'optional url (Ivo  · IT       contrib): %s\n' "$IT_URL"
printf '\nAttach with:\n  tmux attach -t %s\n' "$SESSION_NAME"

if [ "$ATTACH" = "1" ]; then
  tmux attach -t "$SESSION_NAME"
fi
