import { adminSessionMetadata, validateAdminSession } from '../../../utils/admin-session'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const session = await validateAdminSession(event, { touchActivity: true })
  return { success: true, data: { user: session!.user, ...adminSessionMetadata(session!) } }
})
