import { Prisma } from '@prisma/client'
import type { PublicAvailabilitySource } from '#shared/types/public-catalog'
import type { PublicProductQuery } from '#shared/schemas/public-catalog.schema'
import { prisma } from '../utils/prisma'

export type ParsedAttributeFilter = { slug: string; values: string[] }

const publicProductWhere = (validCategoryIds: string[]): Prisma.ProductWhereInput => ({
  active: true,
  deletedAt: null,
  categoryId: { in: validCategoryIds }
})

const publicCardSelect = {
  id: true,
  categoryId: true,
  brandId: true,
  productCode: true,
  sku: true,
  name: true,
  slug: true,
  shortDescription: true,
  productType: true,
  featured: true,
  priceMode: true,
  price: true,
  priceIncludesTax: true,
  taxRate: true,
  createdAt: true,
  brand: { select: { name: true, slug: true } },
  category: {
    select: {
      name: true,
      slug: true,
      promotions: {
        where: { promotion: { active: true, deletedAt: null } },
        select: {
          promotion: {
            select: {
              name: true,
              description: true,
              badge: true,
              priority: true,
              startsAt: true,
              endsAt: true
            }
          }
        }
      }
    }
  },
  images: {
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
    take: 1,
    select: { url: true, alt: true, isPrimary: true }
  },
  inventoryStocks: { select: { quantityOnHand: true, quantityReserved: true } },
  supplierProducts: {
    where: { active: true, supplier: { active: true, deletedAt: null } },
    select: { supplierStock: true, leadTimeDays: true }
  },
  variants: {
    where: { active: true, deletedAt: null },
    take: 1,
    select: { id: true }
  },
  promotions: {
    where: { promotion: { active: true, deletedAt: null } },
    select: {
      promotion: {
        select: { name: true, description: true, badge: true, priority: true, startsAt: true, endsAt: true }
      }
    }
  }
} satisfies Prisma.ProductSelect

function attributeWhere(filter: ParsedAttributeFilter): Prisma.ProductWhereInput {
  const optionMatch: Prisma.AttributeOptionWhereInput = {
    attribute: { slug: filter.slug, active: true, filterable: true },
    OR: filter.values.flatMap((value) => [
      { value: { equals: value, mode: 'insensitive' as const } },
      { label: { equals: value, mode: 'insensitive' as const } }
    ])
  }
  const numbers = filter.values.filter((value) => /^-?\d+(?:\.\d+)?$/.test(value)).map(Number)
  const booleans = filter.values
    .map((value) => (value === 'true' ? true : value === 'false' ? false : null))
    .filter((value): value is boolean => value != null)
  return {
    OR: [
      {
        attributeValues: {
          some: {
            attribute: { slug: filter.slug, active: true, filterable: true },
            OR: [
              ...filter.values.map((value) => ({
                textValue: { equals: value, mode: 'insensitive' as const }
              })),
              ...(numbers.length ? [{ numberValue: { in: numbers } }] : []),
              ...(booleans.length === 1 ? [{ booleanValue: booleans[0] }] : []),
              { options: { some: { option: optionMatch } } }
            ]
          }
        }
      },
      {
        variants: {
          some: {
            active: true,
            deletedAt: null,
            attributeValues: { some: { option: optionMatch } }
          }
        }
      }
    ]
  }
}

function productOrder(sort: PublicProductQuery['sort']): Prisma.ProductOrderByWithRelationInput[] {
  if (sort === 'newest') return [{ createdAt: 'desc' }]
  if (sort === 'name-asc') return [{ name: 'asc' }]
  if (sort === 'price-asc') return [{ price: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }]
  if (sort === 'price-desc') return [{ price: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }]
  return [{ featured: 'desc' }, { createdAt: 'desc' }]
}

