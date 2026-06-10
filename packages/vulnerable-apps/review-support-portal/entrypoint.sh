#!/bin/sh
set -e

if command -v iptables >/dev/null 2>&1; then
  iptables -A OUTPUT -o lo -j ACCEPT || true
  iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT || true
  iptables -A OUTPUT -j REJECT || true
fi

exec su-exec appuser "$@"
