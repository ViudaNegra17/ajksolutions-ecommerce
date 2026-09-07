import type { Prisma } from '@prisma/client'
import type { PublicProductQuery } from '#shared/schemas/public-catalog.schema'
import type {
  PublicAttributeFilter,
  PublicCategory,
  PublicPrice,
  PublicProductCard,
  PublicProductDetail,
  PublicSettings,
  PublicSpecification,
  PublicVariant
} from '#shared/types/public-catalog'
import {
  createPublicAvailability,
  createDigitalAvailability,
  isPublicImageUrl,
  parseAttributeFilterExpression,
  serializeDecimal
} from '#shared/utils/public-catalog'
import { calculateEffectivePrice, calculateProductPrice } from './price.service'
import { apiError } from '../utils/api-error'
import {
  publicCatalogRepository,
  type ParsedAttributeFilter
} from '../repositories/public-catalog.repository'

type CategoryRow = Awaited<ReturnType<typeof publicCatalogRepository.categoryRows>>[number]
type CardRow = Awaited<ReturnType<typeof publicCatalogRepository.listProducts>>['items'][number]
type DetailRow = NonNullable<Awaited<ReturnType<typeof publicCatalogRepository.productBySlug>>>

function validCategoryState(rows: CategoryRow[]) {
  const byParent = new Map<string | null, CategoryRow[]>()
  for (const row of rows) {
    const siblings = byParent.get(row.parentId) || []
    siblings.push(row)
    byParent.set(row.parentId, siblings)
  }
  const validIds = new Set<string>()
  const visit = (parentId: string | null) => {
    for (const child of byParent.get(parentId) || []) {
      if (validIds.has(child.id)) continue
      validIds.add(child.id)
      visit(child.id)
    }
  }
  visit(null)
  return { byParent, validIds }
}

function categoryTree(rows: CategoryRow[], rootParentId: string | null = null): PublicCategory[] {
  const { byParent, validIds } = validCategoryState(rows)
  const build = (parentId: string | null): PublicCategory[] =>
    (byParent.get(parentId) || [])
      .filter((row) => validIds.has(row.id))
      .map((row) => ({
        name: row.name,
        slug: row.slug,
        description: row.description,
        imageUrl: row.imageUrl && isPublicImageUrl(row.imageUrl) ? row.imageUrl : null,
        icon: row.icon,
        children: build(row.id)
      }))
  return build(rootParentId)
}

function descendantIds(rows: CategoryRow[], slug: string) {
  const category = rows.find((row) => row.slug === slug)
  if (!category) return null
  const { byParent, validIds } = validCategoryState(rows)
  if (!validIds.has(category.id)) return null
  const ids: string[] = []
  const visit = (id: string) => {
    ids.push(id)
    for (const child of byParent.get(id) || []) visit(child.id)
  }
  visit(category.id)
  return ids
}

export function parsePublicAttributeFilters(value: string): ParsedAttributeFilter[] {
  try {
    return parseAttributeFilterExpression(value)
  } catch (error) {
    throw apiError(
      422,
      'INVALID_ATTRIBUTE_FILTER',
      error instanceof Error ? error.message : 'El filtro de atributo no es válido.'
    )
  }
}

export function availability(
  productType: 'PHYSICAL' | 'DIGITAL',
  stocks: Array<{ quantityOnHand: number; quantityReserved: number }>,
  suppliers: Array<{ supplierStock: number; leadTimeDays: number | null }>
) {
  if (productType === 'DIGITAL') {
    return createDigitalAvailability()
  }
  const ownStock = stocks.reduce(
    (sum, stock) => sum + Math.max(0, stock.quantityOnHand - stock.quantityReserved),
    0
  )
  const availableSuppliers = suppliers.filter((supplier) => supplier.supplierStock > 0)
  const leadTimes = availableSuppliers.flatMap((supplier) =>
    supplier.leadTimeDays == null ? [] : [supplier.leadTimeDays]
  )
  return createPublicAvailability(
    ownStock,
    availableSuppliers.length > 0,
    leadTimes.length ? Math.min(...leadTimes) : null
  )
}

