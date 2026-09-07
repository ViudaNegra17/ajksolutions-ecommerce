import { authService } from '../../services/auth.service'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const session = await getUserSession(event)
  if (!session.user) return { success: true, data: { user: null } }

  const user = await authService.resolveActiveUser(session.user.id)
  if (!user) {
    await clearUserSession(event)
    return { success: true, data: { user: null } }
  }

  if (
    JSON.stringify(session.user.roles) !== JSON.stringify(user.roles) ||
    JSON.stringify(session.user.permissions) !== JSON.stringify(user.permissions)
  ) {
    await setUserSession(event, { user, loggedInAt: session.loggedInAt })
  }

  return { success: true, data: { user } }
})
