import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy.
 *
 * Note on `'unsafe-inline'` for script-src: Next.js App Router emits inline
 * bootstrap/flight scripts and inline styles for hydration. A strict nonce-based
 * CSP is the hardened production configuration and is documented in the README
 * under "Hardening". We keep `'unsafe-eval'` in development only (React Refresh).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep native/Node-only database drivers out of the bundler's module graph.
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Never let a service worker or CDN cache authenticated API responses.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          ...securityHeaders,
        ],
      },
    ];
  },
};

export default nextConfig;
