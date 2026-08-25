# SecureCodeArena — STATUS

> このファイルは2026-06-05時点の履歴スナップショットです。現在の構成は
> `README.md`、`docs/IMPLEMENTATION_ARCHITECTURE.md`、`supabase/SETUP.md`を参照してください。

Snapshot of what is implemented, what is not, and how the pieces fit
together. Captured on 2026-06-05 after a merge that resolved an orchestrator
`server.js` conflict and left several Day 8 frontend additions reverted.

This document supersedes earlier informal "what's done" notes. It is meant
to be the single thing a new collaborator reads before touching the code.

---

## 1. Architecture

### 1.1 Process / network topology

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser                                                             │
│  Next.js dev server  http://localhost:3000                           │
│  packages/frontend                                                   │
│  Routes: /  /challenges  /challenges/:id                             │
│          /login  /signup  /dashboard  /leaderboard                   │
└──────────────────────┬───────────────────────────────────────────────┘
                       │  fetch
                       │  (Bearer JWT when logged in via Supabase Auth)
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Orchestrator API  (host process, port 4000)                         │
│  packages/orchestrator/src/server.js                                 │
│                                                                      │
│  Routes:                                                             │
│    GET  /health                       — orchestrator + container roll-up │
│    GET  /problems/:id                 — problem metadata + initial code  │
│    POST /problems/:id/verify          — applies patch, runs attack engine│
│    POST /admin/reset                  — gated on ALLOW_RESET=true        │
│    GET  /me/dashboard                 — requires Bearer JWT              │
│    GET  /leaderboard                  — Supabase RPC                     │
└─────────┬────────────────────────┬───────────────────────────────────┘
          │ docker exec git apply  │ HTTP attack (axios)
          ▼                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│  3 vulnerable apps (containers on a single bridge network `vuln-net`,  │
│  outbound dropped by iptables OUTPUT REJECT installed in entrypoint.sh)│
│                                                                        │
│  arena-sqli-login    host :3001  container :3000  → POST /login        │
│  arena-xss-comments  host :3002  container :3000  → GET  /comments     │
│  arena-idor-profile  host :3003  container :3000  → GET  /profile/:id  │
└────────────────────────────────────────────────────────────────────────┘
                       ▲
                       │ axios from host (verify.js, attack engine)
                       │ uses host port, NOT vuln-net
                       │
┌─────────────────────────────────────────┐
│  Attack engine (host process, library)  │
│  packages/attack-engine/src/runner.js   │
│    sqli         → attacks/sqli.js       │
│    xss          → attacks/xss.js        │
│    auth-bypass  → attacks/authBypass.js │
└─────────────────────────────────────────┘

External:
  Supabase (cloud) — Auth + Postgres
    Tables:  profiles, problems, completed_problems, submission_history
    RPC:     get_leaderboard
    Trigger: handle_new_user (auth.users insert → profiles row)
```

### 1.2 Verify cycle (POST /problems/:id/verify)

1. Frontend POST → orchestrator (Bearer optional)
2. `validatePatch` (generic: ≤50 KB, no `..`, only files under `src/`)
3. `validatePatchSafety` (per-problem allow-list, line cap)
4. `enqueueVerify` (serialized — Docker state is shared)
5. `verify()`:
   1. `docker compose up <service> --build -d --force-recreate` to baseline
   2. attack baseline → expect `exploited: true`
   3. `docker cp` patch into container, `git apply --check` then `git apply`
   4. `docker compose restart <service>` and wait for `/health`
   5. attack patched container → expect `exploited: false`
   6. `passed = before.exploited && !after.exploited`
6. `recordSubmission` writes `submission_history` and (on first pass)
   `completed_problems` via the Supabase service-role client.
7. Response:
   - Unauth: `{attackBefore, attackAfter, passed}`
   - Auth:   above + `{recording: {recorded, firstClear, score}, appliedPatchSummary}`

### 1.3 Repo layout

```
security-game/
├── docker-compose.yml                     vuln-net + cap_add NET_ADMIN
├── docs/
│   ├── ARCHITECTURE.md                    pre-Day-7 architecture text
│   ├── API_CONTRACT.md                    HTTP API spec
│   ├── STATUS.md                          this file
│   └── frontend-integration/              integration kit for the FE lane
├── packages/
│   ├── attack-engine/                     host-side library; 3 attacks
│   ├── orchestrator/                      Express on 4000; verify pipeline
│   │   ├── src/server.js
│   │   ├── src/verify.js
│   │   ├── src/applyPatch.js
│   │   ├── src/patchPolicy.js             validatePatch + summarizePatch
│   │   ├── src/dockerCli.js               execFile wrappers
│   │   ├── src/auth/
│   │   │   ├── authMiddleware.js          optionalAuth: HS256 / ES256+JWKS
│   │   │   ├── scoring.js                 recordSubmission
│   │   │   └── supabaseClient.js          service-role client
│   │   └── scripts/get-test-jwt.sh        password-grant → access_token
│   ├── vulnerable-apps/
│   │   ├── sqli-login/                    Dockerfile + entrypoint.sh + solution.patch
│   │   ├── xss-comments/                  ditto
│   │   └── idor-profile/                  ditto
│   └── frontend/                          Next.js 16.2.6 + React 19 + Tailwind 4
├── supabase/
│   ├── schema.sql                         profiles / problems / completed_problems / submission_history / leaderboard view
│   ├── rls.sql
│   ├── seed.sql                           3 problems
│   └── demo-seed.sql                      4 fake users + clears (NEVER prod)
└── scripts/
    └── smoke-all.sh                       7-step e2e check
