/**
 * Security Headers for Pay Lobster
 * Applied via middleware and next.config.js
 */

export const securityHeaders = [
  // DNS Prefetch Control
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  // Strict Transport Security (HSTS)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Prevent clickjacking
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // XSS Protection (legacy browsers)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Referrer Policy
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Permissions Policy (disable unnecessary features)
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://mainnet.base.org https://*.vercel.app wss://*.walletconnect.com https://*.walletconnect.com https://api.coinbase.com",
      "frame-src 'self' https://verify.walletconnect.com https://pay.coinbase.com",
      "frame-ancestors 'self'",
    ].join('; '),
  },
];

/**
 * Convert security headers to object format
 */
export function getSecurityHeadersObject(): Record<string, string> {
  return Object.fromEntries(
    securityHeaders.map(h => [h.key, h.value])
  );
}

/**
 * Apply security headers to a NextResponse
 */
export function applySecurityHeaders<T extends Response>(response: T): T {
  const headers = getSecurityHeadersObject();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
