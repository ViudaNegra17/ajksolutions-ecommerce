import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBuyNowStore } from '../../app/stores/buy-now'
import { useCartStore } from '../../app/stores/cart'
import { productSchema } from '../../shared/schemas/product.schema'
import { createDigitalAvailability, resolvePublicProductAction } from '../../shared/utils/public-catalog'

const physical = {
  productId: '11111111-1111-4111-8111-111111111111',
  variantId: null,
  quantity: 1,
  productType: 'PHYSICAL' as const,
  name: 'Equipo',
  variantName: null,
  slug: 'equipo',
  image: null,
  displayPrice: '10.00'
}

describe('simplificación del dominio digital de Fase 6.2', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('acepta únicamente PHYSICAL en el carrito', () => {
    const cart = useCartStore()
    cart.hydrate()
    expect(cart.addItem(physical)).toBe(true)
    expect(cart.addItem({ ...physical, productId: crypto.randomUUID(), productType: 'DIGITAL' })).toBe(false)
    expect(cart.items).toHaveLength(1)
  })

  it('migra carrito legacy retirando DIGITAL y preservando PHYSICAL', () => {
    localStorage.setItem(
      'ajksolutions-cart',
      JSON.stringify({
        version: 2,
        items: [physical, { ...physical, productId: crypto.randomUUID(), productType: 'DIGITAL' }]
      })
    )
    const cart = useCartStore()
    cart.hydrate()
    expect(cart.items).toEqual([physical])
    expect(JSON.parse(localStorage.getItem('ajksolutions-cart') || '{}').version).toBe(3)
  })

  it('Buy Now representa DIGITAL con cantidad fija uno', () => {
    const buyNow = useBuyNowStore()
    buyNow.hydrate()
    buyNow.start(physical.productId, null)
    expect(buyNow.item).toEqual({
      productId: physical.productId,
      variantId: null,
      quantity: 1,
      productType: 'DIGITAL'
    })
  })

  it('DIGITAL está disponible comercialmente sin consultar stock', () => {
    expect(createDigitalAvailability()).toEqual({
      source: 'DIGITAL',
      available: true,
      ownStock: 0,
      supplierAvailable: false,
      estimatedLeadTimeDays: null
    })
  })

  it('ProductType acepta DIGITAL y rechaza LICENSE', () => {
    const base = {
      sku: 'DIGITAL-1',
      name: 'Licencia digital',
      categoryId: crypto.randomUUID(),
      priceMode: 'FIXED',
      price: '10.00'
    }
    expect(productSchema.safeParse({ ...base, productType: 'DIGITAL', manageStock: false }).success).toBe(
      true
    )
    expect(productSchema.safeParse({ ...base, productType: 'DIGITAL', manageStock: true }).success).toBe(
      false
    )
    expect(productSchema.safeParse({ ...base, productType: 'LICENSE' }).success).toBe(false)
  })

  it('resuelve CTA por ProductType y PriceMode', () => {
    const availability = createDigitalAvailability()
    const fixedPrice = {
      mode: 'FIXED' as const,
      amount: '10.00',
      net: '10.00',
      tax: '0.00',
      currency: 'USD',
      taxIncludedInDisplayedPrice: true
    }
    expect(
      resolvePublicProductAction({
        productType: 'PHYSICAL',
        price: fixedPrice,
        availability,
        hasVariants: false
      })
    ).toBe('ADD_TO_CART')
    expect(
      resolvePublicProductAction({
        productType: 'DIGITAL',
        price: fixedPrice,
        availability,
        hasVariants: false
      })
    ).toBe('BUY_NOW')
    expect(
      resolvePublicProductAction({
        productType: 'DIGITAL',
        price: { ...fixedPrice, mode: 'CONTACT', amount: null },
        availability,
        hasVariants: false
      })
    ).toBe('CONTACT')
  })

  it('usa /productos como ruta comercial única para DIGITAL', () => {
    const card = readFileSync('app/components/public/ProductCard.vue', 'utf8')
    expect(card).toContain('/productos/')
    expect(card).not.toContain('/licencias/')
  })

  it('la migración protege datos y transforma snapshots y fuentes históricas', () => {
    const sql = readFileSync(
      'prisma/migrations/20260903223000_phase6_2_simplify_digital_domain/migration.sql',
      'utf8'
    )
    const firstDestructiveStatement = Math.min(
      sql.indexOf('DROP TRIGGER'),
      sql.indexOf('DROP FUNCTION'),
      sql.indexOf('UPDATE products'),
      sql.indexOf('DROP TABLE')
    )
    const precheckEnd = sql.indexOf('$$;', sql.indexOf('DO $$'))

    expect(sql).toContain('PHASE6_2_DIGITAL_LICENSE_HISTORY_REQUIRES_MANUAL_REVIEW')
    expect(sql).toContain('PHASE6_2_DIGITAL_FULFILLMENT_DATA_REQUIRES_MANUAL_REVIEW')
    expect(sql).toContain('PHASE6_2_DIGITAL_LICENSE_DATA_REQUIRES_MANUAL_BACKUP')
    expect(sql).toContain(String.raw`to_regclass('public.digital_license_history')`)
    expect(sql).toContain(String.raw`to_regclass('public.digital_fulfillments')`)
    expect(sql).toContain(String.raw`to_regclass('public.digital_licenses')`)
    expect(firstDestructiveStatement).toBeGreaterThan(precheckEnd)
    expect(sql).toContain('UPDATE products SET "productType" = \'DIGITAL\'')
    expect(sql).toContain('UPDATE order_items SET "productTypeSnapshot" = \'DIGITAL\'')
    expect(sql).toContain('UPDATE order_items SET "availabilitySource" = \'DIGITAL\'')
  })
})
