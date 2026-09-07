/* eslint-disable @stylistic/quote-props -- schema.org requiere claves con @ y Prettier normaliza las demás. */
import type {
  PublicAvailability,
  PublicAvailabilitySource,
  PublicProductCard,
  PublicProductDetail
} from '../types/public-catalog'

export type PublicProductAction = 'ADD_TO_CART' | 'BUY_NOW' | 'CONTACT' | 'VIEW'

export function resolvePublicProductAction(
  product: Pick<PublicProductCard, 'productType' | 'price' | 'availability' | 'hasVariants'>
): PublicProductAction {
  if (product.price.mode === 'CONTACT') return 'CONTACT'
  if (product.productType === 'DIGITAL') return 'BUY_NOW'
  return product.availability.available && !product.hasVariants ? 'ADD_TO_CART' : 'VIEW'
}

export function formatCurrency(amount: string | number | null, currency = 'USD', locale = 'es-EC') {
  if (amount == null) return 'Consultar precio'
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(amount))
}

export function serializeDecimal(value: { toFixed(digits: number): string } | string | number | null) {
  if (value == null) return null
  return typeof value === 'object' ? value.toFixed(2) : Number(value).toFixed(2)
}

export function availabilityLabel(source: PublicAvailabilitySource) {
  if (source === 'DIGITAL') return 'Entrega digital'
  if (source === 'OWN_STOCK') return 'Disponible · entrega inmediata'
  if (source === 'SUPPLIER_STOCK') return 'Disponible bajo pedido'
  return 'Agotado'
}

export function availabilitySchemaUrl(source: PublicAvailabilitySource) {
  if (source === 'DIGITAL') return 'https://schema.org/InStock'
  if (source === 'OWN_STOCK') return 'https://schema.org/InStock'
  if (source === 'SUPPLIER_STOCK') return 'https://schema.org/BackOrder'
  return 'https://schema.org/OutOfStock'
}

export function seoFallback(
  preferred: string | null | undefined,
  fallback: string | null | undefined,
  finalFallback: string
) {
  return preferred?.trim() || fallback?.trim() || finalFallback
}

export function buildProductStructuredData(product: PublicProductDetail, canonical: string) {
  const result: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    url: canonical,
    description: product.metaDescription || product.shortDescription || product.description || undefined,
    image: product.images.map((image) => image.url),
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined
  }
  if (product.price.mode === 'FIXED' && product.price.amount) {
    result.offers = {
      '@type': 'Offer',
      price: product.price.amount,
      priceCurrency: product.price.currency,
      availability: availabilitySchemaUrl(product.availability.source),
      url: canonical
    }
  }
  return result
}

export function buildBreadcrumbStructuredData(items: Array<{ name: string; path: string }>, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: new URL(item.path, baseUrl).toString()
    }))
  }
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}

export function createPublicAvailability(
  ownStock: number,
  supplierAvailable: boolean,
  estimatedLeadTimeDays: number | null
): PublicAvailability {
  const source: PublicAvailabilitySource =
    ownStock > 0 ? 'OWN_STOCK' : supplierAvailable ? 'SUPPLIER_STOCK' : 'OUT_OF_STOCK'
  return { source, available: source !== 'OUT_OF_STOCK', ownStock, supplierAvailable, estimatedLeadTimeDays }
}

export function createDigitalAvailability(): PublicAvailability {
  return {
    source: 'DIGITAL',
    available: true,
    ownStock: 0,
    supplierAvailable: false,
    estimatedLeadTimeDays: null
  }
}

export function isPublicImageUrl(value: string) {
  if (value.startsWith('/')) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function parseAttributeFilterExpression(value: string) {
  if (!value) return []
  const filters = value.split(',').filter(Boolean)
  if (filters.length > 12) throw new Error('Hay demasiados filtros.')
  const parsed = filters.map((filter) => {
    const separator = filter.indexOf(':')
    const slug = filter.slice(0, separator).trim()
    const values = filter
      .slice(separator + 1)
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean)
    if (separator < 1 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !values.length || values.length > 20)
      throw new Error('El filtro de atributo no es válido.')
    return { slug, values: [...new Set(values)] }
  })
  if (new Set(parsed.map((item) => item.slug)).size !== parsed.length)
    throw new Error('Un atributo no puede filtrarse dos veces.')
  return parsed
}
