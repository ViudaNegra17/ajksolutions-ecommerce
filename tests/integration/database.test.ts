import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import 'dotenv/config'

const databaseConfigured = Boolean(process.env.DATABASE_URL)
const describeWithDatabase = databaseConfigured ? describe : describe.skip
let prisma: typeof import('../../server/utils/prisma').prisma

describeWithDatabase('PostgreSQL and initial data', () => {
  beforeAll(async () => {
    ;({ prisma } = await import('../../server/utils/prisma'))
  })

  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it('executes a real query against the configured database', async () => {
    const rows = await prisma.$queryRaw<Array<{ value: number }>>`SELECT 1 AS value`
    expect(Number(rows[0]?.value)).toBe(1)
  })

  it('contains the roles, permissions and settings required by phases 1 and 2', async () => {
    const [roles, permissions, settings, locations] = await Promise.all([
      prisma.role.count(),
      prisma.permission.count(),
      prisma.setting.count({
        where: {
          key: {
            in: ['business.name', 'currency', 'country', 'tax.defaultRate', 'tax.pricesIncludeTaxDefault']
          }
        }
      }),
      prisma.inventoryLocation.count({ where: { locationCode: 'LOC-000001', active: true } })
    ])

    expect(roles).toBeGreaterThanOrEqual(4)
    expect(permissions).toBeGreaterThanOrEqual(29)
    expect(settings).toBe(5)
    expect(locations).toBe(1)
  })

  it('enforces fixed/contact prices and non-negative stock in PostgreSQL', async () => {
    const suffix = Date.now().toString()
    const category = await prisma.category.create({
      data: { name: `Integración ${suffix}`, slug: `integracion-${suffix}` }
    })
    const product = await prisma.product.create({
      data: {
        productCode: `TST-${suffix}`,
        sku: `TST-${suffix}`,
        name: 'Producto integración',
        slug: `producto-integracion-${suffix}`,
        categoryId: category.id,
        priceMode: 'CONTACT',
        price: null
      }
    })
    const location = await prisma.inventoryLocation.findUniqueOrThrow({
      where: { locationCode: 'LOC-000001' }
    })

    try {
      await expect(
        prisma.product.create({
          data: {
            productCode: `BAD-${suffix}`,
            sku: `BAD-${suffix}`,
            name: 'Precio inválido',
            slug: `precio-invalido-${suffix}`,
            categoryId: category.id,
            priceMode: 'CONTACT',
            price: '1.00'
          }
        })
      ).rejects.toThrow()
      await expect(
        prisma.inventoryStock.create({
          data: {
            locationId: location.id,
            productId: product.id,
            quantityOnHand: -1
          }
        })
      ).rejects.toThrow()
    } finally {
      await prisma.product.delete({ where: { id: product.id } })
      await prisma.category.delete({ where: { id: category.id } })
    }
  })

  it('persists phase 2 CRUD relations and the read-only SALES matrix', async () => {
    const suffix = Date.now().toString()
    const category = await prisma.category.create({
      data: { name: `Categoría ${suffix}`, slug: `categoria-${suffix}` }
    })
    const brand = await prisma.brand.create({
      data: { name: `Marca ${suffix}`, slug: `marca-${suffix}` }
    })
    const supplier = await prisma.supplier.create({
      data: { supplierCode: `IT-${suffix}`, name: `Proveedor ${suffix}` }
    })
    const product = await prisma.product.create({
      data: {
        productCode: `PRD-IT-${suffix}`,
        sku: `SKU-IT-${suffix}`,
        name: 'Producto CRUD',
        slug: `producto-crud-${suffix}`,
        categoryId: category.id,
        brandId: brand.id,
        priceMode: 'FIXED',
        price: '100.00',
        supplierProducts: {
          create: {
            supplierId: supplier.id,
            supplierCost: '70.00',
            supplierStock: 5
          }
        }
      },
      include: { supplierProducts: true }
    })

    try {
      const [updatedCategory, updatedBrand, updatedSupplier, updatedProduct, sales] = await Promise.all([
        prisma.category.update({ where: { id: category.id }, data: { description: 'Actualizada' } }),
        prisma.brand.update({ where: { id: brand.id }, data: { description: 'Actualizada' } }),
        prisma.supplier.update({ where: { id: supplier.id }, data: { active: false } }),
        prisma.product.update({ where: { id: product.id }, data: { price: '120.00' } }),
        prisma.role.findUniqueOrThrow({
          where: { code: 'SALES' },
          include: { permissions: { include: { permission: true } } }
        })
      ])

      expect(updatedCategory.description).toBe('Actualizada')
      expect(updatedBrand.description).toBe('Actualizada')
      expect(updatedSupplier.active).toBe(false)
      expect(updatedProduct.price?.toFixed(2)).toBe('120.00')
      expect(product.supplierProducts[0]).toMatchObject({ supplierStock: 5 })
      const salesPermissions = sales.permissions.map((item) => item.permission.code)
      expect(salesPermissions).toContain('products.view')
      expect(salesPermissions).toContain('inventory.view')
      expect(salesPermissions).not.toContain('products.update')
      expect(salesPermissions).not.toContain('inventory.adjust')
    } finally {
      await prisma.supplierProduct.deleteMany({ where: { productId: product.id } })
      await prisma.product.delete({ where: { id: product.id } })
      await prisma.supplier.delete({ where: { id: supplier.id } })
      await prisma.brand.delete({ where: { id: brand.id } })
      await prisma.category.delete({ where: { id: category.id } })
    }
  })
})
