import type { NextConfig } from "next";

// Try to import Sentry webpack plugin if available
let withSentryConfig: any = null;
try {
  withSentryConfig = require('@sentry/nextjs').withSentryConfig;
} catch {
  // Sentry not installed - that's okay
}

const nextConfig: NextConfig = {
  // Mark pdf2json as external for server components (fixes "nodeUtil is not defined" error)
  serverExternalPackages: ['pdf2json'],
};

// If Sentry is installed, wrap the config with Sentry configuration
// This enables automatic error tracking, source maps, and release tracking
export default withSentryConfig
  ? withSentryConfig(nextConfig, {
      // Sentry Webpack Plugin Options

      // Suppresses source map uploading logs during build
      silent: true,

      // For all available options, see:
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

      // Upload source maps for better error tracking
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,

      // Only required if you're using Sentry CLI
      // authToken: process.env.SENTRY_AUTH_TOKEN,
    })
  : nextConfig;
