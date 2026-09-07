import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { Prisma } from '@prisma/client'
import { cartItemSchema, normalizeCartItems } from '../../shared/schemas/cart.schema'
import { checkoutPreviewSchema, createOrderSchema } from '../../shared/schemas/checkout.schema'
import { orderWhatsAppOpenedSchema } from '../../shared/schemas/order.schema'
import { decideAvailabilitySource, canTransitionOrder } from '../../shared/utils/orders'
import { addressBelongsToCustomer, isPickupShippingConsistent } from '../../shared/utils/order-integrity'
import { calculateProductPrice } from '../../server/services/price.service'
import {
  createOrderHandoffToken,
  hashOrderHandoffToken,
  secureEqual,
  signCheckoutFingerprint
} from '../../server/utils/order-security'
import { useCartStore } from '../../app/stores/cart'
import { enforceOrderRateLimit, resetOrderRateLimit } from '../../server/utils/order-rate-limit'

const productId = '11111111-1111-4111-8111-111111111111'

describe('carrito, checkout y pedidos de Fase 5', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.stubEnv('NUXT_CHECKOUT_SIGNING_SECRET', 'checkout-secret-for-tests-1234567890')
    vi.stubEnv('NUXT_ORDER_HANDOFF_SECRET', 'handoff-secret-for-tests-12345678901')
  })
  afterEach(() => {
    resetOrderRateLimit()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('mantiene el carrito versionado, suma cantidades y limita a 99', () => {
    const cart = useCartStore()
    cart.hydrate()
    const item = {
      productId,
      variantId: null,
      quantity: 1,
      productType: 'PHYSICAL' as const,
      name: 'SSD',
      variantName: null,
      slug: 'ssd',
      image: null,
      displayPrice: '75.00'
    }
    cart.addItem(item)
    cart.addItem({ ...item, quantity: 2 })
    expect(cart.itemCount).toBe(3)
    cart.updateQuantity(productId, null, 200)
    expect(cart.items[0]?.quantity).toBe(99)
    expect(JSON.parse(localStorage.getItem('ajksolutions-cart') || '{}').version).toBe(3)
    cart.removeItem(productId, null)
    expect(cart.items).toEqual([])
  })

  it('normaliza líneas duplicadas y rechaza cantidades abusivas', () => {
    expect(
      normalizeCartItems([
        { productId, variantId: null, quantity: 2 },
        { productId, variantId: null, quantity: 3 }
      ])
    ).toEqual([{ productId, variantId: null, quantity: 5 }])
    expect(() =>
      normalizeCartItems([
        { productId, variantId: null, quantity: 60 },
        { productId, variantId: null, quantity: 50 }
      ])
    ).toThrow()
  })

  it('rechaza campos monetarios y carritos vacíos en la frontera pública', () => {
    expect(
      cartItemSchema.safeParse({ productId, variantId: null, quantity: 1, unitPrice: '0.01' }).success
    ).toBe(false)
    expect(checkoutPreviewSchema.safeParse({ items: [], deliveryType: 'PICKUP' }).success).toBe(false)
    const base = {
      requestId: crypto.randomUUID(),
      items: [{ productId, variantId: null, quantity: 1 }],
      checkoutFingerprint: 'A'.repeat(43),
      customer: { firstName: 'Ana', lastName: 'Pérez', whatsapp: '0999999999' },
      deliveryType: 'DELIVERY',
      website: '',
      startedAt: Date.now() - 2000
    }
    expect(createOrderSchema.safeParse(base).success).toBe(false)
    expect(createOrderSchema.safeParse({ ...base, deliveryType: 'PICKUP' }).success).toBe(true)
    expect(orderWhatsAppOpenedSchema.safeParse({ orderNumber: 'ORD-000001' }).success).toBe(false)
  })

  it('calcula neto, impuesto y total con Decimal', () => {
    const value = calculateProductPrice({
      price: new Prisma.Decimal('115.00'),
      taxRate: '15',
      priceIncludesTax: true
    })
    expect(value.net.toFixed(2)).toBe('100.00')
    expect(value.tax.toFixed(2)).toBe('15.00')
    expect(value.total.toFixed(2)).toBe('115.00')
  })

  it('elige una única fuente completa y nunca mezcla stock', () => {
    expect(decideAvailabilitySource(2, 10, 2)).toBe('OWN_STOCK')
    expect(decideAvailabilitySource(1, 10, 2)).toBe('SUPPLIER_STOCK')
    expect(decideAvailabilitySource(1, 1, 2)).toBeNull()
  })

  it('firma fingerprints y reconstruye el mismo handoff por requestId + orderId', () => {
    expect(signCheckoutFingerprint('same')).toBe(signCheckoutFingerprint('same'))
    expect(signCheckoutFingerprint('same')).not.toBe(signCheckoutFingerprint('other'))
    const requestId = crypto.randomUUID()
    const orderId = crypto.randomUUID()
    const first = createOrderHandoffToken(requestId, orderId)
    const second = createOrderHandoffToken(requestId, orderId)
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(first).toBe(second)
    expect(hashOrderHandoffToken(first)).toMatch(/^[0-9a-f]{64}$/)
    expect(secureEqual(first, second)).toBe(true)
  })

  it('aplica la matriz de estados y bloquea saltos operativos', () => {
    expect(canTransitionOrder('NEW', 'CONTACTED')).toBe(true)
    expect(canTransitionOrder('NEW', 'CANCELLED')).toBe(true)
    expect(canTransitionOrder('NEW', 'DELIVERED')).toBe(false)
    expect(canTransitionOrder('DELIVERED', 'CANCELLED')).toBe(false)
  })

  it('limita la creación pública a cinco intentos por ventana e IP', () => {
    vi.stubGlobal('getRequestIP', () => '203.0.113.55')
    for (let index = 0; index < 5; index += 1) expect(() => enforceOrderRateLimit({} as never)).not.toThrow()
    expect(() => enforceOrderRateLimit({} as never)).toThrow()
  })

  it('valida ownership de dirección y coherencia de shipping para PICKUP', () => {
    expect(addressBelongsToCustomer('customer-a', { customerId: 'customer-a' })).toBe(true)
    expect(addressBelongsToCustomer('customer-b', { customerId: 'customer-a' })).toBe(false)
    expect(
      isPickupShippingConsistent({
        deliveryType: 'PICKUP',
        addressId: null,
        shipping: '0.00',
        shippingPendingQuote: false
      })
    ).toBe(true)
    expect(
      isPickupShippingConsistent({
        deliveryType: 'PICKUP',
        addressId: null,
        shipping: '0.00',
        shippingPendingQuote: true
      })
    ).toBe(false)
    expect(
      isPickupShippingConsistent({
        deliveryType: 'DELIVERY',
        addressId: crypto.randomUUID(),
        shipping: '5.00',
        shippingPendingQuote: false
      })
    ).toBe(true)
  })
})