function serializePrice(
  row: Pick<DetailRow, 'priceMode' | 'price' | 'priceIncludesTax' | 'taxRate'>,
  currency: string,
  priceOverride?: Prisma.Decimal | null
): PublicPrice {
  const effective = calculateEffectivePrice({
    priceMode: row.priceMode,
    price: row.price,
    priceOverride
  })
  if (!effective) {
    return {
      mode: 'CONTACT',
      amount: null,
      net: null,
      tax: null,
      currency,
      taxIncludedInDisplayedPrice: false
    }
  }
  const calculated = calculateProductPrice({
    price: effective,
    taxRate: row.taxRate || '0',
    priceIncludesTax: row.priceIncludesTax
  })
  return {
    mode: 'FIXED',
    amount: calculated.total.toFixed(2),
    net: calculated.net.toFixed(2),
    tax: calculated.tax.toFixed(2),
    currency,
    taxIncludedInDisplayedPrice: true
  }
}

function publicImage(image: { url: string; alt: string | null; isPrimary: boolean }, fallbackAlt: string) {
  if (!isPublicImageUrl(image.url)) return null
  return { url: image.url, alt: image.alt?.trim() || fallbackAlt, isPrimary: image.isPrimary }
}

function serializeCard(row: CardRow, currency: string): PublicProductCard {
  const image = row.images[0] ? publicImage(row.images[0], row.name) : null
  const now = Date.now()
  const promotion = [...row.promotions, ...row.category.promotions]
    .map((item) => item.promotion)
    .filter(
      (item) =>
        (!item.startsAt || item.startsAt.getTime() <= now) && (!item.endsAt || item.endsAt.getTime() >= now)
    )
    .sort((a, b) => b.priority - a.priority)[0]
  return {
    id: row.id,
    productCode: row.productCode,
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    shortDescription: row.shortDescription,
    productType: row.productType,
    featured: row.featured,
    brand: row.brand,
    category: { name: row.category.name, slug: row.category.slug },
    image,
    price: serializePrice(row, currency),
    availability: availability(row.productType, row.inventoryStocks, row.supplierProducts),
    hasVariants: row.variants.length > 0,
    promotion: promotion
      ? { name: promotion.name, description: promotion.description, badge: promotion.badge }
      : null
  }
}

function specificationValue(value: DetailRow['attributeValues'][number]) {
  if (value.options.length) return value.options.map((item) => item.option.label).join(', ')
  if (value.textValue) return value.textValue
  if (value.numberValue != null) return serializeDecimal(value.numberValue)!.replace(/\.00$/, '')
  if (value.booleanValue != null) return value.booleanValue ? 'Sí' : 'No'
  return null
}

function specifications(row: DetailRow): PublicSpecification[] {
  return row.attributeValues.flatMap((value) => {
    const formatted = specificationValue(value)
    return formatted ? [{ name: value.attribute.name, value: formatted, unit: value.attribute.unit }] : []
  })
}

function categoryBreadcrumbs(rows: CategoryRow[], categoryId: string) {
  const byId = new Map(rows.map((row) => [row.id, row]))
  const result: Array<{ name: string; path: string }> = []
  let current = byId.get(categoryId)
  const visited = new Set<string>()
  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    result.unshift({ name: current.name, path: `/categoria/${current.slug}` })
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return result
}

function serializeVariant(
  row: DetailRow,
  variant: DetailRow['variants'][number],
  currency: string
): PublicVariant {
  return {
    id: variant.id,
    code: variant.variantCode,
    sku: variant.sku,
    name: variant.name || variant.attributeValues.map((item) => item.option.label).join(' / '),
    options: variant.attributeValues.map((item) => ({
      attribute: item.option.attribute.name,
      attributeSlug: item.option.attribute.slug,
      value: item.option.value,
      label: item.option.label
    })),
    price: serializePrice(row, currency, variant.priceOverride),
    availability: availability(row.productType, variant.inventoryStocks, variant.supplierProducts)
  }
}

