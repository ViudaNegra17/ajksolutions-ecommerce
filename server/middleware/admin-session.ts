import { validateAdminSession } from '../utils/admin-session'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (path.startsWith('/api/admin/')) {
    setResponseHeader(event, 'Cache-Control', 'no-store')
    await validateAdminSession(event, { touchActivity: true })
    return
  }
  if (path === '/api/_auth/session' && event.method === 'GET') {
    setResponseHeader(event, 'Cache-Control', 'no-store')
    await validateAdminSession(event, { allowAnonymous: true })
  }
})
