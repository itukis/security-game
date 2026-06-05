#!/usr/bin/env bash
# Fetch a Supabase access_token for the seeded test user.
#
# Usage:
#   ./packages/orchestrator/scripts/get-test-jwt.sh <password> [email]
#   export TEST_JWT=$(./packages/orchestrator/scripts/get-test-jwt.sh testtest)
#
# Reads SUPABASE_URL and SUPABASE_ANON_KEY from packages/orchestrator/.env.
# The publishable sb_publishable_... key works as the apikey.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <password> [email]" >&2
  exit 1
fi

PASSWORD="$1"
EMAIL="${2:-test@example.com}"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy .env.example and fill in values." >&2
  exit 1
fi

# Pull values without sourcing the file (which could exec arbitrary shell).
SUPABASE_URL="$(grep -E '^SUPABASE_URL=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
SUPABASE_ANON_KEY="$(grep -E '^SUPABASE_ANON_KEY=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_ANON_KEY" ]]; then
  echo "SUPABASE_URL and SUPABASE_ANON_KEY must be set in $ENV_FILE" >&2
  exit 1
fi

RESPONSE="$(
  curl -sS -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
)"

ACCESS_TOKEN="$(printf '%s' "$RESPONSE" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("access_token",""))')"

if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "Failed to obtain access_token. Supabase response:" >&2
  echo "$RESPONSE" >&2
  exit 1
fi

printf '%s\n' "$ACCESS_TOKEN"
