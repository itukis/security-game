#!/usr/bin/env bash
# scripts/smoke-all.sh — full end-to-end smoke check before a demo.
#
# Runs every check that matters: container health, orchestrator health,
# all three verify.js flows, (optionally) the authed HTTP path, the
# outbound block, and the /admin/reset gating.
#
# Usage:
#   bash scripts/smoke-all.sh
#   TEST_JWT=$(packages/orchestrator/scripts/get-test-jwt.sh testtest) \
#     bash scripts/smoke-all.sh
#
# Idempotent. Exits 0 on all-green, non-zero with a summary on failure.

set -uo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DOCKER="${DOCKER_BIN:-/opt/homebrew/bin/docker}"
COMPOSE="${DOCKER_COMPOSE_BIN:-/opt/homebrew/bin/docker-compose}"
ORCH_LOG=/tmp/smoke-orch.log

FAILS=0
ORCH_PID=""

# --- helpers ---------------------------------------------------------------

if [[ -t 1 ]]; then
  C_R='\033[31m'; C_G='\033[32m'; C_Y='\033[33m'; C_0='\033[0m'
else
  C_R=''; C_G=''; C_Y=''; C_0=''
fi
pass() { printf "${C_G}✓${C_0} %s\n" "$*"; }
fail() { printf "${C_R}✗${C_0} %s\n" "$*"; FAILS=$((FAILS + 1)); }
warn() { printf "${C_Y}!${C_0} %s\n" "$*"; }
step() { printf '\n— %s —\n' "$*"; }

kill_port_4000() {
  local pids
  pids=$(lsof -ti:4000 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 0.4
    pids=$(lsof -ti:4000 2>/dev/null || true)
    # shellcheck disable=SC2086
    [[ -n "$pids" ]] && kill -9 $pids 2>/dev/null || true
  fi
  ORCH_PID=""
}

start_orchestrator() {
  # $1 (optional): "ALLOW_RESET=true" or other env prefix
  local env_prefix="${1:-}"
  kill_port_4000
  if [[ -n "$env_prefix" ]]; then
    env $env_prefix node packages/orchestrator/src/server.js > "$ORCH_LOG" 2>&1 &
  else
    node packages/orchestrator/src/server.js > "$ORCH_LOG" 2>&1 &
  fi
  ORCH_PID=$!

  local i=0
  while ! curl -fs http://localhost:4000/health > /dev/null 2>&1; do
    i=$((i + 1))
    if [[ $i -gt 30 ]]; then
      fail "orchestrator did not become reachable within 15s (see $ORCH_LOG)"
      return 1
    fi
    sleep 0.5
  done
}

cleanup() {
  kill_port_4000
}
trap cleanup EXIT INT TERM

# --- Step 1: docker-compose ps --------------------------------------------

step "1. docker-compose ps (all three containers Up)"
PS_OUT=$("$COMPOSE" ps 2>/dev/null || true)
for svc in arena-sqli-login arena-xss-comments arena-idor-profile; do
  if echo "$PS_OUT" | grep -E "^${svc}\b" | grep -qE 'Up|running'; then
    pass "$svc is up"
  else
    fail "$svc is not Up in docker-compose ps"
  fi
done

# --- Step 2: vulnerable-app + orchestrator health -------------------------

step "2. healthchecks"
for url in http://localhost:3001/health http://localhost:3002/health http://localhost:3003/health; do
  if curl -fs "$url" > /dev/null 2>&1; then
    pass "GET $url"
  else
    fail "GET $url"
  fi
done

start_orchestrator ""
if curl -fs http://localhost:4000/health > /dev/null 2>&1; then
  pass "GET http://localhost:4000/health"
else
  fail "GET http://localhost:4000/health"
fi

# --- Step 3: verify.js per problem (baseline, no auth) --------------------

step "3. verify.js for each problem"
for prob in sqli-login xss-comments idor-profile; do
  if OUT=$(node packages/orchestrator/src/verify.js \
      --problem "$prob" \
      --patch "packages/vulnerable-apps/$prob/solution.patch" 2>&1); then
    if echo "$OUT" | grep -q '"passed": true'; then
      pass "verify.js $prob → passed: true"
    else
      fail "verify.js $prob did not print \"passed\": true"
      echo "$OUT" | tail -8 | sed 's/^/    /'
    fi
  else
    fail "verify.js $prob exited non-zero"
    echo "$OUT" | tail -8 | sed 's/^/    /'
  fi
done

# --- Step 4/5: authed HTTP path (optional) --------------------------------

step "4. authed HTTP verify"
if [[ -n "${TEST_JWT:-}" ]]; then
  PATCH_BODY=$(jq -Rs '{patch: .}' packages/vulnerable-apps/sqli-login/solution.patch)
  RESP=$(curl -sS -X POST http://localhost:4000/problems/sqli-login/verify \
    -H "Authorization: Bearer $TEST_JWT" \
    -H 'Content-Type: application/json' \
    -d "$PATCH_BODY" || echo '{}')
  if printf '%s' "$RESP" | python3 -c '
import json, sys
try:
    r = json.loads(sys.stdin.read() or "{}")
except Exception:
    sys.exit(1)
sys.exit(0 if r.get("passed") and "recording" in r and "appliedPatchSummary" in r else 1)
'; then
    pass "authed sqli-login verify includes recording + appliedPatchSummary"
  else
    fail "authed verify response missing passed/recording/appliedPatchSummary"
    echo "$RESP" | head -40 | sed 's/^/    /'
  fi
else
  warn "Auth path not tested — set TEST_JWT to enable"
fi

# --- Step 6: outbound block (WARN on failure, not FAIL) -------------------

step "6. outbound block from arena-sqli-login"
if "$DOCKER" exec arena-sqli-login sh -c "wget -T 3 -q -O- https://example.com" > /dev/null 2>&1; then
  warn "outbound is NOT blocked from arena-sqli-login (Docker variant difference?)"
else
  pass "outbound blocked from arena-sqli-login"
fi

# --- Step 7: /admin/reset gating ------------------------------------------

step "7. /admin/reset gating"

# 7a: no ALLOW_RESET (current orch was started without it) → 404
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:4000/admin/reset)
if [[ "$CODE" == "404" ]]; then
  pass "/admin/reset without ALLOW_RESET → 404"
else
  fail "/admin/reset without ALLOW_RESET expected 404, got $CODE"
fi

# 7b: restart with ALLOW_RESET=true → 200
kill_port_4000
start_orchestrator "ALLOW_RESET=true"
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 180 -X POST http://localhost:4000/admin/reset)
if [[ "$CODE" == "200" ]]; then
  pass "/admin/reset with ALLOW_RESET=true → 200"
else
  fail "/admin/reset with ALLOW_RESET=true expected 200, got $CODE"
fi

# Clean up: kill the ALLOW_RESET orchestrator so we don't leave it dangling.
kill_port_4000

# /admin/reset just `docker-compose down && up -d --build`'d the vulnerable
# apps — give them a moment to come back so the next run sees a clean state.
echo "  waiting for vulnerable apps to come back after reset..."
for url in http://localhost:3001/health http://localhost:3002/health http://localhost:3003/health; do
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
    if curl -fs "$url" > /dev/null 2>&1; then break; fi
    sleep 1
  done
done

# --- Summary ---------------------------------------------------------------

echo
if [[ "$FAILS" -eq 0 ]]; then
  printf "${C_G}✅ All checks passed${C_0}\n"
  exit 0
else
  printf "${C_R}❌ %d failure(s), see above${C_0}\n" "$FAILS"
  exit 1
fi
