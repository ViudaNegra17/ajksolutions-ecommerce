import { auditService } from '../../services/audit.service'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const session = await getUserSession(event)
  try {
    if (session.user) {
      await auditService.record(event, {
        userId: session.user.id,
        action: 'LOGOUT',
        entity: 'User',
        entityId: session.user.id
      })
    }
  } finally {
    await clearUserSession(event)
  }
  return { success: true, data: { loggedOut: true } }
})
