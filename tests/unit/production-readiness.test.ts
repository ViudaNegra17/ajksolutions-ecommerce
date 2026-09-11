/* eslint-disable @stylistic/quotes -- Assertions include literal CSP keywords. */

import { afterEach, describe, expect, it } from 'vitest'
import { validateProductionEnvironment } from '../../config/production-env'
import { probeReadiness } from '../../server/utils/health'
import { sanitizeLogValue } from '../../server/utils/operational-log'
import {
  enforcePublicAbuseRateLimit,
  resetPublicAbuseRateLimits
} from '../../server/utils/public-abuse-rate-limit'
import { createRequestId } from '../../server/utils/request-context'
import { buildSecurityHeaders } from '../../server/utils/security-headers'
import { canonicalUrl, catalogRobots } from '../../shared/utils/seo'

const productionEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://app:private@db.internal:5432/ajk',
  NUXT_SESSION_PASSWORD: 'session-8b1d79641a1b4985884c44a8',
  NUXT_CHECKOUT_SIGNING_SECRET: 'checkout-680b2a56180e4d8398d0cc1b',
  NUXT_ORDER_HANDOFF_SECRET: 'handoff-c3af73d25eab4c7984e6245b',
  NUXT_PUBLIC_APP_URL: 'https://shop.example.com'
}

describe('Phase 8 production readiness', () => {
  afterEach(() => resetPublicAbuseRateLimits())
  it('accepts an explicit, separated production configuration', () => {
    expect(() => validateProductionEnvironment(productionEnv)).not.toThrow()
  })

  it.each([
    [{ ...productionEnv, DATABASE_URL: undefined }, 'DATABASE_URL'],
    [{ ...productionEnv, NUXT_PUBLIC_APP_URL: 'http://localhost:3000' }, 'public HTTPS'],
    [{ ...productionEnv, NUXT_SESSION_PASSWORD: 'short' }, 'weak'],
    [{ ...productionEnv, NUXT_ORDER_HANDOFF_SECRET: productionEnv.NUXT_SESSION_PASSWORD }, 'independent']
  ])('rejects unsafe production configuration', (env, message) => {
    expect(() => validateProductionEnvironment(env)).toThrow(message)
  })

  it('keeps development configuration usable', () => {
    expect(() => validateProductionEnvironment({ NODE_ENV: 'development' })).not.toThrow()
  })

  it('builds CSP and emits HSTS only for production HTTPS', () => {
    const production = buildSecurityHeaders({ production: true, appUrl: 'https://shop.example.com' })
    expect(production['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    expect(production['X-Content-Type-Options']).toBe('nosniff')
    expect(production['Strict-Transport-Security']).toContain('max-age=31536000')
    expect(buildSecurityHeaders({ production: false, appUrl: 'http://localhost:3000' })).not.toHaveProperty(
      'Strict-Transport-Security'
    )
  })

  it('reports readiness without exposing dependency details', async () => {
    await expect(probeReadiness(async () => true)).resolves.toEqual({
      ready: true,
      status: { status: 'ok' }
    })
    await expect(
      probeReadiness(async () => {
        throw new Error('postgresql://user:secret@host/database Prisma P1001')
      })
    ).resolves.toEqual({ ready: false, status: { status: 'unavailable' } })
  })

  it('redacts secret fields and connection strings from operational logs', () => {
    expect(
      sanitizeLogValue({
        password: 'visible',
        nested: { handoffToken: 'visible', message: 'failed at postgresql://user:pass@host/db' }
      })
    ).toEqual({
      password: '[REDACTED]',
      nested: { handoffToken: '[REDACTED]', message: 'failed at [REDACTED_DATABASE_URL]' }
    })
  })

  it('generates server-side UUID request identifiers', () => {
    expect(createRequestId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('normalizes canonical URLs and noindexes catalog query variants', () => {
    expect(canonicalUrl('https://shop.example.com/', '/productos/')).toBe(
      'https://shop.example.com/productos'
    )
    expect(catalogRobots({})).toBe('index, follow')
    expect(catalogRobots({ search: 'ssd' })).toBe('noindex, follow')
  })

  it('rate limits repeated public handoff calls without acting as authorization', () => {
    for (let index = 0; index < 20; index += 1) {
      expect(() => enforcePublicAbuseRateLimit({} as never, 'handoff')).not.toThrow()
    }
    expect(() => enforcePublicAbuseRateLimit({} as never, 'handoff')).toThrow()
  })
})
