# Frontend Integration Guide

This document tells you everything you need to call the backend from the Next.js frontend.

## Available problems

| Problem ID | Vulnerability | Container port | One-line description |
|---|---|---|---|
| `sqli-login` | SQL injection | 3001 | Login form concatenates user input into a SQL query. |
| `xss-comments` | Cross-site scripting | 3002 | Comment board renders user-submitted text into HTML without escaping. |
| `idor-profile` | Authorization bypass (IDOR) | 3003 | Profile API trusts the URL ID without checking who the authenticated user is. |

The orchestrator API runs on `http://localhost:4000` and is the only host the frontend should call. Container ports above are listed for reference / direct probing only.

## Starting the backend

```bash
# From the project root (~/Desktop/security-game):

# 1. Start the vulnerable app containers
docker-compose up sqli-login xss-comments idor-profile --build -d

# 2. Start the orchestrator API (port 4000)
node packages/orchestrator/src/server.js
```

CORS is configured to allow requests from `http://localhost:3000` (the Next.js dev server).

## Base URL

```
http://localhost:4000
```

## Endpoints needed for Day 3 MVP

### 1. GET /problems/sqli-login

Returns problem metadata + the vulnerable source code to display in the editor.

Key fields: `initialCode` (the code to show), `hints` (array of hint strings), `description` (plain-language explanation).

### 2. POST /problems/sqli-login/verify

Body: `{ "patch": "<unified diff string>" }`

Returns: `{ attackBefore, attackAfter, passed }`.

- `passed: true` means the user fixed the vulnerability.
- The verify call takes 5-15 seconds (container rebuild + attack runs). Show a loading state.

See `curl-examples.md` for copy-pasteable examples and `sample-responses.json` for the exact response shapes.

## Recommended client code pattern

Create a single `lib/api.ts` that wraps both calls:

```ts
import type { Problem, VerifyResponse } from '@/types/arena';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// Import mock data for offline development
import mockData from '../../docs/frontend-integration/sample-responses.json';

export async function getProblem(id: string): Promise<Problem> {
  if (USE_MOCK) return mockData.getProblem as Problem;
  const res = await fetch(`${BASE_URL}/problems/${id}`);
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function verifyPatch(id: string, patch: string): Promise<VerifyResponse> {
  if (USE_MOCK) return mockData.verifyPassing as VerifyResponse;
  const res = await fetch(`${BASE_URL}/problems/${id}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patch }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}
```

Set `NEXT_PUBLIC_USE_MOCK=true` in `.env.local` to develop the UI without the backend running.

## Files in this directory

| File | Purpose |
|---|---|
| `types.ts` | TypeScript types — copy into your project |
| `sample-responses.json` | Real captured API responses — use as mock data |
| `curl-examples.md` | Copy-pasteable cURL commands for manual testing |
| `README.md` | This file |
