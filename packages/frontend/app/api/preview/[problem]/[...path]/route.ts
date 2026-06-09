import { NextRequest } from "next/server";

// Server-side proxy from the Next.js origin (localhost:3000) to each
// vulnerable container (localhost:300x). The vulnerable apps don't set
// Access-Control-Allow-Origin, so the browser can't hit them directly.
// This proxy is intentionally narrow: only forwards POST/GET to the
// containers, only forwards Content-Type + X-User-Id headers. It does
// NOT touch the verify/orchestrator pipeline.

const PORT_BY_PROBLEM: Record<string, number> = {
  "sqli-login": 3001,
  "xss-comments": 3002,
  "idor-profile": 3003,
};

const FORWARDED_REQUEST_HEADERS = new Set(["content-type", "x-user-id"]);

async function proxy(
  request: NextRequest,
  problem: string,
  pathParts: string[],
) {
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
  const upstreamUrl = `http://localhost:${port}/${upstreamPath}`;

  const upstreamHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (FORWARDED_REQUEST_HEADERS.has(key.toLowerCase())) {
      upstreamHeaders.set(key, value);
    }
  }

  const init: RequestInit = {
    method: request.method,
    headers: upstreamHeaders,
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
    return new Response(body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      {
        error: "Container unreachable",
        message,
      },
      { status: 502 },
    );
  }
}

type RouteContext = {
  params: Promise<{ problem: string; path: string[] }>;
};

export async function GET(request: NextRequest, ctx: RouteContext) {
  const { problem, path } = await ctx.params;
  return proxy(request, problem, path);
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  const { problem, path } = await ctx.params;
  return proxy(request, problem, path);
}
