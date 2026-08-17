import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pins the workspace root so Turbopack doesn't try to walk up into
  // C:\Users\El (which has an unrelated stray package-lock.json).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
