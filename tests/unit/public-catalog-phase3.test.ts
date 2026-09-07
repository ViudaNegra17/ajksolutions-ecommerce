import { describe, expect, it } from 'vitest'
import { publicProductQuerySchema } from '../../shared/schemas/public-catalog.schema'
import type { PublicProductDetail } from '../../shared/types/public-catalog'
import {
  availabilityLabel,
  availabilitySchemaUrl,
  buildBreadcrumbStructuredData,
  buildProductStructuredData,
  createPublicAvailability,
  formatCurrency,
  parseAttributeFilterExpression,
  seoFallback,
  serializeDecimal,
  serializeJsonLd
} from '../../shared/utils/public-catalog'

const detail: PublicProductDetail = {
  productCode: 'PRD-000001',
  sku: 'SKU-1',
  name: 'Equipo profesional',
  slug: 'equipo-profesional',
  shortDescription: 'Equipo para empresas',
  description: 'Descripción',
  warranty: null,
  metaTitle: null,
  metaDescription: null,
  featured: false,
  brand: { name: 'Marca', slug: 'marca' },
  category: { name: 'Equipos', slug: 'equipos' },
  image: null,
  images: [],
  specifications: [],
  variants: [],
  price: {
    mode: 'FIXED',
    amount: '115.00',
    net: '100.00',
    tax: '15.00',
    currency: 'USD',
    taxIncludedInDisplayedPrice: true
  },
  availability: createPublicAvailability(2, false, null),
  breadcrumbs: [
    { name: 'Inicio', path: '/' },
    { name: 'Equipo profesional', path: '/productos/equipo-profesional' }
  ]
}

describe('portal público de Fase 3', () => {
  it('formatea moneda con Intl y serializa decimales consistentemente', () => {
    expect(formatCurrency('100.00', 'USD')).toContain('100')
    expect(formatCurrency(null, 'USD')).toBe('Consultar precio')
    expect(serializeDecimal({ toFixed: () => '19.90' })).toBe('19.90')
  })

  it('limita paginación y valida orden y rangos', () => {
    expect(publicProductQuerySchema.parse({}).pageSize).toBe(24)
    expect(publicProductQuerySchema.safeParse({ pageSize: 61 }).success).toBe(false)
    expect(publicProductQuerySchema.safeParse({ sort: 'price-asc' }).success).toBe(true)
    expect(publicProductQuerySchema.safeParse({ minPrice: '200', maxPrice: '100' }).success).toBe(false)
  })

  it('interpreta filtros dinámicos sin hardcodear atributos', () => {
    expect(parseAttributeFilterExpression('ram:16gb|32gb,almacenamiento:512gb')).toEqual([
      { slug: 'ram', values: ['16gb', '32gb'] },
      { slug: 'almacenamiento', values: ['512gb'] }
    ])
    expect(() => parseAttributeFilterExpression('ram')).toThrow()
    expect(() => parseAttributeFilterExpression('ram:16gb,ram:32gb')).toThrow()
  })

  it('mapea disponibilidad comercial y Schema.org', () => {
    expect(createPublicAvailability(1, true, 3).source).toBe('OWN_STOCK')
    expect(createPublicAvailability(0, true, 3).source).toBe('SUPPLIER_STOCK')
    expect(createPublicAvailability(0, false, null).source).toBe('OUT_OF_STOCK')
    expect(availabilityLabel('SUPPLIER_STOCK')).toContain('bajo pedido')
    expect(availabilitySchemaUrl('SUPPLIER_STOCK')).toBe('https://schema.org/BackOrder')
  })

  it('crea Product JSON-LD con Offer real para FIXED', () => {
    const schema = buildProductStructuredData(detail, 'https://example.com/productos/equipo-profesional')
    expect(schema).toMatchObject({
      sku: 'SKU-1',
      offers: { price: '115.00', priceCurrency: 'USD' }
    })
    expect(schema).toHaveProperty('@type', 'Product')
  })

  it('omite Offer y precio ficticio para CONTACT', () => {
    const contact: PublicProductDetail = {
      ...detail,
      price: {
        mode: 'CONTACT',
        amount: null,
        net: null,
        tax: null,
        currency: 'USD',
        taxIncludedInDisplayedPrice: false
      }
    }
    const schema = buildProductStructuredData(contact, 'https://example.com/productos/equipo-profesional')
    expect(schema).not.toHaveProperty('offers')
    expect(JSON.stringify(schema)).not.toContain('"price":0')
  })

  it('genera breadcrumbs, fallbacks SEO y JSON-LD resistente a cierre de script', () => {
    const breadcrumbs = buildBreadcrumbStructuredData(detail.breadcrumbs, 'https://example.com')
    expect(breadcrumbs.itemListElement).toHaveLength(2)
    expect(seoFallback(null, 'Descripción corta', 'Fallback')).toBe('Descripción corta')
    expect(serializeJsonLd({ value: '</script>' })).not.toContain('</script>')
  })
})
