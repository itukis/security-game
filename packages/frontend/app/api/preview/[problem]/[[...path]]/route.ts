import { NextRequest } from "next/server";

// Server-side proxy from the Next.js origin (localhost:3000) to each
// vulnerable container (localhost:300x). The vulnerable apps don't set
// Access-Control-Allow-Origin, so the browser can't hit them directly.
// This proxy is intentionally narrow: only forwards POST/GET to the
// containers, only forwards a small allowlist of headers. It does
// NOT touch the verify/orchestrator pipeline.

const PORT_BY_PROBLEM: Record<string, number> = {
  "sqli-login": 3001,
  "xss-comments": 3002,
  "idor-profile": 3003,
  "csrf-transfer": 3006,
  "hardcoded-secrets": 3007,
  "open-redirect": 3008,
  "file-upload": 3009,
  "review-support-portal": 3010,
  "review-account-workflow": 3011,
  "review-file-workbench": 3012,
};

const DOCKER_PROBLEM_IDS: ReadonlySet<string> | null = (() => {
  const raw = process.env.NEXT_PUBLIC_DOCKER_PROBLEM_IDS;
  if (!raw) return null;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? new Set(ids) : null;
})();

const FORWARDED_REQUEST_HEADERS = new Set([
  "content-type",
  "x-user-id",
  "x-csrf-token",
]);

const PREVIEW_UPSTREAM_TIMEOUT_MS =
  Number(process.env.PREVIEW_UPSTREAM_TIMEOUT_MS) || 3500;

function isPreviewEnabled(problem: string) {
  return !DOCKER_PROBLEM_IDS || DOCKER_PROBLEM_IDS.has(problem);
}

async function proxy(
  request: NextRequest,
  problem: string,
  pathParts: string[],
) {
  if (!isPreviewEnabled(problem)) {
    return Response.json(
      { error: "This problem is static-only on this deployment" },
      { status: 400 },
    );
  }

  const port = PORT_BY_PROBLEM[problem];
  if (!port) {
    return Response.json(
      { error: `Unknown problem: ${problem}` },
      { status: 404 },
    );
  }

  const upstreamPath = pathParts
    .map((part) => encodeURIComponent(part))
    .join("/");
  // Preserve the original query string. The open-redirect preview relies on
  // ?redirect=... reaching the vulnerable app; without this the upstream would
  // always fall back to its default destination.
  const search = request.nextUrl.search;
  const upstreamUrl = `http://localhost:${port}/${upstreamPath}${search}`;

  const upstreamHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (FORWARDED_REQUEST_HEADERS.has(key.toLowerCase())) {
      upstreamHeaders.set(key, value);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, PREVIEW_UPSTREAM_TIMEOUT_MS);

  const init: RequestInit = {
    method: request.method,
    headers: upstreamHeaders,
    signal: controller.signal,
    // Don't auto-follow 3xx — the open-redirect preview needs to inspect the
    // Location header that the vulnerable app returns. Following would also
    // try to fetch attacker-supplied external URLs from this Node process.
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  try {
    const upstream = await fetch(upstreamUrl, init);
    const body = await upstream.arrayBuffer();
    const responseHeaders = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders.set("content-type", contentType);
    const location = upstream.headers.get("location");

    // Browser fetch can't read the Location header off a 3xx response (manual
    // mode produces an opaque-redirect with empty headers; follow mode would
    // either navigate away or try to fetch attacker-supplied external URLs).
    // Re-wrap 3xx as 200 + sidecar headers so the client can inspect them.
    if (upstream.status >= 300 && upstream.status < 400) {
      responseHeaders.set("x-upstream-status", String(upstream.status));
      if (location) responseHeaders.set("x-upstream-location", location);
      return new Response(body, { status: 200, headers: responseHeaders });
    }

    if (location) responseHeaders.set("location", location);
    return new Response(body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const aborted =
      err instanceof Error &&
      (err.name === "AbortError" || message.includes("aborted"));
    return Response.json(
      {
        error: aborted ? "Container preview timed out" : "Container unreachable",
        message: aborted
          ? `Preview did not respond within ${PREVIEW_UPSTREAM_TIMEOUT_MS}ms`
          : message,
      },
      { status: aborted ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

type RouteContext = {
  params: Promise<{ problem: string; path?: string[] }>;
};

export async function GET(request: NextRequest, ctx: RouteContext) {
  const { problem, path } = await ctx.params;
  return proxy(request, problem, path ?? []);
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  const { problem, path } = await ctx.params;
  return proxy(request, problem, path ?? []);
}
