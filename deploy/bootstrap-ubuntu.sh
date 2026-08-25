#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/security-game
ARENA_USER=arena
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

if [[ "$PROJECT_DIR" != "$APP_DIR" ]]; then
  echo "Copy the project to $APP_DIR before running this script." >&2
  exit 1
fi

if [[ ! -r /etc/os-release ]]; then
  echo "This script requires Ubuntu." >&2
  exit 1
fi

. /etc/os-release
if [[ "${ID:-}" != "ubuntu" ]]; then
  echo "Unsupported OS: ${ID:-unknown}. Use Ubuntu 24.04 LTS." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y \
  ca-certificates \
  curl \
  debian-archive-keyring \
  debian-keyring \
  docker.io \
  docker-compose-v2 \
  git \
  gnupg \
  jq \
  lsof \
  rsync \
  unattended-upgrades

# Node.js 22 LTS is new enough for the current Next.js release.
install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
  > /etc/apt/sources.list.d/nodesource.list

# Install Caddy from its maintained package repository.
curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
  | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
  > /etc/apt/sources.list.d/caddy-stable.list

apt-get update
apt-get install -y caddy nodejs

if ! id "$ARENA_USER" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /var/lib/securecodearena \
    --shell /usr/sbin/nologin "$ARENA_USER"
fi
usermod -aG docker "$ARENA_USER"

install -d -m 0755 /etc/securecodearena
install -d -m 0755 /etc/systemd/system/caddy.service.d

if [[ ! -e /etc/securecodearena/frontend.env ]]; then
  install -m 0640 -o root -g "$ARENA_USER" \
    "$APP_DIR/deploy/env/frontend.env.example" \
    /etc/securecodearena/frontend.env
fi
if [[ ! -e /etc/securecodearena/orchestrator.env ]]; then
  install -m 0640 -o root -g "$ARENA_USER" \
    "$APP_DIR/deploy/env/orchestrator.env.example" \
    /etc/securecodearena/orchestrator.env
fi
if [[ ! -e /etc/securecodearena/caddy.env ]]; then
  install -m 0640 -o root -g caddy \
    "$APP_DIR/deploy/env/caddy.env.example" \
    /etc/securecodearena/caddy.env
fi

# A small swap file keeps package installation and Next.js builds stable on a
# 4 GB VPS without making normal requests depend on swap.
if ! swapon --noheadings --show=NAME | grep -qx /swapfile; then
  if [[ ! -e /swapfile ]]; then
    fallocate -l 2G /swapfile
    chmod 0600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile
fi
if ! grep -q '^/swapfile ' /etc/fstab; then
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
cat > /etc/sysctl.d/99-securecodearena.conf <<'EOF'
vm.swappiness=10
EOF
sysctl --system >/dev/null

chown -R "$ARENA_USER:$ARENA_USER" "$APP_DIR"
systemctl enable --now docker
systemctl enable unattended-upgrades

echo "Base packages are ready. Edit /etc/securecodearena/*.env, then run deploy/release.sh."
