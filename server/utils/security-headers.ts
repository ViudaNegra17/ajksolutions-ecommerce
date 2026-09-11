/* eslint-disable @stylistic/quotes -- CSP keywords contain required single quotes. */

export type SecurityHeaderOptions = {
  production: boolean
  appUrl: string
}

export function buildSecurityHeaders({ production, appUrl }: SecurityHeaderOptions) {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https: wss:",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'"
  ]
  const headers: Record<string, string> = {
    'Content-Security-Policy': directives.join('; '),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'X-Permitted-Cross-Domain-Policies': 'none'
  }
  if (production && appUrl.startsWith('https://')) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
  }
  return headers
}
