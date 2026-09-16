import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Local embedding + heavy jobs run in GitHub Actions, not here.
    // Keep the serving surface lean.
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
