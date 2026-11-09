import { describe, expect, it } from 'vitest'
import type { PublicSettings } from '../../shared/types/public-catalog'
import { homeStructuredData } from '../../shared/utils/seo'
import { serializeJsonLd } from '../../shared/utils/public-catalog'

const settings: PublicSettings = {
  business: {
    name: 'Negocio configurado',
    phone: '+593991234567',
    whatsapp: '+593987654321',
    email: 'contacto@example.test',
    address: 'Dirección configurada',
    city: 'Guayaquil'
  },
  currency: 'USD',
  country: 'EC',
  seo: { siteName: 'Sitio configurado', title: 'Título configurado', description: 'Descripción configurada' },
  social: { facebook: 'https://facebook.com/example', instagram: 'https://instagram.com/example' }
}

describe('Organization y WebSite de Home', () => {
  it('usa los settings reales, URLs absolutas y un publisher coherente', () => {
    const original = structuredClone(settings)
    const [organization, website] = homeStructuredData(settings, 'https://store.example.test/')
    expect(organization).toMatchObject({
      ['@context']: 'https://schema.org',
      ['@type']: 'Organization',
      ['@id']: 'https://store.example.test/#organization',
      name: settings.business.name,
      url: 'https://store.example.test/',
      logo: 'https://store.example.test/ajksolutions-official.png',
      telephone: settings.business.phone,
      email: settings.business.email,
      address: {
        ['@type']: 'PostalAddress',
        streetAddress: settings.business.address,
        addressLocality: settings.business.city,
        addressCountry: settings.country
      },
      sameAs: [settings.social.facebook, settings.social.instagram]
    })
    expect(website).toMatchObject({
      ['@context']: 'https://schema.org',
      ['@type']: 'WebSite',
      ['@id']: 'https://store.example.test/#website',
      name: settings.seo.siteName,
      url: organization!.url,
      publisher: { ['@id']: organization!['@id'] },
      description: settings.seo.description
    })
    expect(settings).toEqual(original)
  })

  it('omite opciones ausentes y no inventa domicilio, redes ni acciones', () => {
    const minimal = structuredClone(settings)
    minimal.business = { name: 'Real', phone: null, whatsapp: ' ', email: '', address: null, city: null }
    minimal.social = { facebook: null, instagram: '' }
    minimal.seo.description = null
    const [organization, website] = homeStructuredData(minimal, 'https://store.example.test')
    for (const key of ['telephone', 'email', 'address', 'sameAs'])
      expect(organization).not.toHaveProperty(key)
    expect(website).not.toHaveProperty('description')
    expect(website).not.toHaveProperty('potentialAction')
    expect(JSON.stringify([organization, website])).not.toContain('null')
    expect(JSON.stringify([organization, website])).not.toContain('""')
  })

  it('permite localidad y país reales sin calle y usa WhatsApp como contacto alternativo', () => {
    const value = structuredClone(settings)
    value.business.address = null
    value.business.phone = null
    const [organization] = homeStructuredData(value, 'https://store.example.test')
    expect(organization).toHaveProperty('telephone', value.business.whatsapp)
    expect(organization).toHaveProperty('address.addressLocality', value.business.city)
    expect(organization).not.toHaveProperty('address.streetAddress')
  })

  it.each(['javascript:marker', '/perfil', 'invalid', 'https://user:secret@example.test/profile'])(
    'omite la red inválida %s',
    (invalid) => {
      const value = structuredClone(settings)
      value.social = { facebook: invalid, instagram: null }
      expect(homeStructuredData(value, 'https://store.example.test')[0]).not.toHaveProperty('sameAs')
    }
  )

  it.each([
    '</script><script>marker</script>',
    '</script><script>globalThis.__phase9JsonLdProbe=true</script><script type="application/ld+json">'
  ])('mantiene el marcador como dato y neutraliza cierre de script %s', (marker) => {
    const value = structuredClone(settings)
    value.business.name = marker
    value.seo.description = marker
    const schemas = homeStructuredData(value, 'https://store.example.test')
    const serialized = schemas.map(serializeJsonLd)
    for (const json of serialized) {
      expect(json).not.toContain('<')
      expect(() => JSON.parse(json)).not.toThrow()
    }
    const html = serialized.map((json) => `<script type="application/ld+json">${json}</script>`).join('')
    const dom = new DOMParser().parseFromString(html, 'text/html')
    expect(dom.querySelectorAll('script')).toHaveLength(2)
    expect(dom.querySelectorAll('script:not([type="application/ld+json"])')).toHaveLength(0)
    expect(JSON.parse(dom.querySelector('script')!.textContent!)['name']).toBe(marker)
  })
})
