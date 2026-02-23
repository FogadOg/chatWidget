import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        // Allow embedding from any origin for /embed routes
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            // ⚠️ PRODUCTION WARNING: This allows embedding from ANY domain.
            // Before deploying to production, restrict to specific domains:
            // value: "frame-ancestors 'self' https://yourdomain.com https://partner.com;",
            value: "frame-ancestors *;",
          },
          // X-Frame-Options removed - CSP frame-ancestors is the modern standard
          // and takes precedence. X-Frame-Options: ALLOWALL is not a valid value.
        ],
      },
    ];
  },
};

export default nextConfig;