function settingString(settings: Map<string, unknown>, key: string, fallback: string | null = null) {
  const value = settings.get(key)
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export const publicCatalogService = {
  async settings(): Promise<PublicSettings> {
    const rows = await publicCatalogRepository.settings()
    const values = new Map(rows.map((row) => [row.key, row.value]))
    return {
      business: {
        name: settingString(values, 'business.name', 'AjkSolutionS')!,
        phone: settingString(values, 'business.phone'),
        whatsapp: settingString(values, 'business.whatsapp'),
        email: settingString(values, 'business.email'),
        address: settingString(values, 'business.address'),
        city: settingString(values, 'business.city')
      },
      currency: settingString(values, 'currency', 'USD')!,
      country: settingString(values, 'country', 'EC')!,
      seo: {
        siteName: settingString(values, 'seo.siteName', 'AjkSolutionS')!,
        title: settingString(values, 'seo.defaultTitle', settingString(values, 'seo.title')),
        description: settingString(values, 'seo.defaultDescription', settingString(values, 'seo.description'))
      },
      social: {
        facebook: settingString(values, 'social.facebook'),
        instagram: settingString(values, 'social.instagram')
      }
    }
  },

  async categories() {
    const rows = await publicCatalogRepository.categoryRows()
    return categoryTree(rows)
  },

  async brands() {
    const rows = await publicCatalogRepository.categoryRows()
    const { validIds } = validCategoryState(rows)
    const brands = await publicCatalogRepository.brands([...validIds])
    return brands.map((brand) => ({
      ...brand,
      logoUrl: brand.logoUrl && isPublicImageUrl(brand.logoUrl) ? brand.logoUrl : null
    }))
  },

  async list(input: PublicProductQuery, includeFilters = true) {
    const rows = await publicCatalogRepository.categoryRows()
    const { validIds } = validCategoryState(rows)
    const validCategoryIds = [...validIds]
    const selectedCategoryIds = input.category ? descendantIds(rows, input.category) : null
    if (input.category && !selectedCategoryIds)
      throw apiError(404, 'CATEGORY_NOT_FOUND', 'La categoría no existe.')
    const parsedAttributes = parsePublicAttributeFilters(input.attributes)
    const availabilityIds = input.availability
      ? await publicCatalogRepository.availabilityProductIds(input.availability)
      : null
    const [settings, result, brands, attributeDefinitions] = await Promise.all([
      this.settings(),
      publicCatalogRepository.listProducts(
        input,
        validCategoryIds,
        selectedCategoryIds,
        availabilityIds,
        parsedAttributes
      ),
      includeFilters ? publicCatalogRepository.brands(validCategoryIds) : Promise.resolve([]),
      includeFilters && selectedCategoryIds
        ? publicCatalogRepository.filterableAttributes(selectedCategoryIds)
        : Promise.resolve([])
    ])
    const filters: {
      categories: PublicCategory[]
      brands: typeof brands
      attributes: PublicAttributeFilter[]
    } = {
      categories: includeFilters ? categoryTree(rows) : [],
      brands,
      attributes: attributeDefinitions.map((attribute) => ({
        name: attribute.name,
        slug: attribute.slug,
        options:
          attribute.type === 'BOOLEAN'
            ? [
                { label: 'Sí', value: 'true' },
                { label: 'No', value: 'false' }
              ]
            : attribute.options
      }))
    }
    return {
      items: result.items.map((item) => serializeCard(item, settings.currency)),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / input.pageSize)
      },
      filters
    }
  },

  async get(slug: string): Promise<PublicProductDetail> {
    const [row, categories, settings] = await Promise.all([
      publicCatalogRepository.productBySlug(slug),
      publicCatalogRepository.categoryRows(),
      this.settings()
    ])
    if (!row) throw apiError(404, 'PRODUCT_NOT_FOUND', 'El producto no existe.')
    const { validIds } = validCategoryState(categories)
    if (!validIds.has(row.categoryId)) throw apiError(404, 'PRODUCT_NOT_FOUND', 'El producto no existe.')
    const card = serializeCard(row, settings.currency)
    const images = row.images.flatMap((image) => {
      const serialized = publicImage(image, row.name)
      return serialized ? [serialized] : []
    })
    return {
      ...card,
      description: row.description,
      warranty: row.warranty,
      metaTitle: row.metaTitle,
      metaDescription: row.metaDescription,
      images,
      specifications: specifications(row),
      variants: row.variants.map((variant) => serializeVariant(row, variant, settings.currency)),
      breadcrumbs: [
        { name: 'Inicio', path: '/' },
        { name: 'Productos', path: '/productos' },
        ...categoryBreadcrumbs(categories, row.categoryId),
        { name: row.name, path: `/productos/${row.slug}` }
      ]
    }
  },

  async availability(slug: string, variantCode?: string) {
    const product = await this.get(slug)
    if (!variantCode) return product.availability
    const variant = product.variants.find((item) => item.code === variantCode)
    if (!variant) throw apiError(404, 'VARIANT_NOT_FOUND', 'La variante no existe.')
    return variant.availability
  },

  async related(slug: string) {
    const [row, categories, settings] = await Promise.all([
      publicCatalogRepository.productBySlug(slug),
      publicCatalogRepository.categoryRows(),
      this.settings()
    ])
    if (!row) throw apiError(404, 'PRODUCT_NOT_FOUND', 'El producto no existe.')
    const { validIds } = validCategoryState(categories)
    if (!validIds.has(row.categoryId)) throw apiError(404, 'PRODUCT_NOT_FOUND', 'El producto no existe.')
    const related = await publicCatalogRepository.related(slug, row.categoryId, row.brandId, [...validIds])
    return related.map((item) => serializeCard(item, settings.currency))
  },

  async category(slug: string) {
    const rows = await publicCatalogRepository.categoryRows()
    const category = rows.find((row) => row.slug === slug)
    const ids = descendantIds(rows, slug)
    if (!category || !ids) throw apiError(404, 'CATEGORY_NOT_FOUND', 'La categoría no existe.')
    return {
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl && isPublicImageUrl(category.imageUrl) ? category.imageUrl : null,
      children: categoryTree(rows, category.id),
      breadcrumbs: [{ name: 'Inicio', path: '/' }, ...categoryBreadcrumbs(rows, category.id)]
    }
  },

  async search(q: string, limit: number) {
    const rows = await publicCatalogRepository.categoryRows()
    const { validIds } = validCategoryState(rows)
    const result = await publicCatalogRepository.searchSuggestions(q, limit, [...validIds])
    return {
      products: result.products.map((product) => ({
        name: product.name,
        slug: product.slug,
        image: product.images[0] ? publicImage(product.images[0], product.name) : null
      })),
      categories: result.categories,
      brands: result.brands
    }
  },

  async home() {
    const base: PublicProductQuery = {
      page: 1,
      pageSize: 8,
      search: '',
      sort: 'newest',
      attributes: ''
    }
    const [categories, brands, featured, newest, settings] = await Promise.all([
      this.categories(),
      this.brands(),
      this.list({ ...base, featured: 'true', sort: 'relevance' }, false),
      this.list(base, false),
      this.settings()
    ])
    return { categories, brands, featured: featured.items, newest: newest.items, settings }
  },

  async sitemap() {
    const rows = await publicCatalogRepository.categoryRows()
    const { validIds } = validCategoryState(rows)
    const [categories, products] = await publicCatalogRepository.sitemapEntries([...validIds])
    return { categories, products }
  }
}
