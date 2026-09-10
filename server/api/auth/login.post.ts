import { loginSchema } from '#shared/schemas/auth.schema'
import { ADMIN_SESSION_ABSOLUTE_MS } from '#shared/utils/admin-session'
import { auditService } from '../../services/audit.service'
import { authService } from '../../services/auth.service'
import { clearLoginRateLimit, enforceLoginRateLimit } from '../../utils/login-rate-limit'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  enforceLoginRateLimit(event)
  const body = await readBody(event)
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    throw apiError(422, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Datos inválidos')
  }

  const user = await authService.authenticate(parsed.data)
  if (!user) {
    await auditService.record(event, { action: 'LOGIN_FAILED', entity: 'User' })
    throw apiError(401, 'AUTH_INVALID_CREDENTIALS', 'Credenciales incorrectas')
  }

  await auditService.record(event, {
    userId: user.id,
    action: 'LOGIN_SUCCESS',
    entity: 'User',
    entityId: user.id
  })
  const now = new Date().toISOString()
  await setUserSession(
    event,
    { user, loggedInAt: now, lastActivityAt: now, lastValidatedAt: now },
    { maxAge: ADMIN_SESSION_ABSOLUTE_MS / 1000 }
  )
  clearLoginRateLimit(event)

  return { success: true, data: { user } }
})
