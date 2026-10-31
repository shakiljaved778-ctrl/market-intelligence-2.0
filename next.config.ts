import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Local embedding + heavy jobs run in GitHub Actions, not here.
    // Keep the serving surface lean.
    optimizePackageImports: ["lucide-react"],
    // Cross-route View Transitions for client navigations (progressive
    // enhancement; respects prefers-reduced-motion).
    viewTransition: true,
  },
};

export default nextConfig;
