const REDACTED = '[REDACTED]'
const SENSITIVE_KEY =
  /password|passphrase|token|cookie|authorization|secret|session|handoff|checkoutsignature/i

export type LogLevel = 'info' | 'warn' | 'error'
export type OperationalLog = Record<string, unknown> & { level?: never; timestamp?: never }

export function sanitizeLogValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[REDACTED_DATABASE_URL]')
      .replace(/bearer\s+[a-z0-9._~-]+/gi, 'Bearer [REDACTED]')
  }
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return '[CIRCULAR]'
  seen.add(value)
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => sanitizeLogValue(item, seen))
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : sanitizeLogValue(item, seen)
    ])
  )
}

export function safeErrorDetails(error: unknown) {
  if (!(error instanceof Error)) return { name: 'UnknownError', message: 'Unexpected failure' }
  return { name: error.name, message: error.message.slice(0, 500) }
}

export function writeOperationalLog(level: LogLevel, fields: OperationalLog) {
  const line = JSON.stringify(sanitizeLogValue({ timestamp: new Date().toISOString(), level, ...fields }))
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.info(line)
}
