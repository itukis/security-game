#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/security-game
ARENA_USER=arena

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

for required in \
  /etc/securecodearena/frontend.env \
  /etc/securecodearena/orchestrator.env \
  /etc/securecodearena/caddy.env; do
  if [[ ! -s "$required" ]]; then
    echo "Missing configuration: $required" >&2
    exit 1
  fi
done

if grep -Eq 'example\.com|your-project|replace[-_]?with|replace_me' /etc/securecodearena/*.env; then
  echo "Replace every example value in /etc/securecodearena/*.env first." >&2
  exit 1
fi

set -a
. /etc/securecodearena/frontend.env
set +a
frontend_supabase_url="${NEXT_PUBLIC_SUPABASE_URL:-}"
frontend_publishable_key="${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}"

set -a
. /etc/securecodearena/orchestrator.env
set +a
orchestrator_supabase_url="${SUPABASE_URL:-}"
orchestrator_publishable_key="${SUPABASE_PUBLISHABLE_KEY:-}"
orchestrator_secret_key="${SUPABASE_SECRET_KEY:-}"

for required_value in \
  frontend_supabase_url \
  frontend_publishable_key \
  orchestrator_supabase_url \
  orchestrator_publishable_key \
  orchestrator_secret_key \
  SUPABASE_JWKS_URL \
  FRONTEND_ORIGIN; do
  if [[ -z "${!required_value:-}" ]]; then
    echo "Missing required environment value: $required_value" >&2
    exit 1
  fi
done

if [[ "$frontend_supabase_url" != "$orchestrator_supabase_url" ]]; then
  echo "Frontend and orchestrator must use the same SUPABASE_URL." >&2
  exit 1
fi
if [[ "$frontend_publishable_key" != "$orchestrator_publishable_key" ]]; then
  echo "Frontend and orchestrator must use the same Supabase Publishable key." >&2
  exit 1
fi
if [[ "$frontend_publishable_key" != sb_publishable_* ]]; then
  echo "Use a current sb_publishable_... key, not a legacy anon key." >&2
  exit 1
fi
if [[ "$orchestrator_secret_key" != sb_secret_* ]]; then
  echo "Use a current backend-only sb_secret_... key, not a legacy service_role key." >&2
  exit 1
fi

install -m 0644 "$APP_DIR/deploy/systemd/securecodearena-frontend.service" \
  /etc/systemd/system/securecodearena-frontend.service
install -m 0644 "$APP_DIR/deploy/systemd/securecodearena-orchestrator.service" \
  /etc/systemd/system/securecodearena-orchestrator.service
install -m 0644 "$APP_DIR/deploy/systemd/caddy-securecodearena.conf" \
  /etc/systemd/system/caddy.service.d/securecodearena.conf
install -m 0644 "$APP_DIR/deploy/Caddyfile" /etc/caddy/Caddyfile

# The packaged Caddy service runs as the unprivileged `caddy` user. Ensure the
# custom access-log target exists and remains writable across fresh installs.
install -d -m 0750 -o caddy -g caddy /var/log/caddy
touch /var/log/caddy/securecodearena-access.log
chown caddy:caddy /var/log/caddy/securecodearena-access.log
chmod 0640 /var/log/caddy/securecodearena-access.log

chown -R "$ARENA_USER:$ARENA_USER" "$APP_DIR"

runuser -u "$ARENA_USER" -- bash -c '
  set -euo pipefail
  cd /opt/security-game/packages/attack-engine
  npm ci --omit=dev
  cd /opt/security-game/packages/orchestrator
  npm ci --omit=dev
  cd /opt/security-game/packages/frontend
  set -a
  . /etc/securecodearena/frontend.env
  set +a
  # frontend.env sets NODE_ENV=production, which makes npm omit devDependencies
  # by default. Install with a one-command development override because the
  # production build still needs PostCSS/Tailwind and TypeScript tooling.
  NODE_ENV=development npm ci --include=dev
  npm run build
'

compose() {
  runuser -u "$ARENA_USER" -- docker compose \
    -f "$APP_DIR/docker-compose.yml" \
    --project-directory "$APP_DIR" \
    "$@"
}

mapfile -t COMPOSE_SERVICES < <(compose config --services | sort)

if [[ ${#COMPOSE_SERVICES[@]} -eq 0 ]]; then
  echo "docker-compose.yml declares no services." >&2
  exit 1
fi

# The orchestrator only probes / resets the problem IDs listed in
# LIVE_DOCKER_PROBLEM_IDS, and problem IDs match compose service names. A stale
# entry there would fail the health check long after the build, so catch it now.
scoped_ids="$(
  set -a
  . /etc/securecodearena/orchestrator.env
  set +a
  echo "${LIVE_DOCKER_PROBLEM_IDS:-}"
)"
frontend_scoped_ids="$(
  set -a
  . /etc/securecodearena/frontend.env
  set +a
  echo "${NEXT_PUBLIC_DOCKER_PROBLEM_IDS:-}"
)"

normalize_ids() {
  tr ',' '\n' <<<"$1" | tr -d ' \t\r' | sed '/^$/d' | sort -u
}

normalized_scoped_ids="$(normalize_ids "$scoped_ids")"
normalized_frontend_ids="$(normalize_ids "$frontend_scoped_ids")"
if [[ "$normalized_scoped_ids" != "$normalized_frontend_ids" ]]; then
  echo "LIVE_DOCKER_PROBLEM_IDS and NEXT_PUBLIC_DOCKER_PROBLEM_IDS must contain the same problem IDs." >&2
  exit 1
fi

if [[ -n "$scoped_ids" ]]; then
  missing=()
  while IFS= read -r id; do
    [[ -z "$id" ]] && continue
    if ! printf '%s\n' "${COMPOSE_SERVICES[@]}" | grep -qx "$id"; then
      missing+=("$id")
    fi
  done < <(tr ',' '\n' <<<"$scoped_ids" | tr -d ' \t\r' | sed '/^$/d')
  if (( ${#missing[@]} > 0 )); then
    echo "LIVE_DOCKER_PROBLEM_IDS names services that docker-compose.yml does not define: ${missing[*]}" >&2
    exit 1
  fi
fi

if [[ -n "$normalized_scoped_ids" ]]; then
  mapfile -t ACTIVE_SERVICES <<<"$normalized_scoped_ids"
else
  ACTIVE_SERVICES=("${COMPOSE_SERVICES[@]}")
fi

# Build one service at a time. `up -d --build` with every service at once
# builds in parallel, and twelve simultaneous `npm install` runs can exhaust a
# 4 GB VPS; sequential builds keep peak memory low and failures easy to read.
for service in "${ACTIVE_SERVICES[@]}"; do
  echo "==> building and starting $service"
  compose up -d --build "$service"
done

# Repeated releases leave the previous images dangling; reclaim that disk.
runuser -u "$ARENA_USER" -- docker image prune -f >/dev/null

set -a
. /etc/securecodearena/caddy.env
set +a
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

systemctl daemon-reload
systemctl enable securecodearena-orchestrator securecodearena-frontend caddy
systemctl restart securecodearena-orchestrator
systemctl restart securecodearena-frontend
systemctl restart caddy

"$APP_DIR/deploy/healthcheck.sh"

echo "Release completed successfully."
