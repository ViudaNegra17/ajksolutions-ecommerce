const SECRET_MIN_LENGTH = 32

export type ProductionEnvironment = Record<string, string | undefined>

export const CRITICAL_PRODUCTION_VARIABLES = [
  'DATABASE_URL',
  'NUXT_SESSION_PASSWORD',
  'NUXT_CHECKOUT_SIGNING_SECRET',
  'NUXT_ORDER_HANDOFF_SECRET',
  'NUXT_PUBLIC_APP_URL'
] as const

function isWeakSecret(value: string) {
  return (
    value.length < SECRET_MIN_LENGTH ||
    /^(replace|change|default|secret|password|development|test)/i.test(value) ||
    /placeholder|example|changeme/i.test(value)
  )
}

export function normalizeAppUrl(value: string) {
  return value.replace(/\/+$/, '')
}

export function validateProductionEnvironment(env: ProductionEnvironment) {
  if (env.NODE_ENV !== 'production') return

  const missing = CRITICAL_PRODUCTION_VARIABLES.filter((key) => !env[key]?.trim())
  if (missing.length) {
    throw new Error(`Production configuration is incomplete: missing ${missing.join(', ')}`)
  }

  const appUrl = new URL(env.NUXT_PUBLIC_APP_URL!)
  if (appUrl.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1'].includes(appUrl.hostname)) {
    throw new Error('Production configuration is invalid: NUXT_PUBLIC_APP_URL must be a public HTTPS URL')
  }
  if (appUrl.username || appUrl.password || (appUrl.pathname !== '/' && appUrl.pathname !== '')) {
    throw new Error(
      'Production configuration is invalid: NUXT_PUBLIC_APP_URL must be an origin without credentials or path'
    )
  }

  const databaseUrl = new URL(env.DATABASE_URL!)
  if (!['postgresql:', 'postgres:'].includes(databaseUrl.protocol)) {
    throw new Error('Production configuration is invalid: DATABASE_URL must use PostgreSQL')
  }

  const secretNames = [
    'NUXT_SESSION_PASSWORD',
    'NUXT_CHECKOUT_SIGNING_SECRET',
    'NUXT_ORDER_HANDOFF_SECRET'
  ] as const
  const secrets = secretNames.map((name) => env[name]!)
  for (const [index, secret] of secrets.entries()) {
    if (isWeakSecret(secret)) {
      throw new Error(`Production configuration is invalid: ${secretNames[index]} is weak`)
    }
  }
  if (new Set(secrets).size !== secrets.length) {
    throw new Error('Production configuration is invalid: security secrets must be independent')
  }
}
