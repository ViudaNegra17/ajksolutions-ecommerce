import { appendResponseHeader } from 'h3'

export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin') || to.path === '/admin/login') return
  const { loggedIn, session } = useUserSession()
  const serverEvent = import.meta.server ? useRequestEvent() : null
  try {
    const response = await useRequestFetch()<{
      success: true
      data: Record<string, unknown> & { user: unknown }
    }>('/api/auth/session/touch', {
      method: 'POST',
      retry: 0,
      onResponse({ response }) {
        if (!serverEvent) return
        for (const cookie of response.headers.getSetCookie()) {
          appendResponseHeader(serverEvent, 'Set-Cookie', cookie)
        }
      }
    })
    if (!response.data.user) throw new Error('AUTH_REQUIRED')
    session.value = { ...(session.value || {}), ...response.data } as typeof session.value
  } catch (error: unknown) {
    const value = error as { data?: { data?: { error?: { code?: string } } } }
    const expired = value.data?.data?.error?.code === 'AUTH_SESSION_EXPIRED'
    return navigateTo({
      path: '/admin/login',
      query: expired ? { reason: 'session-expired' } : { redirect: to.fullPath }
    })
  }
  if (!loggedIn.value) return navigateTo({ path: '/admin/login', query: { redirect: to.fullPath } })
})
