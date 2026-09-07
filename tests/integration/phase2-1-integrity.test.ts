import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import 'dotenv/config'
import { productSchema } from '../../shared/schemas/product.schema'
import { nextCommercialCode } from '../../server/repositories/code.repository'
import { productRepository } from '../../server/repositories/catalog.repository'

const databaseConfigured = Boolean(process.env.DATABASE_URL)
const describeWithDatabase = databaseConfigured ? describe : describe.skip
let prisma: typeof import('../../server/utils/prisma').prisma

describeWithDatabase('Phase 2.1 PostgreSQL integrity hardening', () => {
  const suffix = Date.now().toString()
  const ids = {
    category: '',
    deletedCategory: '',
    productA: '',
    productB: '',
    contactProduct: '',
    deletedProduct: '',
    variantA: '',
    variantB: '',
    supplier: '',
    location: '',
    user: '',
    colorAttribute: '',
    storageAttribute: '',
    blackOption: '',
    storageOption: '',
    productAttributeValue: ''
  }
  const productASku = `H21-PA-${suffix}`
  const variantBSku = `H21-VB-${suffix}`

  beforeAll(async () => {
    ;({ prisma } = await import('../../server/utils/prisma'))
    const [location, user] = await Promise.all([
      prisma.inventoryLocation.findFirstOrThrow({
        where: { active: true, deletedAt: null }
      }),
      prisma.user.findFirstOrThrow({ where: { active: true, deletedAt: null } })
    ])
    ids.location = location.id
    ids.user = user.id

    const category = await prisma.category.create({
      data: { name: `Hardening ${suffix}`, slug: `hardening-${suffix}` }
    })
    ids.category = category.id
    const deletedCategory = await prisma.category.create({
      data: {
        name: `Eliminada ${suffix}`,
        slug: `eliminada-${suffix}`,
        active: false,
        deletedAt: new Date()
      }
    })
    ids.deletedCategory = deletedCategory.id

    const [productA, productB, contactProduct, deletedProduct] = await Promise.all([
      prisma.product.create({
        data: {
          productCode: `H21-PA-${suffix}`,
          sku: productASku,
          name: 'Producto A hardening',
          slug: `producto-a-hardening-${suffix}`,
          categoryId: category.id,
          priceMode: 'FIXED',
          price: '100'
        }
      }),
      prisma.product.create({
        data: {
          productCode: `H21-PB-${suffix}`,
          sku: `H21-PB-${suffix}`,
          name: 'Producto B hardening',
          slug: `producto-b-hardening-${suffix}`,
          categoryId: category.id,
          priceMode: 'FIXED',
          price: '100'
        }
      }),
      prisma.product.create({
        data: {
          productCode: `H21-PC-${suffix}`,
          sku: `H21-PC-${suffix}`,
          name: 'Producto CONTACT hardening',
          slug: `producto-contact-hardening-${suffix}`,
          categoryId: category.id,
          priceMode: 'CONTACT',
          price: null
        }
      }),
      prisma.product.create({
        data: {
          productCode: `H21-PD-${suffix}`,
          sku: `H21-PD-${suffix}`,
          name: 'Producto eliminado hardening',
          slug: `producto-eliminado-hardening-${suffix}`,
          categoryId: category.id,
          priceMode: 'FIXED',
          price: '10',
          active: false,
          deletedAt: new Date()
        }
      })
    ])
    ids.productA = productA.id
    ids.productB = productB.id
    ids.contactProduct = contactProduct.id
    ids.deletedProduct = deletedProduct.id

    const [variantA, variantB, supplier, color, storage] = await Promise.all([
      prisma.productVariant.create({
        data: {
          productId: productA.id,
          variantCode: `H21-VA-${suffix}`,
          sku: `H21-VA-${suffix}`,
          combinationKey: 'base-a'
        }
      }),
      prisma.productVariant.create({
        data: {
          productId: productB.id,
          variantCode: `H21-VB-${suffix}`,
          sku: variantBSku,
          combinationKey: 'base-b'
        }
      }),
      prisma.supplier.create({
        data: { supplierCode: `H21-S-${suffix}`, name: `Proveedor hardening ${suffix}` }
      }),
      prisma.attribute.create({
        data: {
          name: `Color ${suffix}`,
          slug: `color-${suffix}`,
          type: 'SELECT',
          variant: true,
          options: { create: { value: 'black', label: 'Negro' } }
        },
        include: { options: true }
      }),
      prisma.attribute.create({
        data: {
          name: `Storage ${suffix}`,
          slug: `storage-${suffix}`,
          type: 'SELECT',
          variant: true,
          options: { create: { value: '256gb', label: '256 GB' } }
        },
        include: { options: true }
      })
    ])
    ids.variantA = variantA.id
    ids.variantB = variantB.id
    ids.supplier = supplier.id
    ids.colorAttribute = color.id
    ids.storageAttribute = storage.id
    ids.blackOption = color.options[0]!.id
    ids.storageOption = storage.options[0]!.id

    await prisma.productVariant.update({
      where: { id: variantA.id },
      data: { combinationKey: ids.blackOption }
    })

    const productAttributeValue = await prisma.productAttributeValue.create({
      data: { productId: productA.id, attributeId: color.id }
    })
    ids.productAttributeValue = productAttributeValue.id
  })

  afterAll(async () => {
    if (!prisma) return
    await prisma.inventoryMovement.deleteMany({
      where: { productId: { in: [ids.productA, ids.productB, ids.contactProduct, ids.deletedProduct] } }
    })
    await prisma.product.deleteMany({
      where: { id: { in: [ids.productA, ids.productB, ids.contactProduct, ids.deletedProduct] } }
    })
    await prisma.supplier.deleteMany({ where: { id: ids.supplier } })
    await prisma.attribute.deleteMany({
      where: { id: { in: [ids.colorAttribute, ids.storageAttribute] } }
    })
    await prisma.category.deleteMany({
      where: { id: { in: [ids.category, ids.deletedCategory] } }
    })
    await prisma.$disconnect()
  })

  it('rejects a variant that belongs to another product in stock, movement and supplier relation', async () => {
    await expect(
      prisma.inventoryStock.create({
        data: {
          locationId: ids.location,
          productId: ids.productA,
          variantId: ids.variantB
        }
      })
    ).rejects.toThrow()
    await expect(
      prisma.inventoryMovement.create({
        data: {
          movementCode: `H21-MM-${suffix}`,
          locationId: ids.location,
          productId: ids.productA,
          variantId: ids.variantB,
          type: 'INITIAL',
          quantity: 1,
          quantityBefore: 0,
          quantityAfter: 1,
          reason: 'Prueba de integridad',
          createdById: ids.user
        }
      })
    ).rejects.toThrow()
    await expect(
      prisma.supplierProduct.create({
        data: {
          supplierId: ids.supplier,
          productId: ids.productA,
          variantId: ids.variantB
        }
      })
    ).rejects.toThrow()
  })

  it('rejects options that belong to another attribute', async () => {
    await expect(
      prisma.variantAttributeValue.create({
        data: {
          variantId: ids.variantA,
          attributeId: ids.colorAttribute,
          optionId: ids.storageOption
        }
      })
    ).rejects.toThrow()
    await expect(
      prisma.productAttributeValueOption.create({
        data: {
          productAttributeValueId: ids.productAttributeValue,
          attributeId: ids.colorAttribute,
          optionId: ids.storageOption
        }
      })
    ).rejects.toThrow()
  })

  it('enforces a normalized global SKU between products and variants in both directions', async () => {
    await expect(
      prisma.productVariant.create({
        data: {
          productId: ids.productB,
          variantCode: `H21-VC-${suffix}`,
          sku: `  ${productASku.toLowerCase()}  `,
          combinationKey: 'sku-conflict'
        }
      })
    ).rejects.toThrow()
    await expect(
      prisma.product.create({
        data: {
          productCode: `H21-PX-${suffix}`,
          sku: variantBSku.toLowerCase(),
          name: 'SKU duplicado',
          slug: `sku-duplicado-${suffix}`,
          categoryId: ids.category,
          priceMode: 'FIXED',
          price: '1'
        }
      })
    ).rejects.toThrow()
  })

  it('keeps one simple stock and one simple supplier relation when variantId is null', async () => {
    await prisma.inventoryStock.create({
      data: { locationId: ids.location, productId: ids.productA }
    })
    await expect(
      prisma.inventoryStock.create({
        data: { locationId: ids.location, productId: ids.productA }
      })
    ).rejects.toThrow()

    await prisma.supplierProduct.create({
      data: { supplierId: ids.supplier, productId: ids.productA }
    })
    await expect(
      prisma.supplierProduct.create({
        data: { supplierId: ids.supplier, productId: ids.productA }
      })
    ).rejects.toThrow()
  })

  it('keeps one primary image and one variant combination per product', async () => {
    await prisma.productImage.create({
      data: { productId: ids.productA, url: 'https://example.com/primary-a.jpg', isPrimary: true }
    })
    await expect(
      prisma.productImage.create({
        data: { productId: ids.productA, url: 'https://example.com/primary-b.jpg', isPrimary: true }
      })
    ).rejects.toThrow()
    await expect(
      prisma.productVariant.create({
        data: {
          productId: ids.productA,
          variantCode: `H21-VD-${suffix}`,
          sku: `H21-VD-${suffix}`,
          combinationKey: ids.blackOption
        }
      })
    ).rejects.toThrow()
  })

  it('rejects negative stock, over-reservation and CONTACT variant overrides', async () => {
    await expect(
      prisma.inventoryStock.create({
        data: {
          locationId: ids.location,
          productId: ids.productB,
          quantityOnHand: -1
        }
      })
    ).rejects.toThrow()
    await expect(
      prisma.inventoryStock.create({
        data: {
          locationId: ids.location,
          productId: ids.productB,
          quantityOnHand: 2,
          quantityReserved: 3
        }
      })
    ).rejects.toThrow()
    await expect(
      prisma.productVariant.create({
        data: {
          productId: ids.contactProduct,
          variantCode: `H21-VE-${suffix}`,
          sku: `H21-VE-${suffix}`,
          combinationKey: 'contact-price',
          priceOverride: '50'
        }
      })
    ).rejects.toThrow()
  })

  it('excludes soft-deleted products and categories from standard repositories', async () => {
    const page = await productRepository.list({
      page: 1,
      pageSize: 10,
      search: `H21-PD-${suffix}`
    })
    expect(page.items).toHaveLength(0)
    expect(await productRepository.categoryDefinition(ids.deletedCategory)).toBeNull()
  })

  it('reactivates the historical variant row when its combination is recreated', async () => {
    await prisma.productVariant.update({
      where: { id: ids.variantA },
      data: { active: false, deletedAt: new Date() }
    })
    const input = productSchema.parse({
      sku: productASku,
      name: 'Producto A hardening',
      categoryId: ids.category,
      priceMode: 'FIXED',
      price: '100',
      variants: [
        {
          sku: `H21-VA-${suffix}`,
          optionIds: [ids.blackOption]
        }
      ]
    })

    const updated = await productRepository.update(ids.productA, input, `producto-a-hardening-${suffix}`)
    expect(updated.variants).toHaveLength(1)
    expect(updated.variants[0]).toMatchObject({
      id: ids.variantA,
      active: true,
      deletedAt: null
    })
  })

  it('generates unique codes under concurrent atomic increments', async () => {
    const codes = await Promise.all(
      Array.from({ length: 8 }, () =>
        prisma.$transaction((transaction) => nextCommercialCode(transaction, 'product'))
      )
    )
    expect(new Set(codes).size).toBe(codes.length)
  })
})
