import { buildSecurityHeaders } from '../utils/security-headers'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const headers = buildSecurityHeaders({
    production: process.env.NODE_ENV === 'production',
    appUrl: String(config.public.appUrl)
  })
  for (const [name, value] of Object.entries(headers)) setHeader(event, name, value)
})
