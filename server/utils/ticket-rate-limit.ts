import type { H3Event } from 'h3'
import { apiError } from './api-error'

const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS = 5
const requests = new Map<string, { count: number; resetAt: number }>()

export function enforceTicketRateLimit(event: H3Event) {
  const key = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const now = Date.now()
  const current = requests.get(key)
  if (!current || current.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }
  if (current.count >= MAX_REQUESTS) {
    throw apiError(429, 'TICKET_RATE_LIMITED', 'Demasiadas solicitudes. Intenta nuevamente más tarde.')
  }
  current.count += 1
}

export function resetTicketRateLimit() {
  requests.clear()
}
