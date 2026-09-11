import { randomUUID } from 'node:crypto'
import { getHeader, getRequestIP, type H3Event } from 'h3'

export function createRequestId() {
  return randomUUID()
}

export function getRequestContext(event: H3Event) {
  return {
    requestId: event.context?.requestId,
    ip: event.node ? getRequestIP(event, { xForwardedFor: true }) : undefined,
    userAgent: event.node ? getHeader(event, 'user-agent')?.slice(0, 512) : undefined
  }
}
