# Orchestrator API — cURL Examples

Base URL: `http://localhost:4000`

---

## GET /problems/:id

Fetch problem metadata and the vulnerable source code.

```bash
curl -s http://localhost:4000/problems/sqli-login | python3 -m json.tool
```

**Response (200):** JSON with `id`, `title`, `vulnerability`, `description`, `targetEndpoint`, `hints`, `initialCode`.

---

## POST /problems/:id/verify

Submit a unified diff patch and get attack-before/after results.

```bash
# Build a JSON body from the patch file
jq -Rs '{patch: .}' packages/vulnerable-apps/sqli-login/solution.patch > /tmp/patch-body.json

# Submit it
curl -s -X POST http://localhost:4000/problems/sqli-login/verify \
  -H 'Content-Type: application/json' \
  -d @/tmp/patch-body.json | python3 -m json.tool
```

**Response (200):** JSON with `attackBefore`, `attackAfter`, `passed`.

You can also inline the patch directly:

```bash
curl -s -X POST http://localhost:4000/problems/sqli-login/verify \
  -H 'Content-Type: application/json' \
  -d '{
    "patch": "--- a/src/server.js\n+++ b/src/server.js\n@@ -27,8 +27,8 @@\n   }\n \n   try {\n-    const sql = `SELECT * FROM users WHERE username = '\''${username}'\'' AND password = '\''${password}'\''`;\n-    const row = db.prepare(sql).get();\n+    const stmt = db.prepare('\''SELECT * FROM users WHERE username = ? AND password = ?'\'');\n+    const row = stmt.get(username, password);\n \n     if (row) {\n       res.json({ success: true, user: { id: row.id, username: row.username } });\n"
  }'
```

---

## Common Errors

### 404 — Unknown problem

```bash
curl -s http://localhost:4000/problems/nonexistent
# → {"error":"Problem not found: nonexistent"}
```

### 400 — Malformed or non-applying patch

```bash
curl -s -X POST http://localhost:4000/problems/sqli-login/verify \
  -H 'Content-Type: application/json' \
  -d '{"patch": "not a valid diff"}'
# → {"error":"Patch failed validation: ..."}
```

### 400 — Missing patch field

```bash
curl -s -X POST http://localhost:4000/problems/sqli-login/verify \
  -H 'Content-Type: application/json' \
  -d '{}'
# → {"error":"Missing or invalid \"patch\" field (must be a string)"}
```

### 500 — Container crashed

If the container fails to restart after patching, you'll get:

```json
{"error":"Container failed to restart after patching"}
```

This usually means the patched code has a syntax error. Check the patch and try again.
