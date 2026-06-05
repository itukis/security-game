# SecureCodeArena

Gamified secure-coding platform: see a vulnerability, watch it get exploited, patch the code, prove the fix.

> Work in progress — hackathon build.

## How to run locally

```bash
# 1. Start the vulnerable app container
docker-compose up sqli-login --build -d

# 2. Install dependencies for the attack engine and orchestrator
cd packages/attack-engine && npm install && cd ../..
cd packages/orchestrator && npm install && cd ../..

# 3. Verify the app is running
curl http://localhost:3001/health
# → {"status":"ok"}

# 4. (Optional) Start the orchestrator HTTP API on port 4000
node packages/orchestrator/src/server.js
```

## How to verify the SQLi problem

Run the end-to-end verification from the project root:

```bash
node packages/orchestrator/src/verify.js \
  --problem sqli-login \
  --patch packages/vulnerable-apps/sqli-login/solution.patch
```

Expected: `attackBefore.exploited: true`, `attackAfter.exploited: false`, `passed: true`.

You can also run just the attack engine:

```bash
node packages/attack-engine/src/index.js --target http://localhost:3001 --attack sqli
```

## How to add a new problem

1. Create a new directory under `packages/vulnerable-apps/<problem-id>/` with:
   - `Dockerfile` (use `node:20-alpine`, install git, run as non-root)
   - `package.json` with dependencies
   - `src/server.js` with the intentionally vulnerable app (must include `/health` endpoint)
   - `solution.patch` — a unified diff that fixes the vulnerability
2. Add the service to `docker-compose.yml` (use a unique port)
3. Register the problem in `packages/orchestrator/src/applyPatch.js` (`PROBLEMS` map) and `packages/orchestrator/src/server.js` (`PROBLEM_META` map)
4. Add an attack handler in `packages/attack-engine/src/attacks/<type>.js` and register it in `packages/attack-engine/src/runner.js`
5. Test with `verify.js` to confirm the end-to-end flow works

## Demo helpers

### Reset all vulnerable containers

If a demo gets stuck in a bad state (e.g. a patch that leaves the container
unhealthy), the orchestrator can rebuild every vulnerable app in one call.
The endpoint is gated on `ALLOW_RESET=true` so it's a 404 in normal runs.

```bash
ALLOW_RESET=true node packages/orchestrator/src/server.js
# in another terminal:
curl -X POST http://localhost:4000/admin/reset
# → {"reset":true,"durationMs":12345}
```

Without `ALLOW_RESET=true`, the same request returns `404 {"error":"Not found"}`.

### Seed the leaderboard for a demo

Before showing the app to judges, populate the catalog and (optionally) the
leaderboard so the screen isn't empty:

```bash
# 1. Problem catalog (idempotent — safe to re-run)
psql "$DEMO_SUPABASE_URL" -f supabase/seed.sql

# 2. (Optional) Fake leaderboard entries — DEMO PROJECT ONLY
psql "$DEMO_SUPABASE_URL" -f supabase/demo-seed.sql
```

`supabase/demo-seed.sql` creates four synthetic users (`aoi`, `taro`, `sakura`,
`ren`) with `00000000-0000-0000-0000-…` UUIDs so they're easy to spot and
remove. Re-running the script cleans up the previous rows first, so it's
idempotent. The header has a "NEVER prod" warning — read it.

> Note: `supabase/demo-seed.sql` inserts test users via `auth.users` so the
> profiles trigger fires. Do not insert into `public.profiles` directly — the
> `profiles.id → auth.users(id)` foreign key will reject it.

### Get a test JWT in one line

`packages/orchestrator/scripts/get-test-jwt.sh` wraps the Supabase token call
and prints only the `access_token`, so it pipes cleanly into env vars or curl
headers. Requires `packages/orchestrator/.env` with `SUPABASE_URL` and
`SUPABASE_ANON_KEY` (publishable `sb_publishable_…` key works).

```bash
export TEST_JWT=$(./packages/orchestrator/scripts/get-test-jwt.sh testtest)
# or with a non-default email:
export TEST_JWT=$(./packages/orchestrator/scripts/get-test-jwt.sh mypass me@example.com)

curl -H "Authorization: Bearer $TEST_JWT" \
  http://localhost:4000/problems/sqli-login
```

## Docs

- `docs/ARCHITECTURE.md` — system diagram and data flow
- `docs/API_CONTRACT.md` — orchestrator HTTP API spec for frontend integration
