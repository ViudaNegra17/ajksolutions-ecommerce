import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import 'dotenv/config'

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip
let prisma: typeof import('../../server/utils/prisma').prisma
let orderService: typeof import('../../server/services/order.service').orderService
let orderStatusService: typeof import('../../server/services/order-status.service').orderStatusService

describeWithDatabase('DIGITAL Buy Now sin inventario interno en Fase 6.2', () => {
  const suffix = Date.now().toString()
  const ids: Record<string, string> = {}
  const event = {} as never

  beforeAll(async () => {
    vi.stubGlobal('getRequestIP', () => '203.0.113.62')
    vi.stubGlobal('getHeader', () => undefined)
    vi.stubEnv('NUXT_CHECKOUT_SIGNING_SECRET', 'phase-6-2-checkout-signing-secret-123456')
    vi.stubEnv('NUXT_ORDER_HANDOFF_SECRET', 'phase-6-2-order-handoff-secret-1234567')
    ;({ prisma } = await import('../../server/utils/prisma'))
    ;({ orderService } = await import('../../server/services/order.service'))
    ;({ orderStatusService } = await import('../../server/services/order-status.service'))

    const category = await prisma.category.create({
      data: { name: `Digital 6.2 ${suffix}`, slug: `digital-62-${suffix}`, active: true }
    })
    const digital = await prisma.product.create({
      data: {
        productCode: `D62${suffix}`,
        sku: `D62-${suffix}`,
        name: 'Licencia manual Fase 6.2',
        slug: `licencia-manual-${suffix}`,
        categoryId: category.id,
        productType: 'DIGITAL',
        manageStock: false,
        priceMode: 'FIXED',
        price: '20.00',
        taxRate: '0',
        active: true
      }
    })
    const contact = await prisma.product.create({
      data: {
        productCode: `C62${suffix}`,
        sku: `C62-${suffix}`,
        name: 'Digital por consultar Fase 6.2',
        slug: `digital-contacto-${suffix}`,
        categoryId: category.id,
        productType: 'DIGITAL',
        manageStock: false,
        priceMode: 'CONTACT',
        active: true
      }
    })
    const physical = await prisma.product.create({
      data: {
        productCode: `P62${suffix}`,
        sku: `P62-${suffix}`,
        name: 'Físico Fase 6.2',
        slug: `fisico-62-${suffix}`,
        categoryId: category.id,
        productType: 'PHYSICAL',
        priceMode: 'FIXED',
        price: '5.00',
        taxRate: '0',
        active: true
      }
    })
    const location = await prisma.inventoryLocation.findUniqueOrThrow({
      where: { locationCode: 'LOC-000001' }
    })
    const stock = await prisma.inventoryStock.create({
      data: { locationId: location.id, productId: physical.id, quantityOnHand: 5 }
    })
    const actor = await prisma.user.findFirstOrThrow({
      where: { active: true, roles: { some: { role: { code: 'SUPER_ADMIN' } } } }
    })
    Object.assign(ids, {
      category: category.id,
      digital: digital.id,
      contact: contact.id,
      physical: physical.id,
      stock: stock.id,
      actor: actor.id
    })
  })

  afterAll(async () => {
    if (!prisma) return
    const orders = await prisma.order.findMany({
      where: { items: { some: { productId: { in: [ids.digital, ids.physical] } } } },
      select: { id: true, customerId: true }
    })
    await prisma.auditLog.deleteMany({ where: { entityId: { in: orders.map((order) => order.id) } } })
    await prisma.inventoryMovement.deleteMany({
      where: { referenceType: 'ORDER', referenceId: { in: orders.map((order) => order.id) } }
    })
    await prisma.order.deleteMany({ where: { id: { in: orders.map((order) => order.id) } } })
    await prisma.address.deleteMany({
      where: { customerId: { in: orders.map((order) => order.customerId) } }
    })
    await prisma.customer.deleteMany({ where: { id: { in: orders.map((order) => order.customerId) } } })
    await prisma.inventoryStock.deleteMany({ where: { id: ids.stock } })
    await prisma.product.deleteMany({
      where: { id: { in: [ids.digital, ids.contact, ids.physical] } }
    })
    await prisma.category.deleteMany({ where: { id: ids.category } })
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    await prisma.$disconnect()
  })

  it('crea un pedido DIGITAL individual sin Address, stock, licencias ni fulfillment', async () => {
    const items = [{ productId: ids.digital, variantId: null, quantity: 1 }]
    const preview = await orderService.preview({ items, deliveryType: 'DIGITAL' })
    expect(preview.items[0]).toMatchObject({
      productType: 'DIGITAL',
      availabilitySource: 'DIGITAL',
      quantity: 1
    })
    const requestId = crypto.randomUUID()
    const input = {
      requestId,
      items,
      checkoutFingerprint: preview.checkoutFingerprint,
      customer: {
        firstName: 'Cliente',
        lastName: 'Digital',
        email: `digital-${suffix}@example.com`,
        whatsapp: '0996200001'
      },
      deliveryType: 'DIGITAL' as const,
      address: null,
      notes: null,
      website: '',
      startedAt: Date.now() - 2000
    }
    const first = await orderService.create(event, input)
    const retry = await orderService.create(event, input)
    expect(retry.orderNumber).toBe(first.orderNumber)
    const stored = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: first.orderNumber },
      include: { items: true, deliveryAddress: true }
    })
    ids.order = stored.id
    expect(stored).toMatchObject({
      deliveryType: 'DIGITAL',
      addressId: null,
      shippingPendingQuote: false
    })
    expect(stored.shipping.toFixed(2)).toBe('0.00')
    expect(stored.deliveryAddress).toBeNull()
    expect(stored.items).toHaveLength(1)
    expect(stored.items[0]).toMatchObject({
      productTypeSnapshot: 'DIGITAL',
      availabilitySource: 'DIGITAL',
      quantity: 1
    })
    expect(await prisma.inventoryMovement.count({ where: { referenceId: stored.id } })).toBe(0)
    const tables = await prisma.$queryRaw<Array<{ licenses: string | null; fulfillments: string | null }>>`
      SELECT to_regclass('public.digital_licenses')::text AS licenses,
             to_regclass('public.digital_fulfillments')::text AS fulfillments
    `
    expect(tables[0]).toEqual({ licenses: null, fulfillments: null })
  })

  it('rechaza quantity mayor a uno, mezcla y DIGITAL CONTACT', async () => {
    await expect(
      orderService.preview({
        items: [{ productId: ids.digital, variantId: null, quantity: 2 }],
        deliveryType: 'DIGITAL'
      })
    ).rejects.toMatchObject({
      statusCode: 422,
      data: { error: { code: 'DIGITAL_QUANTITY_INVALID' } }
    })
    await expect(
      orderService.preview({
        items: [
          { productId: ids.digital, variantId: null, quantity: 1 },
          { productId: ids.physical, variantId: null, quantity: 1 }
        ],
        deliveryType: 'DIGITAL'
      })
    ).rejects.toMatchObject({
      statusCode: 422,
      data: { error: { code: 'DIGITAL_BUY_NOW_REQUIRED' } }
    })
    await expect(
      orderService.preview({
        items: [{ productId: ids.contact, variantId: null, quantity: 1 }],
        deliveryType: 'DIGITAL'
      })
    ).rejects.toMatchObject({
      statusCode: 422,
      data: { error: { code: 'PRODUCT_REQUIRES_CONTACT' } }
    })
  })

  it('cancela DIGITAL cambiando solo Order', async () => {
    const beforeMovements = await prisma.inventoryMovement.count({ where: { referenceId: ids.order } })
    await orderStatusService.change(event, ids.actor, ids.order, 'CANCELLED', 'Cancelación digital 6.2')
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: ids.order },
      include: { history: true }
    })
    expect(order.status).toBe('CANCELLED')
    expect(order.history.at(-1)?.toStatus).toBe('CANCELLED')
    expect(await prisma.inventoryMovement.count({ where: { referenceId: ids.order } })).toBe(beforeMovements)
  })
})
