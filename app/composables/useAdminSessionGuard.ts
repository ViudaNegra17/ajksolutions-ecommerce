import type { User, UserSession } from '#auth-utils'
import { ADMIN_SESSION_REVALIDATION_MS, shouldWarnAdminSession } from '#shared/utils/admin-session'

type SessionData = {
  user: User | null
  loggedInAt?: string
  lastActivityAt?: string
  lastValidatedAt?: string
  expiresAt?: string
  idleExpiresAt?: string
}

function responseStatus(error: unknown) {
  const value = error as { statusCode?: number; response?: { status?: number } }
  return value.statusCode || value.response?.status
}

export function useAdminSessionGuard() {
  const { session, clear } = useUserSession()
  const warningOpen = ref(false)
  const syncing = ref(false)
  let activityPending = false
  let lastLocalEventAt = 0
  let lastServerSyncAt = Date.now()
  let ending = false
  let timer: ReturnType<typeof setInterval> | undefined

  function applySession(data: SessionData) {
    session.value = { ...(session.value || {}), ...data } as UserSession
    lastServerSyncAt = Date.now()
  }

  async function redirectExpired() {
    if (ending) return
    ending = true
    warningOpen.value = false
    try {
      await clear()
    } catch {
      session.value = null
    }
    await navigateTo({ path: '/admin/login', query: { reason: 'session-expired' } })
  }

  async function synchronize(touch = false) {
    if (syncing.value || ending) return false
    syncing.value = true
    try {
      const response = await $fetch<{ success: true; data: SessionData }>(
        touch ? '/api/auth/session/touch' : '/api/auth/session',
        { method: touch ? 'POST' : 'GET', retry: 0 }
      )
      if (!response.data.user) {
        await redirectExpired()
        return false
      }
      applySession(response.data)
      if (touch) activityPending = false
      warningOpen.value = shouldWarnAdminSession(response.data as Required<SessionData>)
      return true
    } catch (error) {
      if (responseStatus(error) === 401 || deadlinePassed()) await redirectExpired()
      return false
    } finally {
      syncing.value = false
    }
  }

  function deadlinePassed(now = Date.now()) {
    const absolute = Date.parse(session.value?.expiresAt || '')
    const idle = Date.parse(session.value?.idleExpiresAt || '')
    const deadline = Math.min(absolute, idle)
    return Number.isFinite(deadline) && now >= deadline
  }

  function recordActivity() {
    const now = Date.now()
    if (now - lastLocalEventAt < 1000) return
    lastLocalEventAt = now
    activityPending = true
  }

  async function tick() {
    if (ending || document.visibilityState === 'hidden') return
    const metadata = session.value
    if (deadlinePassed()) {
      await synchronize(false)
      return
    }
    if (metadata?.expiresAt && metadata.idleExpiresAt && shouldWarnAdminSession(metadata)) {
      if (activityPending) await synchronize(true)
      else warningOpen.value = true
    } else {
      warningOpen.value = false
    }
    if (Date.now() - lastServerSyncAt >= ADMIN_SESSION_REVALIDATION_MS) {
      await synchronize(activityPending)
    }
  }

  async function continueSession() {
    await synchronize(true)
  }

  async function logoutNow() {
    if (ending) return
    ending = true
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    await clear().catch(() => {
      session.value = null
    })
    await navigateTo('/admin/login')
  }

  async function handleVisibility() {
    if (document.visibilityState !== 'visible') return
    if (Date.now() - lastServerSyncAt >= ADMIN_SESSION_REVALIDATION_MS) {
      await synchronize(activityPending)
    } else {
      await tick()
    }
  }

  onMounted(() => {
    for (const eventName of ['pointerdown', 'keydown', 'touchstart']) {
      window.addEventListener(eventName, recordActivity, { passive: true })
    }
    window.addEventListener('scroll', recordActivity, { passive: true, capture: true })
    document.addEventListener('visibilitychange', handleVisibility)
    timer = setInterval(tick, 1000)
    void tick()
  })

  onBeforeUnmount(() => {
    for (const eventName of ['pointerdown', 'keydown', 'touchstart']) {
      window.removeEventListener(eventName, recordActivity)
    }
    window.removeEventListener('scroll', recordActivity, { capture: true })
    document.removeEventListener('visibilitychange', handleVisibility)
    if (timer) clearInterval(timer)
  })

  return { warningOpen, syncing, continueSession, logoutNow }
}
