import { getRequestIP, type H3Event } from 'h3'

import { apiError } from './api-error'

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

const policies = {
  search: { windowMs: 60_000, max: 120, code: 'SEARCH_RATE_LIMITED' },
  checkoutPreview: { windowMs: 5 * 60_000, max: 30, code: 'CHECKOUT_RATE_LIMITED' },
  handoff: { windowMs: 15 * 60_000, max: 20, code: 'HANDOFF_RATE_LIMITED' }
} as const

export function enforcePublicAbuseRateLimit(event: H3Event, policyName: keyof typeof policies) {
  const policy = policies[policyName]
  const client = (event.node ? getRequestIP(event, { xForwardedFor: true }) : undefined) || 'unknown'
  const key = `${policyName}:${client}`
  const now = Date.now()
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + policy.windowMs })
    return
  }
  if (current.count >= policy.max) {
    throw apiError(429, policy.code, 'Demasiadas solicitudes. Intenta nuevamente mas tarde.')
  }
  current.count += 1
}

export function resetPublicAbuseRateLimits() {
  buckets.clear()
}