export const publicCatalogRepository = {
  categoryRows() {
    return prisma.category.findMany({
      where: { active: true, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        icon: true,
        parentId: true,
        sortOrder: true
      }
    })
  },

  async availabilityProductIds(source: PublicAvailabilitySource) {
    const own = Prisma.sql`EXISTS (
      SELECT 1 FROM inventory_stocks i
      WHERE i."productId" = p.id AND (i."quantityOnHand" - i."quantityReserved") > 0
    )`
    const supplier = Prisma.sql`EXISTS (
      SELECT 1 FROM supplier_products sp
      JOIN suppliers s ON s.id = sp."supplierId"
      WHERE sp."productId" = p.id
        AND sp.active = TRUE
        AND sp."supplierStock" > 0
        AND s.active = TRUE
        AND s."deletedAt" IS NULL
    )`
    const condition =
      source === 'OWN_STOCK'
        ? Prisma.sql`p."productType" = 'PHYSICAL' AND ${own}`
        : source === 'SUPPLIER_STOCK'
          ? Prisma.sql`p."productType" = 'PHYSICAL' AND NOT (${own}) AND ${supplier}`
          : source === 'DIGITAL'
            ? Prisma.sql`p."productType" = 'DIGITAL'`
            : Prisma.sql`p."productType" = 'PHYSICAL' AND NOT (${own}) AND NOT (${supplier})`
    const rows = await prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT p.id FROM products p WHERE ${condition}`
    )
    return rows.map((row) => row.id)
  },

  async listProducts(
    input: PublicProductQuery,
    validCategoryIds: string[],
    selectedCategoryIds: string[] | null,
    availabilityIds: string[] | null,
    attributes: ParsedAttributeFilter[]
  ) {
    const where: Prisma.ProductWhereInput = {
      ...publicProductWhere(validCategoryIds),
      ...(selectedCategoryIds ? { categoryId: { in: selectedCategoryIds } } : {}),
      ...(availabilityIds ? { id: { in: availabilityIds } } : {}),
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { sku: { contains: input.search, mode: 'insensitive' } },
              { barcode: { contains: input.search, mode: 'insensitive' } },
              { productCode: { contains: input.search, mode: 'insensitive' } },
              { slug: { contains: input.search, mode: 'insensitive' } },
              { shortDescription: { contains: input.search, mode: 'insensitive' } },
              { brand: { name: { contains: input.search, mode: 'insensitive' } } },
              { category: { name: { contains: input.search, mode: 'insensitive' } } }
            ]
          }
        : {}),
      ...(input.brand ? { brand: { slug: input.brand, active: true, deletedAt: null } } : {}),
      ...(input.productType ? { productType: input.productType } : {}),
      ...(input.priceMode ? { priceMode: input.priceMode } : {}),
      ...(input.featured ? { featured: input.featured === 'true' } : {}),
      ...(input.minPrice || input.maxPrice
        ? {
            priceMode: 'FIXED',
            price: {
              ...(input.minPrice ? { gte: input.minPrice } : {}),
              ...(input.maxPrice ? { lte: input.maxPrice } : {})
            }
          }
        : {}),
      ...(attributes.length ? { AND: attributes.map(attributeWhere) } : {})
    }
    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: productOrder(input.sort),
        select: publicCardSelect
      }),
      prisma.product.count({ where })
    ])
    return { items, total }
  },

  productBySlug(slug: string) {
    return prisma.product.findFirst({
      where: {
        slug,
        active: true,
        deletedAt: null,
        category: { active: true, deletedAt: null }
      },
      select: {
        ...publicCardSelect,
        description: true,
        warranty: true,
        weight: true,
        metaTitle: true,
        metaDescription: true,
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          select: { url: true, alt: true, isPrimary: true }
        },
        attributeValues: {
          where: { attribute: { active: true } },
          orderBy: { attribute: { sortOrder: 'asc' } },
          select: {
            textValue: true,
            numberValue: true,
            booleanValue: true,
            attribute: { select: { name: true, type: true, unit: true } },
            options: {
              orderBy: { option: { sortOrder: 'asc' } },
              select: { option: { select: { label: true } } }
            }
          }
        },
        variants: {
          where: { active: true, deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            variantCode: true,
            sku: true,
            name: true,
            priceOverride: true,
            attributeValues: {
              orderBy: { option: { attribute: { sortOrder: 'asc' } } },
              select: {
                option: {
                  select: {
                    value: true,
                    label: true,
                    attribute: { select: { name: true, slug: true } }
                  }
                }
              }
            },
            inventoryStocks: { select: { quantityOnHand: true, quantityReserved: true } },
            supplierProducts: {
              where: { active: true, supplier: { active: true, deletedAt: null } },
              select: { supplierStock: true, leadTimeDays: true }
            }
          }
        }
      }
    })
  },

  related(productSlug: string, categoryId: string, brandId: string | null, validCategoryIds: string[]) {
    return prisma.product.findMany({
      where: {
        ...publicProductWhere(validCategoryIds),
        slug: { not: productSlug },
        OR: [{ categoryId }, ...(brandId ? [{ brandId }] : [])]
      },
      take: 8,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      select: publicCardSelect
    })
  },

  brands(validCategoryIds: string[]) {
    return prisma.brand.findMany({
      where: {
        active: true,
        deletedAt: null,
        products: { some: publicProductWhere(validCategoryIds) }
      },
      orderBy: { name: 'asc' },
      select: { name: true, slug: true, logoUrl: true, description: true }
    })
  },

  filterableAttributes(categoryIds: string[]) {
    if (!categoryIds.length) return Promise.resolve([])
    return prisma.attribute.findMany({
      where: {
        active: true,
        filterable: true,
        categories: { some: { categoryId: { in: categoryIds } } }
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        name: true,
        slug: true,
        type: true,
        options: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
          select: { label: true, value: true }
        }
      }
    })
  },

  async searchSuggestions(q: string, limit: number, validCategoryIds: string[]) {
    const [products, categories, brands] = await Promise.all([
      prisma.product.findMany({
        where: {
          ...publicProductWhere(validCategoryIds),
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { barcode: { contains: q, mode: 'insensitive' } },
            { productCode: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } }
          ]
        },
        take: limit,
        orderBy: [{ featured: 'desc' }, { name: 'asc' }],
        select: {
          name: true,
          slug: true,
          images: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true, alt: true, isPrimary: true }
          }
        }
      }),
      prisma.category.findMany({
        where: { id: { in: validCategoryIds }, name: { contains: q, mode: 'insensitive' } },
        take: limit,
        orderBy: { name: 'asc' },
        select: { name: true, slug: true }
      }),
      prisma.brand.findMany({
        where: {
          active: true,
          deletedAt: null,
          name: { contains: q, mode: 'insensitive' },
          products: { some: publicProductWhere(validCategoryIds) }
        },
        take: limit,
        orderBy: { name: 'asc' },
        select: { name: true, slug: true }
      })
    ])
    return { products, categories, brands }
  },

  settings() {
    return prisma.setting.findMany({
      where: {
        key: {
          in: [
            'business.name',
            'business.phone',
            'business.whatsapp',
            'business.email',
            'business.address',
            'business.city',
            'currency',
            'country',
            'seo.title',
            'seo.description',
            'seo.siteName',
            'seo.defaultTitle',
            'seo.defaultDescription',
            'social.facebook',
            'social.instagram'
          ]
        }
      },
      select: { key: true, value: true }
    })
  },

  sitemapEntries(validCategoryIds: string[]) {
    return Promise.all([
      prisma.category.findMany({
        where: { id: { in: validCategoryIds } },
        select: { slug: true, updatedAt: true }
      }),
      prisma.product.findMany({
        where: publicProductWhere(validCategoryIds),
        select: { slug: true, updatedAt: true, productType: true }
      })
    ])
  }
}
