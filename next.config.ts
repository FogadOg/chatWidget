import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      try {
        // Add Size Limit webpack plugins so `npx size-limit --why` can work
        // Plugins are optional and only used during CI/local analysis.
        // Require at runtime to avoid build-time TypeScript issues when the
        // packages may not be installed in other environments.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const SizeLimitWebpack = require('@size-limit/webpack');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const SizeLimitWebpackWhy = require('@size-limit/webpack-why');
        if (SizeLimitWebpack) {
          // @ts-expect-error size-limit webpack plugin has no types in this env
          config.plugins.push(new SizeLimitWebpack());
        }
        if (SizeLimitWebpackWhy) {
          // @ts-expect-error size-limit webpack-why plugin has no types in this env
          config.plugins.push(new SizeLimitWebpackWhy());
        }
      } catch {
        // If plugins are not available, skip silently.
      }
    }
    return config;
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

export default withBundleAnalyzer(nextConfig);
