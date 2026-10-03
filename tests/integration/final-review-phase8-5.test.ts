import 'dotenv/config'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../server/utils/prisma'
import { productRepository } from '../../server/repositories/catalog.repository'
import { publicCatalogRepository } from '../../server/repositories/public-catalog.repository'
import { publicProductQuerySchema } from '../../shared/schemas/public-catalog.schema'
import { productSchema } from '../../shared/schemas/product.schema'
import { categorySchema } from '../../shared/schemas/category.schema'
import { brandSchema } from '../../shared/schemas/brand.schema'
import { attributeSchema } from '../../shared/schemas/attribute.schema'
import { serviceCategorySchema } from '../../shared/schemas/service-category.schema'
import { serviceSchema } from '../../shared/schemas/service.schema'
import {
  categoryService,
  brandService,
  attributeService,
  productService
} from '../../server/services/catalog.service'
import {
  serviceCategoryManagementService,
  serviceManagementService
} from '../../server/services/service-management.service'
import { auditService } from '../../server/services/audit.service'
import { apiError } from '../../server/utils/api-error'
import { throwDatabaseError } from '../../server/utils/domain-error'

describe.skipIf(!process.env.DATABASE_URL)('Fase 8.5: identificadores comerciales', () => {
  const suffix = crypto.randomUUID()
  const productIds: string[] = []
  let categoryId = ''
  let supplierId = ''
  let attributeId = ''
  let optionId = ''
  const slugIds: Record<string, string[]> = {
    category: [],
    brand: [],
    attribute: [],
    serviceCategory: [],
    service: []
  }

  beforeAll(async () => {
    vi.spyOn(auditService, 'record').mockResolvedValue(undefined)
    vi.stubGlobal('apiError', apiError)
    vi.stubGlobal('throwDatabaseError', throwDatabaseError)
    const category = await prisma.category.create({ data: { name: 'F85', slug: `f85-${suffix}` } })
    categoryId = category.id
    const supplier = await prisma.supplier.create({
      data: { name: 'F85', supplierCode: `F85-${suffix.slice(0, 8)}` }
    })
    supplierId = supplier.id
    const attribute = await prisma.attribute.create({
      data: {
        name: 'F85',
        slug: `f85-${suffix}`,
        type: 'SELECT',
        variant: true,
        options: { create: { value: 'black', label: 'Negro' } }
      },
      include: { options: true }
    })
    attributeId = attribute.id
    optionId = attribute.options[0]!.id
  })

  function input(overrides: Record<string, unknown> = {}) {
    return productSchema.parse({
      name: 'Producto F85',
      categoryId,
      priceMode: 'FIXED',
      price: '20',
      active: true,
      ...overrides
    })
  }

  async function create(overrides: Record<string, unknown> = {}) {
    const item = await productRepository.create(input(overrides), `f85-${crypto.randomUUID()}`)
    productIds.push(item.id)
    return item
  }

  afterAll(async () => {
    await prisma.supplierProduct.deleteMany({ where: { productId: { in: productIds } } })
    await prisma.productVariant.deleteMany({ where: { productId: { in: productIds } } })
    await prisma.product.deleteMany({ where: { id: { in: productIds } } })
    await prisma.service.deleteMany({ where: { id: { in: slugIds.service } } })
    await prisma.serviceCategory.deleteMany({ where: { id: { in: slugIds.serviceCategory } } })
    await prisma.attribute.deleteMany({ where: { id: { in: slugIds.attribute } } })
    await prisma.brand.deleteMany({ where: { id: { in: slugIds.brand } } })
    await prisma.category.deleteMany({ where: { id: { in: slugIds.category } } })
    if (attributeId) await prisma.attribute.delete({ where: { id: attributeId } })
    if (supplierId) await prisma.supplier.delete({ where: { id: supplierId } })
    if (categoryId) await prisma.category.delete({ where: { id: categoryId } })
    await prisma.$disconnect()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('crea sin SKU, genera identificadores únicos y conserva los existentes al editar', async () => {
    const first = await create({ variants: [{ optionIds: [optionId] }] })
    const second = await create()
    expect(first.sku).toBe(`SKU-${first.productCode}`)
    expect(first.sku).not.toBe(second.sku)
    const variant = first.variants[0]!
    expect(variant.sku).toBe(`SKU-${variant.variantCode}`)
    const updated = await productRepository.update(
      first.id,
      input({
        sku: 'CLIENT-TAMPER',
        variants: [{ id: variant.id, sku: 'CLIENT-VARIANT', optionIds: [optionId] }]
      }),
      first.slug
    )
    expect(updated.sku).toBe(first.sku)
    expect(updated.variants[0]!.sku).toBe(variant.sku)
    expect(updated.productCode).toBe(first.productCode)
  })

  it('acepta múltiples barcode NULL, normaliza el manual, conserva supplierSku y aplica UNIQUE', async () => {
    const first = await create({
      barcode: `  F85-${suffix}  `,
      supplierProducts: [{ supplierId, supplierSku: 'EXTERNAL-001' }]
    })
    expect(first.barcode).toBe(`F85-${suffix}`)
    expect(first.supplierProducts[0]!.supplierSku).toBe('EXTERNAL-001')
    expect((await create()).barcode).toBeNull()
    expect((await create({ barcode: '' })).barcode).toBeNull()
    await expect(create({ barcode: first.barcode })).rejects.toMatchObject({ code: 'P2002' })
    const updated = await productRepository.update(first.id, input({ barcode: 'EDIT-' + suffix }), first.slug)
    expect(updated.barcode).toBe('EDIT-' + suffix)
    const results = await productRepository.list({ page: 1, pageSize: 10, search: updated.barcode! })
    expect(results.items.map((item) => item.id)).toContain(first.id)
    const published = await publicCatalogRepository.listProducts(
      publicProductQuerySchema.parse({ search: updated.barcode }),
      [categoryId],
      null,
      null,
      []
    )
    expect(published.items.map((item) => item.id)).toContain(first.id)
    const suggestions = await publicCatalogRepository.searchSuggestions(updated.barcode!, 6, [categoryId])
    expect(suggestions.products.map((item) => item.slug)).toContain(first.slug)
  })

  it('genera slugs únicos bajo concurrencia y mantiene las URLs de las seis entidades al editar', async () => {
    const event = {} as never
    const name = `Cámaras F85 ${suffix}`
    const cases = [
      { key: 'category', service: categoryService, parse: (value: object) => categorySchema.parse(value) },
      { key: 'brand', service: brandService, parse: (value: object) => brandSchema.parse(value) },
      {
        key: 'attribute',
        service: attributeService,
        parse: (value: object) => attributeSchema.parse({ type: 'TEXT', ...value })
      },
      {
        key: 'serviceCategory',
        service: serviceCategoryManagementService,
        parse: (value: object) => serviceCategorySchema.parse(value)
      }
    ]
    for (const item of cases) {
      // Each entity has its own payload; this union is invoked through a narrow test adapter.
      const create = item.service.create.bind(item.service) as (
        event: never,
        user: string,
        value: unknown
      ) => Promise<{ id: string; slug: string }>
      const update = item.service.update.bind(item.service) as (
        event: never,
        user: string,
        id: string,
        value: unknown
      ) => Promise<{ slug: string }>
      const rows = await Promise.all(
        [1, 2, 3].map(() => create(event, '', item.parse({ name, slug: 'client-tamper' })))
      )
      slugIds[item.key]!.push(...rows.map((row) => row.id))
      expect(new Set(rows.map((row) => row.slug)).size).toBe(3)
      expect(rows.map((row) => row.slug).sort()).toEqual(
        [`camaras-f85-${suffix}`, `camaras-f85-${suffix}-2`, `camaras-f85-${suffix}-3`].sort()
      )
      const renamed = await update(
        event,
        '',
        rows[0]!.id,
        item.parse({ name: 'Renombrado', slug: 'tampered' })
      )
      expect(renamed.slug).toBe(rows[0]!.slug)
    }
    const products = await Promise.all(
      [1, 2, 3].map(() => productService.create(event, '', input({ name, slug: 'tampered' })))
    )
    productIds.push(...products.map((item) => item.id))
    expect(new Set(products.map((item) => item.slug)).size).toBe(3)
    expect(
      (
        await productService.update(
          event,
          '',
          products[0]!.id,
          input({ name: 'Otro nombre', slug: 'tampered' })
        )
      ).slug
    ).toBe(products[0]!.slug)
    const serviceInput = serviceSchema.parse({
      name,
      slug: 'tampered',
      categoryId: slugIds.serviceCategory![0],
      priceMode: 'QUOTE'
    })
    const services = await Promise.all(
      [1, 2, 3].map(() => serviceManagementService.create(event, '', serviceInput))
    )
    slugIds.service!.push(...services.map((item) => item.id))
    expect(new Set(services.map((item) => item.slug)).size).toBe(3)
    expect(
      (
        await serviceManagementService.update(event, '', services[0]!.id, {
          ...serviceInput,
          name: 'Servicio renombrado'
        })
      ).slug
    ).toBe(services[0]!.slug)
  })

  it('persiste peso físico decimal y fuerza DIGITAL sin peso ni stock', async () => {
    const physical = await create({ weight: 1.125, warrantyChoice: '12_MONTHS' })
    expect(physical.weight?.toString()).toBe('1.125')
    expect(physical.warranty).toBe('12 meses')
    const digital = await create({ productType: 'DIGITAL', manageStock: false, weight: 99 })
    expect(digital.weight).toBeNull()
    expect(digital.manageStock).toBe(false)
  })
})
