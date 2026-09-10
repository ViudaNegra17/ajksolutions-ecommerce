export const ADMIN_SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000
export const ADMIN_SESSION_IDLE_MS = 30 * 60 * 1000
export const ADMIN_SESSION_WARNING_MS = 2 * 60 * 1000
export const ADMIN_SESSION_REVALIDATION_MS = 5 * 60 * 1000
export const ADMIN_SESSION_TOUCH_THROTTLE_MS = 60 * 1000

export type AdminSessionExpiryReason = 'absolute' | 'idle' | 'invalid'
export type AdminSessionTimeline = {
  valid: boolean
  reason: AdminSessionExpiryReason | null
  loggedInAt: string
  lastActivityAt: string
  expiresAt: string
  idleExpiresAt: string
  warningAt: string
}

function parseTimestamp(value: unknown) {
  return typeof value === 'string' ? Date.parse(value) : Number.NaN
}

export function evaluateAdminSession(
  session: { loggedInAt?: unknown; lastActivityAt?: unknown },
  now = Date.now()
): AdminSessionTimeline {
  const loggedInAtMs = parseTimestamp(session.loggedInAt)
  const explicitActivityMs = parseTimestamp(session.lastActivityAt)
  const lastActivityAtMs = Number.isFinite(explicitActivityMs) ? explicitActivityMs : loggedInAtMs
  const validTimestamps =
    Number.isFinite(loggedInAtMs) &&
    Number.isFinite(lastActivityAtMs) &&
    loggedInAtMs <= now &&
    lastActivityAtMs >= loggedInAtMs &&
    lastActivityAtMs <= now
  const expiresAtMs = loggedInAtMs + ADMIN_SESSION_ABSOLUTE_MS
  const idleExpiresAtMs = lastActivityAtMs + ADMIN_SESSION_IDLE_MS
  const reason: AdminSessionExpiryReason | null = !validTimestamps
    ? 'invalid'
    : now >= expiresAtMs
      ? 'absolute'
      : now >= idleExpiresAtMs
        ? 'idle'
        : null
  return {
    valid: reason === null,
    reason,
    loggedInAt: new Date(Number.isFinite(loggedInAtMs) ? loggedInAtMs : 0).toISOString(),
    lastActivityAt: new Date(Number.isFinite(lastActivityAtMs) ? lastActivityAtMs : 0).toISOString(),
    expiresAt: new Date(Number.isFinite(expiresAtMs) ? expiresAtMs : 0).toISOString(),
    idleExpiresAt: new Date(Number.isFinite(idleExpiresAtMs) ? idleExpiresAtMs : 0).toISOString(),
    warningAt: new Date(
      Number.isFinite(idleExpiresAtMs) ? idleExpiresAtMs - ADMIN_SESSION_WARNING_MS : 0
    ).toISOString()
  }
}

export function shouldWarnAdminSession(
  metadata: Pick<AdminSessionTimeline, 'expiresAt' | 'idleExpiresAt'>,
  now = Date.now()
) {
  const expiry = Date.parse(metadata.idleExpiresAt)
  return Number.isFinite(expiry) && now >= expiry - ADMIN_SESSION_WARNING_MS && now < expiry
}

export function adminSessionMaxAgeSeconds(expiresAt: string, now = Date.now()) {
  return Math.max(1, Math.ceil((Date.parse(expiresAt) - now) / 1000))
}
