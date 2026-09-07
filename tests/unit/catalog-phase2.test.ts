import { describe, expect, it, vi } from 'vitest'
import type { Prisma } from '@prisma/client'
import { createSlug } from '../../shared/utils/slug'
import { productSchema, supplierProductSchema } from '../../shared/schemas/product.schema'
import { inventoryAdjustmentSchema } from '../../shared/schemas/inventory.schema'
import { calculateEffectivePrice, calculateProductPrice } from '../../server/services/price.service'
import { nextCommercialCode } from '../../server/repositories/code.repository'
import { isAttributeValueShapeValid, variantBelongsToProduct } from '../../shared/utils/catalog-integrity'

const categoryId = '11111111-1111-4111-8111-111111111111'

function product(overrides: Record<string, unknown> = {}) {
  return {
    sku: 'SKU-001',
    name: 'Producto de prueba',
    categoryId,
    priceMode: 'FIXED',
    price: '100.00',
    active: true,
    ...overrides
  }
}

describe('catálogo de fase 2', () => {
  it('genera slugs normalizados y estables', () => {
    expect(createSlug('  Cámaras & Seguridad 4K  ')).toBe('camaras-seguridad-4k')
  })

  it('distingue precio fijo de consultar precio sin ceros ficticios', () => {
    expect(productSchema.safeParse(product()).success).toBe(true)
    expect(productSchema.safeParse(product({ priceMode: 'CONTACT', price: null })).success).toBe(true)
    expect(productSchema.safeParse(product({ priceMode: 'FIXED', price: null })).success).toBe(false)
    expect(productSchema.safeParse(product({ priceMode: 'CONTACT', price: '0.00' })).success).toBe(false)
    expect(productSchema.safeParse(product({ price: '0.00' })).success).toBe(false)
  })

  it('aplica las reglas de priceOverride para FIXED y CONTACT', () => {
    const optionId = '22222222-2222-4222-8222-222222222222'
    expect(
      productSchema.safeParse(
        product({
          priceMode: 'CONTACT',
          price: null,
          variants: [{ sku: 'VAR-1', priceOverride: 50, optionIds: [optionId] }]
        })
      ).success
    ).toBe(false)
    expect(
      productSchema.safeParse(
        product({ variants: [{ sku: 'VAR-1', priceOverride: null, optionIds: [optionId] }] })
      ).success
    ).toBe(true)
    expect(
      productSchema.safeParse(
        product({ variants: [{ sku: 'VAR-1', priceOverride: 50, optionIds: [optionId] }] })
      ).success
    ).toBe(true)
  })

  it('normaliza SKU y evita duplicados entre producto y variantes', () => {
    const optionId = '22222222-2222-4222-8222-222222222222'
    const parsed = productSchema.parse(product({ sku: ' abc-123 ' }))
    expect(parsed.sku).toBe('ABC-123')
    expect(
      productSchema.safeParse(
        product({ sku: 'abc-123', variants: [{ sku: ' ABC-123 ', optionIds: [optionId] }] })
      ).success
    ).toBe(false)
  })

  it('resuelve un único precio efectivo usando Decimal', () => {
    expect(calculateEffectivePrice({ priceMode: 'CONTACT', price: null, priceOverride: '50' })).toBeNull()
    expect(
      calculateEffectivePrice({ priceMode: 'FIXED', price: '100', priceOverride: null })?.toFixed(2)
    ).toBe('100.00')
    expect(
      calculateEffectivePrice({ priceMode: 'FIXED', price: '100', priceOverride: '80' })?.toFixed(2)
    ).toBe('80.00')
  })

  it('valida forma de atributos y pertenencia producto-variante', () => {
    expect(
      isAttributeValueShapeValid('SELECT', {
        textValue: null,
        numberValue: null,
        booleanValue: null,
        optionIds: ['option']
      })
    ).toBe(true)
    expect(
      isAttributeValueShapeValid('BOOLEAN', {
        booleanValue: true,
        optionIds: ['select-option']
      })
    ).toBe(false)
    expect(variantBelongsToProduct('product-a', { productId: 'product-a' })).toBe(true)
    expect(variantBelongsToProduct('product-a', { productId: 'product-b' })).toBe(false)
    expect(variantBelongsToProduct('product-a', null)).toBe(false)
  })

  it('normaliza a texto los valores decimales numéricos enviados por el formulario', () => {
    const supplierId = '22222222-2222-4222-8222-222222222222'
    const optionId = '33333333-3333-4333-8333-333333333333'
    const result = productSchema.parse(
      product({
        price: 125.5,
        taxRate: 15,
        weight: 1.25,
        variants: [{ sku: 'VAR-NUM', priceOverride: 110.25, optionIds: [optionId] }],
        supplierProducts: [{ supplierId, supplierCost: 80.5, supplierStock: 4 }]
      })
    )

    expect(result.price).toBe('125.5')
    expect(result.taxRate).toBe('15')
    expect(result.weight).toBe('1.25')
    expect(result.variants[0]?.priceOverride).toBe('110.25')
    expect(result.supplierProducts[0]?.supplierCost).toBe('80.5')
  })

  it('rechaza imágenes primarias y combinaciones de variantes duplicadas', () => {
    const optionId = '22222222-2222-4222-8222-222222222222'
    const result = productSchema.safeParse(
      product({
        images: [
          { url: 'https://example.com/a.jpg', isPrimary: true },
          { url: 'https://example.com/b.jpg', isPrimary: true }
        ],
        variants: [
          { sku: 'VAR-1', optionIds: [optionId] },
          { sku: 'VAR-2', optionIds: [optionId] }
        ]
      })
    )
    expect(result.success).toBe(false)
  })

  it('calcula IVA configurable con Decimal sin usar coma flotante', () => {
    const excluded = calculateProductPrice({ price: '100.00', taxRate: '15.00', priceIncludesTax: false })
    expect(excluded.net.toFixed(2)).toBe('100.00')
    expect(excluded.tax.toFixed(2)).toBe('15.00')
    expect(excluded.total.toFixed(2)).toBe('115.00')

    const included = calculateProductPrice({ price: '115.00', taxRate: '15.00', priceIncludesTax: true })
    expect(included.net.toFixed(2)).toBe('100.00')
    expect(included.tax.toFixed(2)).toBe('15.00')
    expect(included.total.toFixed(2)).toBe('115.00')
  })

  it('genera códigos comerciales mediante una secuencia atómica', async () => {
    const upsert = vi.fn().mockResolvedValue({ key: 'product', value: 42 })
    const transaction = { codeSequence: { upsert } } as unknown as Prisma.TransactionClient
    await expect(nextCommercialCode(transaction, 'product')).resolves.toBe('PRD-000042')
    expect(upsert).toHaveBeenCalledWith({
      where: { key: 'product' },
      update: { value: { increment: 1 } },
      create: { key: 'product', value: 1 }
    })
  })

  it('valida ajustes positivos y proveedores sin stock negativo', () => {
    expect(
      inventoryAdjustmentSchema.safeParse({
        locationId: categoryId,
        productId: categoryId,
        type: 'ADJUSTMENT_IN',
        quantity: 2,
        reason: 'Conteo físico'
      }).success
    ).toBe(true)
    expect(
      inventoryAdjustmentSchema.safeParse({
        locationId: categoryId,
        productId: categoryId,
        type: 'ADJUSTMENT_OUT',
        quantity: 0,
        reason: 'Mal'
      }).success
    ).toBe(false)
    expect(
      supplierProductSchema.safeParse({
        supplierId: categoryId,
        supplierStock: -1
      }).success
    ).toBe(false)
  })
})
