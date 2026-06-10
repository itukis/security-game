import path from "node:path";
import type { NextConfig } from "next";

// Pin Turbopack's workspace root to this package. Otherwise Next.js walks up
// to ~/package-lock.json and tries to read ~/Desktop, which macOS denies
// (TCC), crashing dev with a Turbopack panic in a tight loop.
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