```

---

## 2. Implemented (works end-to-end)

### 2.1 Backend

| Feature | Path | Notes |
|---|---|---|
| 3 vulnerable apps booting on iptables-locked net | `docker-compose.yml`, `packages/vulnerable-apps/*/Dockerfile` + `entrypoint.sh` | `cap_add: NET_ADMIN`, OUTPUT ACCEPT lo / ACCEPT ESTABLISHED,RELATED / REJECT. Outbound to internet from inside containers fails (`Connection refused`). Healthcheck probes `127.0.0.1:3000/health` so it stays IPv4 → all 3 report `healthy`. |
| Patch verify pipeline | `packages/orchestrator/src/{verify,applyPatch}.js` | Serialized via `enqueueVerify`; baseline rebuild → attack → patch → restart → attack. |
| Patch input validation | `src/patchPolicy.js` `validatePatch` | 50 KB cap, rejects `^(\+\+\+\|---\|diff --git)\s+.*\.\.`, requires every `+++ b/` to live under `src/`. |
| Per-problem patch policy | `src/patchPolicy.js` `validatePatchSafety` | Allow-list `[src/server.js]`, byte cap, added-line cap. |
| Patch summary | `src/patchPolicy.js` `summarizePatch` | filesChanged, linesAdded/Removed, ≤5 hunks with prior removed line, 200-char line truncation. Returned only on authed verify. |
| `GET /health` | `src/server.js` | `{status, version, problems, containersHealthy}` (rolls up `Promise.allSettled` GET /health on each vuln-app host port, 1s timeout). |
| `GET /problems/:id` | `src/server.js` | Reads PROBLEM_META + `src/server.js` file from disk. |
| `POST /problems/:id/verify` | `src/server.js` | See §1.2. Authed extras: `recording` + `appliedPatchSummary`. |
| `POST /admin/reset` (env-gated) | `src/server.js` | 404 unless `ALLOW_RESET=true`. Then `docker compose down && up -d --build`. For demo recovery. |
| `GET /me/dashboard` (auth required) | `src/server.js` | profile + totalScore + completed + recent submissions via service-role Supabase. |
| `GET /leaderboard` | `src/server.js` | Calls Supabase RPC `get_leaderboard(limit_n: 50)`, falls back to fetching missing display_names from profiles. |
| Supabase JWT verification | `src/auth/authMiddleware.js` `optionalAuth` | Supports HS256 (legacy `SUPABASE_JWT_SECRET`) and ES256 via cached JWKS (10 min TTL). |
| Submission recording | `src/auth/scoring.js` `recordSubmission` | inserts `submission_history`; on first pass inserts `completed_problems` (PK collision → not first clear). |

### 2.2 Attack engine

| Attack | File | Strategy |
|---|---|---|
| sqli | `attacks/sqli.js` | 4 payloads (`' OR '1'='1`, `' OR 1=1--`, `admin' --`, UNION SELECT). exploited if any returns `success: true`. |
| xss  | `attacks/xss.js` | POST a `<script>` then `<img onerror>`, GET /comments; exploited if literal tag appears in body. Best-effort `/reset` at end. |
| auth-bypass | `attacks/authBypass.js` | Sanity: GET /profile/user-1 as user-1. Then as user-1 hit /profile/user-2 and /profile/user-3; exploited if 200 + `secret` field present. |

### 2.3 Frontend (currently shipped state)

| Route | File | State |
|---|---|---|
| `/` landing | `app/page.tsx` | Marketing copy is currently SQLi-focused (Day 8 reverted). |
| `/challenges` list | `app/challenges/page.tsx` | Header copy says "現在は SQL Injection の基礎ミッションのみ公開中" (Day 8 reverted). |
| `/challenges/[id]` detail | `app/challenges/[id]/page.tsx` + `components/ChallengePlayground.tsx` | 4-step flow (attack → code review → patch select → re-test). Step copy and the amber cause-summary are SQLi-hardcoded. |
| `/login`, `/signup`, `/dashboard`, `/leaderboard` | `app/{login,signup,dashboard,leaderboard}/page.tsx` | B's auth lane. Use `lib/supabase.ts` browser client + `middleware.ts` SSR auth via `@supabase/ssr`. |
| `lib/api/challenges.ts` | — | `getProblems` / `getProblem` / `verifyPatch`. `verifyPatch` attaches `Authorization: Bearer <session.access_token>` from Supabase when logged in. `USE_MOCK` defaults true. |
| `components/{AuthProvider,Toast,Spinner,PageError}.tsx` | — | B's auth UX primitives. |
| `lib/{api.ts,errors.ts,supabase.ts}` | — | B's lane. |

### 2.4 Infra / DevOps

| Item | File | Notes |
|---|---|---|
| `scripts/smoke-all.sh` | — | 7-step e2e: docker ps, healthchecks, verify.js × 3, authed-HTTP (warns if `TEST_JWT` unset), outbound block, `/admin/reset` gating. |
| `packages/orchestrator/scripts/get-test-jwt.sh` | — | Password-grant against Supabase, prints access_token only. |
| `supabase/schema.sql` | — | Tables + leaderboard view + handle_new_user trigger. |
| `supabase/seed.sql` | — | 3-problem catalog (sqli/xss/idor, base_score 100). |
| `supabase/demo-seed.sql` | — | 4 fake users via `auth.users` insert so the FK + trigger fire correctly. Idempotent. "NEVER prod" warning in header. |

---

## 3. Not implemented / not shipped right now

### 3.1 Frontend gaps (the big ones)

| Gap | Symptom | Root cause |
|---|---|---|
| Only `sqli-login` plays end-to-end in the UI | `xss-comments` and `idor-profile` don't show on `/challenges`, and even reaching `/challenges/xss-comments` directly leaves Step 3 empty. | `lib/mockChallenges.ts` only contains sqli. `lib/api/challenges.ts` `getProblems()` non-mock branch fetches only `DEFAULT_PROBLEM_ID`. `createPatchOptions()` returns `[]` for anything other than `sqli-login`. |
| Per-problem copy (cause / step / preview / flavor) | Detail page for any problem shows SQLi-flavored text. AttackPanel says "ログイン認証が突破されました" regardless of vulnerability. | Day 8 introduced `lib/problemContent.ts` + `Challenge.stepCopy/causeSummary/previewKind/defenseSuccessFlavor`. All reverted by the pull. `lib/problemContent.ts` is deleted. |
| Visual feedback (red attack-flash, green defense-flash, verifying pulse) | None; only color changes statically. | Day 8 added 3 keyframes to `app/globals.css` and `animate-*` classes + role/aria-live to AttackPanel / ResultPanel. Reverted by the pull. |
| Mock "correct" patch matches real `solution.patch` | If user runs in `NEXT_PUBLIC_USE_MOCK=false`, the mock patch for sqli won't `git apply` (illustrative TS-style diff, not the Node `src/server.js` one). | Day 8 had `problemContent.ts` mirror the real solution.patch byte-for-byte. Reverted. |
| Vulnerable-app preview varies per problem (login / comments / profile) | Always shows a login form. | Day 8 added `previewKind` switch. Reverted. |
| Code editor | Patches are pre-canned options (`patchOptions`). | Designed-in; Monaco editor + free-form diff is a future task per existing notes. |
| `appliedPatchSummary` UI consumption | API ships it on authed verify, but the FE only displays the original `attackBefore`/`attackAfter`/`passed`/`explanation`. | No UI for the summary yet. |

### 3.2 Backend / infra gaps

| Gap | Notes |
|---|---|
| No rate limiting on `/problems/:id/verify` | Each verify costs a docker rebuild and 2 attack runs — abusable. |
| `recordSubmission` failure-mode is best-effort | If Supabase is unreachable, `passed: true` still returns but no row written; user gets the green screen but no leaderboard credit. |
| `/leaderboard` requires Supabase RPC `get_leaderboard(limit_n int)` | Not in `supabase/schema.sql` (only a view named `leaderboard`). Either the RPC needs to be added or the route needs to read the view. Today the route returns 500 if Supabase isn't reachable / RPC missing. |
| `appliedPatchSummary` only on authed path | Unauth verify can't show what changed even though all the data needed lives in the request body. |
| Outbound block depends on `CAP_NET_ADMIN` | If Docker is reconfigured to drop the cap, the egress block silently degrades. No assert at boot. |
| No tests | Beyond `scripts/smoke-all.sh` (which is an integration smoke), there are no unit tests. |

### 3.3 Demo / ops gaps

| Gap | Notes |
|---|---|
| `packages/frontend/.env.local` not in this working copy | Historical note. Current frontend uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Missing settings no longer crash module evaluation. |
| `TEST_JWT` not wired into smoke-all.sh by default | Step 4 of smoke-all.sh is a WARN-not-FAIL when `TEST_JWT` is empty. Real authed verify (+ `recording` + `appliedPatchSummary`) hasn't been demo-time exercised in this branch. |

---

## 4. Known issues / footnotes

1. **`/leaderboard` returns 500 in this working copy** because the local box can't reach Supabase (or `get_leaderboard` RPC isn't deployed). Other endpoints (`/health`, `/admin/reset`, `/me/dashboard`-401, `/problems/:id`, `/problems/:id/verify`) all respond correctly.
2. **The `vuln-publish` second network from Day 5 has been removed**; Day 6's iptables solution lets a single `vuln-net` bridge handle both port publishing and (with the in-container REJECT rule) outbound block. The earlier `docs/ARCHITECTURE.md` text describing dual networks is stale.
3. **`@supabase/ssr` and `@supabase/supabase-js` were added to `package.json` by B but `node_modules` was empty in this pull**; `npm install` in `packages/frontend` is required after pulling.
4. **The `git pull` reverted Day 8 frontend additions** (3-problem support, problemContent.ts, attack/defense flash, per-problem copy, previewKind). They are recoverable from the prior session's edits but are not in the tree right now. See §3.1.
5. **One conflict was resolved by union merge in `packages/orchestrator/src/server.js`** (this session). Both lanes' imports kept; `/admin/reset` and `/me/dashboard` + `/leaderboard` all coexist. Syntax now passes `node --check` and the orchestrator boots cleanly with all 4 route shapes responding.

---

## 5. Minimal "is it working?" checks

```bash
# 1. Containers
docker ps --format 'table {{.Names}}\t{{.Status}}'
#   expect: 3 × "Up (healthy)"

# 2. Orchestrator boot + /health
node packages/orchestrator/src/server.js   # ctrl-C to stop
curl -s http://localhost:4000/health | python3 -m json.tool
#   expect: status:ok, version:0.5.0, problems:[sqli/xss/idor], containersHealthy:true

# 3. Full backend smoke (orchestrator must NOT already be on :4000)
bash scripts/smoke-all.sh
#   expect: ✅ All checks passed
#   step 4 will WARN unless TEST_JWT is exported

# 4. Frontend dev
cd packages/frontend
npm install                                    # needed after pull
NEXT_PUBLIC_USE_MOCK=true npm run dev          # mock mode, no Supabase needed
# open http://localhost:3000/challenges/sqli-login → 4-step flow works through to passed:true
```

To exercise the authed extras + leaderboard end-to-end, additionally:

```bash
# packages/orchestrator/.env  must contain
#   SUPABASE_URL, SUPABASE_JWKS_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY
# packages/frontend/.env.local must contain
#   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
# Supabase project must have schema.sql + seed.sql applied and the
# get_leaderboard(limit_n int) RPC defined.

export TEST_JWT=$(packages/orchestrator/scripts/get-test-jwt.sh <password>)
TEST_JWT=$TEST_JWT bash scripts/smoke-all.sh
```
