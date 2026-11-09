import type { PublicSettings } from '../types/public-catalog'

export function canonicalUrl(appUrl: string, path: string) {
  const base = appUrl.replace(/\/+$/, '')
  const normalizedPath = path === '/' ? '/' : `/${path.replace(/^\/+|\/+$/g, '')}`
  return `${base}${normalizedPath}`
}

export function catalogRobots(query: Record<string, unknown>) {
  return Object.values(query).some((value) => value !== undefined && value !== '' && value !== null)
    ? 'noindex, follow'
    : 'index, follow'
}

export function homeStructuredData(settings: PublicSettings, appUrl: string) {
  const url = canonicalUrl(appUrl, '/')
  const organizationId = `${url}#organization`
  const phone = settings.business.phone?.trim() || settings.business.whatsapp?.trim()
  const email = settings.business.email?.trim()
  const street = settings.business.address?.trim()
  const city = settings.business.city?.trim()
  const country = settings.country.trim()
  const sameAs = [
    ...new Set(
      [settings.social.facebook, settings.social.instagram]
        .filter((value): value is string => {
          if (!value?.trim()) return false
          try {
            const social = new URL(value)
            return ['https:', 'http:'].includes(social.protocol) && !social.username && !social.password
          } catch {
            return false
          }
        })
        .map((value) => value.trim())
    )
  ]
  return [
    {
      ['@context']: 'https://schema.org',
      ['@type']: 'Organization',
      ['@id']: organizationId,
      name: settings.business.name,
      url,
      logo: canonicalUrl(appUrl, '/ajksolutions-official.png'),
      ...(email ? { email } : {}),
      ...(phone ? { telephone: phone } : {}),
      ...(street || city
        ? {
            address: {
              ['@type']: 'PostalAddress',
              ...(street ? { streetAddress: street } : {}),
              ...(city ? { addressLocality: city } : {}),
              ...(country ? { addressCountry: country } : {})
            }
          }
        : {}),
      ...(sameAs.length ? { sameAs } : {})
    },
    {
      ['@context']: 'https://schema.org',
      ['@type']: 'WebSite',
      ['@id']: `${url}#website`,
      url,
      name: settings.seo.siteName,
      ...(settings.seo.description?.trim() ? { description: settings.seo.description } : {}),
      publisher: { ['@id']: organizationId }
    }
  ]
}
