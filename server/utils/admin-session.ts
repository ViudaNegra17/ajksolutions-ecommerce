import type { H3Event } from 'h3'
import type { UserSession } from '#auth-utils'
import type { SafeUser } from '#shared/schemas/user.schema'
import {
  ADMIN_SESSION_REVALIDATION_MS,
  ADMIN_SESSION_TOUCH_THROTTLE_MS,
  adminSessionMaxAgeSeconds,
  evaluateAdminSession
} from '#shared/utils/admin-session'
import { authService } from '../services/auth.service'
import { apiError } from './api-error'

export type ValidatedAdminSession = UserSession & {
  user: SafeUser
  loggedInAt: string
  lastActivityAt: string
  lastValidatedAt: string
  expiresAt: string
  idleExpiresAt: string
}
type ValidationOptions = { allowAnonymous?: boolean; touchActivity?: boolean; now?: number }
type AdminEventContext = H3Event['context'] & { validatedAdminSession?: ValidatedAdminSession }

function sessionError(reason: 'expired' | 'invalid') {
  return apiError(
    401,
    reason === 'expired' ? 'AUTH_SESSION_EXPIRED' : 'AUTH_SESSION_INVALID',
    reason === 'expired'
      ? 'La sesión administrativa expiró. Inicia sesión nuevamente.'
      : 'La sesión administrativa ya no es válida.'
  )
}

export function adminSessionMetadata(session: ValidatedAdminSession) {
  return {
    loggedInAt: session.loggedInAt,
    lastActivityAt: session.lastActivityAt,
    lastValidatedAt: session.lastValidatedAt,
    expiresAt: session.expiresAt,
    idleExpiresAt: session.idleExpiresAt
  }
}

export async function validateAdminSession(
  event: H3Event,
  options: ValidationOptions = {}
): Promise<ValidatedAdminSession | null> {
  const now = options.now ?? Date.now()
  const session = await getUserSession(event)
  if (!session.user) {
    if (options.allowAnonymous) return null
    throw apiError(401, 'AUTH_REQUIRED', 'Debes iniciar sesión para continuar.')
  }
  const timeline = evaluateAdminSession(session, now)
  if (!timeline.valid) {
    await clearUserSession(event)
    throw sessionError(timeline.reason === 'absolute' || timeline.reason === 'idle' ? 'expired' : 'invalid')
  }
  const user = await authService.resolveActiveUser(session.user.id)
  if (!user) {
    await clearUserSession(event)
    throw sessionError('invalid')
  }
  const validatedAtMs = Date.parse(typeof session.lastValidatedAt === 'string' ? session.lastValidatedAt : '')
  const touchActivity =
    options.touchActivity === true &&
    now - Date.parse(timeline.lastActivityAt) >= ADMIN_SESSION_TOUCH_THROTTLE_MS
  const refreshValidation =
    !Number.isFinite(validatedAtMs) || now - validatedAtMs >= ADMIN_SESSION_REVALIDATION_MS
  const changedUser = JSON.stringify(session.user) !== JSON.stringify(user)
  const lastActivityAt = touchActivity ? new Date(now).toISOString() : timeline.lastActivityAt
  const lastValidatedAt =
    refreshValidation || changedUser ? new Date(now).toISOString() : session.lastValidatedAt
  const refreshed = evaluateAdminSession({ loggedInAt: timeline.loggedInAt, lastActivityAt }, now)
  const result: ValidatedAdminSession = {
    ...session,
    user,
    loggedInAt: timeline.loggedInAt,
    lastActivityAt,
    lastValidatedAt,
    expiresAt: refreshed.expiresAt,
    idleExpiresAt: refreshed.idleExpiresAt
  }
  if (
    touchActivity ||
    refreshValidation ||
    changedUser ||
    session.lastActivityAt !== timeline.lastActivityAt
  ) {
    await setUserSession(
      event,
      {
        user,
        loggedInAt: result.loggedInAt,
        lastActivityAt: result.lastActivityAt,
        lastValidatedAt: result.lastValidatedAt
      },
      { maxAge: adminSessionMaxAgeSeconds(result.expiresAt, now) }
    )
  }
  ;(event.context as AdminEventContext).validatedAdminSession = result
  return result
}

export async function requireValidatedAdminSession(event: H3Event) {
  return (
    (event.context as AdminEventContext).validatedAdminSession ||
    (await validateAdminSession(event, { touchActivity: true }))!
  )
}
