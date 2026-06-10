#!/bin/sh
# Lock down egress with iptables, then drop to appuser and exec the app.
# Requires CAP_NET_ADMIN (set via compose `cap_add`).
set -e

if command -v iptables >/dev/null 2>&1; then
  iptables -A OUTPUT -o lo -j ACCEPT || true
  iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT || true
  iptables -A OUTPUT -j REJECT || true
fi

# Ensure the writable uploads dir exists and is owned by appuser before we drop
# privileges — the upload handler will fail otherwise.
mkdir -p /app/src/uploads
chown -R appuser:appgroup /app/src/uploads

exec su-exec appuser "$@"
