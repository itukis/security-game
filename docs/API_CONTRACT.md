# SecureCodeArena — Orchestrator API Contract

Base URL: `http://localhost:4000`

---

## Types

### AttackResult

```json
{
  "vulnerability": "sqli",
  "exploited": true,
  "payload": "' OR '1'='1",
  "evidence": "Login succeeded without valid credentials",
  "durationMs": 42
}
```

| Field | Type | Description |
|---|---|---|
| `vulnerability` | `"sqli" \| "xss" \| "auth-bypass"` | Which vulnerability class was tested |
| `exploited` | `boolean` | `true` if the attack succeeded |
| `payload` | `string \| null` | The payload that worked, or `null` if none did |
| `evidence` | `string` | Human-readable explanation of what happened |
| `durationMs` | `number` | Wall-clock time for the attack run in milliseconds |

---

## Endpoints

### GET /problems/:id

Returns problem metadata and the initial (vulnerable) source code.

**Request:**

```bash
curl http://localhost:4000/problems/sqli-login
```

**Response (200):**

```json
{
  "id": "sqli-login",
  "title": "SQL Injection in Login Form",
  "description": "The login endpoint builds SQL queries using string concatenation, allowing an attacker to bypass authentication.",
  "vulnerability": "sqli",
  "targetEndpoint": "POST /login",
  "hints": [
    "Look at how the SQL query is built — what happens if username contains a single quote?"
  ],
  "initialCode": "const express = require('express');\n..."
}
```

**Response (404):**

```json
{
  "error": "Problem not found: bad-id"
}
```

---

### POST /problems/:id/verify

Applies a user-submitted patch to the vulnerable app, re-runs the attack, and reports whether the vulnerability is fixed.

**Request:**

```bash
curl -X POST http://localhost:4000/problems/sqli-login/verify \
  -H 'Content-Type: application/json' \
  -d '{
    "patch": "--- a/src/server.js\n+++ b/src/server.js\n@@ -20,3 +20,3 @@\n-  const sql = `SELECT ...`;\n+  const sql = ...;\n"
  }'
```

| Field | Type | Required | Description |
|---|---|---|---|
| `patch` | `string` | yes | Unified diff (same format as `git diff` output). For `sqli-login`, only `src/server.js` is accepted. |

**Response (200) — patch applied successfully:**

```json
{
  "attackBefore": {
    "vulnerability": "sqli",
    "exploited": true,
    "payload": "' OR '1'='1",
    "evidence": "Login succeeded without valid credentials",
    "durationMs": 38
  },
  "attackAfter": {
    "vulnerability": "sqli",
    "exploited": false,
    "payload": null,
    "evidence": "All 4 payloads were rejected",
    "durationMs": 45
  },
  "passed": true
}
```

**Authenticated extras (only present when `Authorization: Bearer …` is sent):**

When the request carries a valid Supabase JWT, the response additionally includes:

```json
{
  "recording": { "recorded": true, "firstClear": true, "score": 100 },
  "appliedPatchSummary": {
    "filesChanged": ["src/server.js"],
    "linesAdded": 2,
    "linesRemoved": 2,
    "hunks": [
      {
        "file": "src/server.js",
        "lineNumber": 30,
        "before": "    const sql = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;",
        "after": "    const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?');"
      }
    ]
  }
}
```

| Field | Type | Description |
|---|---|---|
| `recording.recorded` | `boolean` | `true` when the orchestrator persisted the submission successfully |
| `recording.firstClear` | `boolean` | `true` only the first time this user clears this problem |
| `recording.score` | `number \| null` | Current best score after this submission (`null` if not recorded) |
| `appliedPatchSummary.filesChanged` | `string[]` | Files touched by the unified diff |
| `appliedPatchSummary.linesAdded` | `number` | Total `+` lines (excluding headers) |
| `appliedPatchSummary.linesRemoved` | `number` | Total `-` lines (excluding headers) |
| `appliedPatchSummary.hunks` | `Array` | Up to 5 added lines, each with the prior removed line (if any). Lines truncated to 200 chars. |

Unauthenticated responses keep the original shape (`attackBefore`, `attackAfter`, `passed` only).

**Response (400) — invalid patch:**

```json
{
  "error": "Patch failed validation: patch does not apply cleanly"
}
```

**Response (404) — unknown problem:**

```json
{
  "error": "Problem not found: bad-id"
}
```

**Response (500) — internal error:**

```json
{
  "error": "Container failed to restart after patching"
}
```

---

## Notes for Frontend (teammate B/C)

- The `patch` field must be a valid unified diff. The frontend code editor should produce this by diffing the user's edited code against the original.
- `attackBefore` is always run first to confirm the baseline is exploitable. If `attackBefore.exploited` is `false`, something is wrong with the environment, not the user's patch.
- The verify endpoint is synchronous — expect it to take 5-15 seconds (container restart + attack runs). Show a loading spinner.
- `passed: true` means the user fixed the vulnerability. Display a success state.
