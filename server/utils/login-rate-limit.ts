import type { H3Event } from 'h3'

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 8
const attempts = new Map<string, { count: number; resetAt: number }>()

export function enforceLoginRateLimit(event: H3Event): void {
  const key = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const now = Date.now()
  const current = attempts.get(key)

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }

  if (current.count >= MAX_ATTEMPTS) {
    throw apiError(429, 'AUTH_RATE_LIMITED', 'Demasiados intentos. Intenta nuevamente más tarde.')
  }

  current.count += 1
}

export function clearLoginRateLimit(event: H3Event): void {
  const key = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  attempts.delete(key)
}
