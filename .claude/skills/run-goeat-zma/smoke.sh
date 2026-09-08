#!/usr/bin/env bash
# Smoke test for goeat-zma: launches the zmp dev server if needed and
# verifies the app entry is actually served (catches the black-iframe 404).
# Usage: bash .claude/skills/run-goeat-zma/smoke.sh   (from the goeat-zma root)
set -euo pipefail
cd "$(dirname "$0")/../../.."

LOG=/tmp/goeat-zma-dev.log
ok()   { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; exit 1; }

[ -f index.html ] || fail "root index.html missing — zmp-cli v4 serves from the project root; restore it (copy of src/index.html) or the app iframe 404s (black screen)"

if ! curl -sf -o /dev/null http://localhost:3000/; then
  echo "Starting zmp dev server (log: $LOG)..."
  nohup npx -y zmp-cli@latest start > "$LOG" 2>&1 &
  for _ in $(seq 1 45); do
    curl -sf -o /dev/null http://localhost:3000/ && break
    sleep 1
  done
fi

curl -sf -o /dev/null http://localhost:3000/ \
  && ok "simulator shell answers on :3000" \
  || fail "no server on :3000 — check $LOG"

code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:2999/)
[ "$code" = 200 ] && ok "app root served on :2999" \
  || fail "app root on :2999 returned $code (root index.html missing or vite crashed — check $LOG)"

code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:2999/src/app.ts)
[ "$code" = 200 ] && ok "app entry /src/app.ts served" \
  || fail "/src/app.ts returned $code"

echo "SMOKE PASS — open http://localhost:3000 (app renders inside iframe #zalo-frame -> http://localhost:2999)"
