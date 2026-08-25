#!/usr/bin/env bash
set -euo pipefail

wait_for_http() {
  local name="$1"
  local url="$2"
  local attempts=30

  while (( attempts > 0 )); do
    if curl -fsS --max-time 5 "$url" >/dev/null; then
      return 0
    fi
    attempts=$((attempts - 1))
    sleep 2
  done

  echo "$name did not become healthy: $url" >&2
  return 1
}

wait_for_http "frontend" "http://127.0.0.1:3000/"
wait_for_http "orchestrator" "http://127.0.0.1:4000/health"

# Every challenge container has to answer /health before the orchestrator
# reports containersHealthy. The last container built by release.sh may still
# be booting, so retry instead of failing on the first probe.
attempts=30
while (( attempts > 0 )); do
  health_json="$(curl -fsS --max-time 10 http://127.0.0.1:4000/health || true)"
  if [[ "$health_json" == *'"containersHealthy":true'* ]]; then
    break
  fi
  attempts=$((attempts - 1))
  sleep 2
done

if [[ "${health_json:-}" != *'"containersHealthy":true'* ]]; then
  echo "Orchestrator is running, but one or more challenge containers are unhealthy." >&2
  echo "${health_json:-no response from /health}" >&2
  exit 1
fi

echo "Frontend, orchestrator, and challenge containers are healthy."
