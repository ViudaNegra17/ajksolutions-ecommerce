import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import 'dotenv/config'
import { publicProductQuerySchema } from '../../shared/schemas/public-catalog.schema'

const databaseConfigured = Boolean(process.env.DATABASE_URL)
const describeWithDatabase = databaseConfigured ? describe : describe.skip
let prisma: typeof import('../../server/utils/prisma').prisma
let service: typeof import('../../server/services/public-catalog.service').publicCatalogService
const suffix = Date.now().toString()
const ids: { category?: string; brand?: string; supplier?: string; attribute?: string } = {}
const slugs = {
  fixed100: `fase3-fixed-100-${suffix}`,
  fixed200: `fase3-fixed-200-${suffix}`,
  contact: `fase3-contact-${suffix}`,
  inactive: `fase3-inactive-${suffix}`,
  deleted: `fase3-deleted-${suffix}`,
  variant: `fase3-variant-${suffix}`
}

describeWithDatabase('catálogo público de Fase 3', () => {
  beforeAll(async () => {
    ;({ prisma } = await import('../../server/utils/prisma'))
    ;({ publicCatalogService: service } = await import('../../server/services/public-catalog.service'))
    const category = await prisma.category.create({
      data: { name: `Fase 3 ${suffix}`, slug: `fase-3-${suffix}`, active: true }
    })
    const brand = await prisma.brand.create({
      data: { name: `Marca Fase 3 ${suffix}`, slug: `marca-fase-3-${suffix}`, active: true }
    })
    const supplier = await prisma.supplier.create({
      data: { supplierCode: `F3-${suffix.slice(-12)}`, name: `Proveedor Fase 3 ${suffix}`, active: true }
    })
    const attribute = await prisma.attribute.create({
      data: {
        name: `Memoria ${suffix}`,
        slug: `memoria-${suffix}`,
        type: 'SELECT',
        filterable: true,
        variant: true,
        categories: { create: { categoryId: category.id } },
        options: { create: { value: '16gb', label: '16 GB', active: true } }
      },
      include: { options: true }
    })
    ids.category = category.id
    ids.brand = brand.id
    ids.supplier = supplier.id
    ids.attribute = attribute.id
    const common = { categoryId: category.id, brandId: brand.id, active: true } as const
    const fixed100 = await prisma.product.create({
      data: {
        ...common,
        productCode: `F3100-${suffix}`,
        sku: `F3100-${suffix}`,
        name: 'Producto Fase 3 cien',
        slug: slugs.fixed100,
        priceMode: 'FIXED',
        price: '100.00',
        taxRate: '0.00',
        featured: true,
        attributeValues: {
          create: {
            attributeId: attribute.id,
            options: {
              create: {
                option: {
                  connect: {
                    attributeId_id: {
                      attributeId: attribute.id,
                      id: attribute.options[0]!.id
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
    const fixed200 = await prisma.product.create({
      data: {
        ...common,
        productCode: `F3200-${suffix}`,
        sku: `F3200-${suffix}`,
        name: 'Producto Fase 3 doscientos',
        slug: slugs.fixed200,
        priceMode: 'FIXED',
        price: '200.00',
        taxRate: '0.00'
      }
    })
    const contact = await prisma.product.create({
      data: {
        ...common,
        productCode: `F3CON-${suffix}`,
        sku: `F3CON-${suffix}`,
        name: 'Producto Fase 3 consultar',
        slug: slugs.contact,
        priceMode: 'CONTACT'
      }
    })
    await Promise.all([
      prisma.product.create({
        data: {
          ...common,
          productCode: `F3INA-${suffix}`,
          sku: `F3INA-${suffix}`,
          name: 'Producto inactivo',
          slug: slugs.inactive,
          priceMode: 'CONTACT',
          active: false
        }
      }),
      prisma.product.create({
        data: {
          ...common,
          productCode: `F3DEL-${suffix}`,
          sku: `F3DEL-${suffix}`,
          name: 'Producto eliminado',
          slug: slugs.deleted,
          priceMode: 'CONTACT',
          deletedAt: new Date()
        }
      })
    ])
    const optionId = attribute.options[0]!.id
    const variantProduct = await prisma.product.create({
      data: {
        ...common,
        productCode: `F3VAR-${suffix}`,
        sku: `F3VAR-${suffix}`,
        name: 'Producto con variante',
        slug: slugs.variant,
        priceMode: 'FIXED',
        price: '300.00',
        taxRate: '0.00',
        variants: {
          create: {
            variantCode: `V3-${suffix}`,
            sku: `V3-${suffix}`,
            combinationKey: optionId,
            priceOverride: '250.00',
            attributeValues: { create: { attributeId: attribute.id, optionId } }
          }
        }
      },
      include: { variants: true }
    })
    const location = await prisma.inventoryLocation.findFirstOrThrow({
      where: { active: true, deletedAt: null }
    })
    await Promise.all([
      prisma.inventoryStock.create({
        data: {
          locationId: location.id,
          productId: fixed100.id,
          quantityOnHand: 5,
          quantityReserved: 1
        }
      }),
      prisma.supplierProduct.create({
        data: {
          supplierId: supplier.id,
          productId: fixed200.id,
          supplierCost: '80.00',
          supplierStock: 9,
          leadTimeDays: 3
        }
      }),
      prisma.inventoryStock.create({
        data: {
          locationId: location.id,
          productId: variantProduct.id,
          variantId: variantProduct.variants[0]!.id,
          quantityOnHand: 2
        }
      })
    ])
    void contact
  })

  afterAll(async () => {
    if (!prisma || !ids.category) return
    await prisma.product.deleteMany({ where: { categoryId: ids.category } })
    if (ids.attribute) await prisma.attribute.delete({ where: { id: ids.attribute } })
    if (ids.supplier) await prisma.supplier.delete({ where: { id: ids.supplier } })
    if (ids.brand) await prisma.brand.delete({ where: { id: ids.brand } })
    await prisma.category.delete({ where: { id: ids.category } })
  })

  it('excluye productos inactivos y eliminados del listado y detalle', async () => {
    const result = await service.list(
      publicProductQuerySchema.parse({ search: 'Producto Fase 3', pageSize: 60 })
    )
    const resultSlugs = result.items.map((item) => item.slug)
    expect(resultSlugs).not.toContain(slugs.inactive)
    expect(resultSlugs).not.toContain(slugs.deleted)
    await expect(service.get(slugs.deleted)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('ordena FIXED por precio y mantiene CONTACT al final', async () => {
    const result = await service.list(
      publicProductQuerySchema.parse({
        category: `fase-3-${suffix}`,
        sort: 'price-asc',
        pageSize: 60
      })
    )
    const prices = result.items.map((item) => item.price.amount)
    expect(prices.at(-1)).toBeNull()
    expect(prices.filter(Boolean).map(Number)).toEqual(
      [...prices.filter(Boolean).map(Number)].sort((a, b) => a - b)
    )
  })

  it('filtra por búsqueda, marca, categoría y atributo dinámico', async () => {
    const result = await service.list(
      publicProductQuerySchema.parse({
        search: 'cien',
        brand: `marca-fase-3-${suffix}`,
        category: `fase-3-${suffix}`,
        attributes: `memoria-${suffix}:16gb`
      })
    )
    expect(result.items.map((item) => item.slug)).toEqual([slugs.fixed100])
  })

  it('resuelve OWN_STOCK, SUPPLIER_STOCK y OUT_OF_STOCK sin datos sensibles', async () => {
    const [own, supplier, out] = await Promise.all([
      service.get(slugs.fixed100),
      service.get(slugs.fixed200),
      service.get(slugs.contact)
    ])
    expect(own.availability).toMatchObject({ source: 'OWN_STOCK', ownStock: 4 })
    expect(supplier.availability).toMatchObject({
      source: 'SUPPLIER_STOCK',
      supplierAvailable: true,
      estimatedLeadTimeDays: 3
    })
    expect(out.availability.source).toBe('OUT_OF_STOCK')
    expect(JSON.stringify(supplier)).not.toContain('supplierCost')
    expect(JSON.stringify(supplier)).not.toContain('supplierStock')
  })

  it('serializa FIXED, CONTACT, especificaciones y variantes correctamente', async () => {
    const [fixed, contact, variant] = await Promise.all([
      service.get(slugs.fixed100),
      service.get(slugs.contact),
      service.get(slugs.variant)
    ])
    expect(fixed.price.amount).toBe('100.00')
    expect(contact.price).toMatchObject({ mode: 'CONTACT', amount: null })
    expect(fixed.specifications[0]).toMatchObject({ value: '16 GB' })
    expect(variant.variants[0]).toMatchObject({
      price: { amount: '250.00' },
      availability: { source: 'OWN_STOCK' }
    })
  })
})
