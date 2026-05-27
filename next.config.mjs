/** @type {import('next').NextConfig} */

// Content-Security-Policy scoped to what the site actually loads:
// - self for app assets/API; Supabase for auth + storage (https + websocket realtime)
// - Instagram for the profile embed iframe
// - 'unsafe-inline'/'unsafe-eval' on scripts are required by Next.js' inline runtime
//   (tighten later with nonces if desired)
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src https://www.instagram.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
]

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: cspDirectives.join('; '),
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=(self), browsing-topics=()',
  },
]

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  // Chevmic LLC is a static client site served from public/chevmic/.
  // Bare /chevmic redirects to the landing page; the trailing-slash path
  // lets the pages' relative links resolve under /chevmic/.
  async redirects() {
    return [
      {
        source: '/chevmic',
        destination: '/chevmic/index.html',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
