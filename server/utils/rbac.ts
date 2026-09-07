import type { H3Event } from 'h3'
import type { PermissionCode } from '../../shared/constants/permissions'
import { authService } from '../services/auth.service'

export async function requirePermission(event: H3Event, permission: PermissionCode) {
  const session = await requireUserSession(event)
  const user = await authService.resolveActiveUser(session.user.id)

  if (!user) {
    await clearUserSession(event)
    throw apiError(401, 'AUTH_SESSION_INVALID', 'La sesión ya no es válida.')
  }

  if (user.roles.includes('SUPER_ADMIN') || user.permissions.includes(permission)) {
    if (
      JSON.stringify(session.user.roles) !== JSON.stringify(user.roles) ||
      JSON.stringify(session.user.permissions) !== JSON.stringify(user.permissions)
    ) {
      await setUserSession(event, { user, loggedInAt: session.loggedInAt })
    }
    return { ...session, user }
  }
  throw apiError(403, 'AUTH_FORBIDDEN', 'No tienes permiso para realizar esta acción.')
}
