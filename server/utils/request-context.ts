import type { H3Event } from 'h3'

export function getRequestContext(event: H3Event) {
  return {
    ip: getRequestIP(event, { xForwardedFor: true }),
    userAgent: getHeader(event, 'user-agent')?.slice(0, 512)
  }
}
