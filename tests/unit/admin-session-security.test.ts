import { readFileSync } from 'node:fs'
import type { H3Event } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ADMIN_SESSION_ABSOLUTE_MS,
  ADMIN_SESSION_IDLE_MS,
  ADMIN_SESSION_WARNING_MS,
  adminSessionMaxAgeSeconds,
  evaluateAdminSession,
  shouldWarnAdminSession
} from '../../shared/utils/admin-session'
import { authService } from '../../server/services/auth.service'
import { validateAdminSession } from '../../server/utils/admin-session'

vi.mock('../../server/services/auth.service', () => ({
  authService: { resolveActiveUser: vi.fn() }
}))

const now = Date.parse('2026-09-10T12:00:00.000Z')
const user = {
  id: '00000000-0000-4000-8000-000000000001',
  firstName: 'Admin',
  lastName: 'AJK',
  email: 'admin@example.com',
  roles: ['ADMIN'],
  permissions: ['dashboard.view']
}

function iso(time: number) {
  return new Date(time).toISOString()
}

function event() {
  return { context: {} } as H3Event
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-id',
    user,
    loggedInAt: iso(now - 60 * 60 * 1000),
    lastActivityAt: iso(now - 2 * 60 * 1000),
    lastValidatedAt: iso(now - 6 * 60 * 1000),
    ...overrides
  }
}

describe('política temporal administrativa', () => {
  it('acepta una sesión vigente y calcula ambos límites', () => {
    const result = evaluateAdminSession(session(), now)
    expect(result.valid).toBe(true)
    expect(Date.parse(result.expiresAt)).toBe(now - 60 * 60 * 1000 + ADMIN_SESSION_ABSOLUTE_MS)
    expect(Date.parse(result.idleExpiresAt)).toBe(now - 2 * 60 * 1000 + ADMIN_SESSION_IDLE_MS)
  })

  it('migra de forma compatible una sesión anterior usando loggedInAt como actividad', () => {
    const result = evaluateAdminSession({ loggedInAt: iso(now - 1000) }, now)
    expect(result.valid).toBe(true)
    expect(result.lastActivityAt).toBe(iso(now - 1000))
  })

  it('rechaza el límite absoluto aunque haya actividad reciente', () => {
    const result = evaluateAdminSession(
      { loggedInAt: iso(now - ADMIN_SESSION_ABSOLUTE_MS), lastActivityAt: iso(now - 1000) },
      now
    )
    expect(result).toMatchObject({ valid: false, reason: 'absolute' })
  })

  it('rechaza 30 minutos de inactividad', () => {
    const result = evaluateAdminSession(
      { loggedInAt: iso(now - 60 * 60 * 1000), lastActivityAt: iso(now - ADMIN_SESSION_IDLE_MS) },
      now
    )
    expect(result).toMatchObject({ valid: false, reason: 'idle' })
  })

  it('activa el aviso durante los dos minutos previos del límite idle', () => {
    const metadata = evaluateAdminSession(
      {
        loggedInAt: iso(now - 60 * 60 * 1000),
        lastActivityAt: iso(now - ADMIN_SESSION_IDLE_MS + ADMIN_SESSION_WARNING_MS - 1000)
      },
      now
    )
    expect(shouldWarnAdminSession(metadata, now)).toBe(true)
  })

  it('limita la renovación del cookie al tiempo absoluto restante', () => {
    expect(adminSessionMaxAgeSeconds(iso(now + 90_500), now)).toBe(91)
  })
})

describe('autoridad de sesión en servidor', () => {
  const getSession = vi.fn()
  const setSession = vi.fn()
  const clearSession = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('getUserSession', getSession)
    vi.stubGlobal('setUserSession', setSession)
    vi.stubGlobal('clearUserSession', clearSession)
    vi.mocked(authService.resolveActiveUser).mockResolvedValue(user)
    getSession.mockResolvedValue(session())
  })

  it('revalida una sesión vigente y registra la validación', async () => {
    const result = await validateAdminSession(event(), { now })
    expect(result?.user).toEqual(user)
    expect(authService.resolveActiveUser).toHaveBeenCalledWith(user.id)
    expect(setSession).toHaveBeenCalledOnce()
  })

  it('limpia y rechaza expiraciones absolutas e idle antes de entregar datos', async () => {
    for (const overrides of [
      { loggedInAt: iso(now - ADMIN_SESSION_ABSOLUTE_MS), lastActivityAt: iso(now - 1000) },
      { lastActivityAt: iso(now - ADMIN_SESSION_IDLE_MS) }
    ]) {
      getSession.mockResolvedValueOnce(session(overrides))
      await expect(validateAdminSession(event(), { now })).rejects.toMatchObject({ statusCode: 401 })
    }
    expect(clearSession).toHaveBeenCalledTimes(2)
  })

  it('invalida un usuario desactivado o eliminado', async () => {
    vi.mocked(authService.resolveActiveUser).mockResolvedValueOnce(null)
    await expect(validateAdminSession(event(), { now })).rejects.toMatchObject({ statusCode: 401 })
    expect(clearSession).toHaveBeenCalledOnce()
  })

  it('persiste roles y permisos actuales obtenidos desde DB', async () => {
    const refreshed = { ...user, roles: ['SALES'], permissions: ['orders.view'] }
    vi.mocked(authService.resolveActiveUser).mockResolvedValueOnce(refreshed)
    const result = await validateAdminSession(event(), { now })
    expect(result?.user).toEqual(refreshed)
    expect(setSession.mock.calls[0]?.[1]).toMatchObject({ user: refreshed })
  })

  it('touch actualiza actividad con throttling y mantiene el tope absoluto', async () => {
    const result = await validateAdminSession(event(), { now, touchActivity: true })
    expect(result?.lastActivityAt).toBe(iso(now))
    expect(setSession.mock.calls[0]?.[2].maxAge).toBeLessThanOrEqual(7 * 60 * 60)
  })

  it('mantiene auth y admin fuera del caché', () => {
    const middleware = readFileSync('server/middleware/private-cache.ts', 'utf8')
    const sessionEndpoint = readFileSync('server/api/auth/session.get.ts', 'utf8')
    expect(middleware).toMatch(/path\.startsWith\('\/api\/admin'\)/)
    expect(middleware).toMatch(/path\.startsWith\('\/api\/auth'\)/)
    expect(middleware).toMatch(/path\.startsWith\('\/api\/_auth'\)/)
    expect(sessionEndpoint).toMatch(/'Cache-Control', 'no-store'/)
  })
})
