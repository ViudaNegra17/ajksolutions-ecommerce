import type { H3Event } from 'h3'
import type { PermissionCode } from '../../shared/constants/permissions'
import { requireValidatedAdminSession } from './admin-session'

export async function requirePermission(event: H3Event, permission: PermissionCode) {
  const session = await requireValidatedAdminSession(event)
  const { user } = session

  if (user.roles.includes('SUPER_ADMIN') || user.permissions.includes(permission)) {
    return session
  }
  throw apiError(403, 'AUTH_FORBIDDEN', 'No tienes permiso para realizar esta acción.')
}
