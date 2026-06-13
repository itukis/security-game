import path from "node:path";
import type { NextConfig } from "next";

// Where the orchestrator listens. Override via ORCHESTRATOR_URL when the
// frontend Node process and orchestrator live on different hosts (rare —
// usually both run on the same low-memory VM).
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL ?? "http://localhost:4000";

// Pin Turbopack's workspace root to this package. Otherwise Next.js walks up
// to ~/package-lock.json and tries to read ~/Desktop, which macOS denies
// (TCC), crashing dev with a Turbopack panic in a tight loop.
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Proxy /api/orchestrator/* to the orchestrator. The frontend sets
  // NEXT_PUBLIC_API_URL=/api/orchestrator in production so the browser never
  // talks to port 4000 directly — Caddy (or any other front-end proxy) can
  // also forward the same path to the orchestrator if it wants to bypass
  // Next.js entirely.
  async rewrites() {
    return [
      {
        source: "/api/orchestrator/:path*",
        destination: `${ORCHESTRATOR_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
