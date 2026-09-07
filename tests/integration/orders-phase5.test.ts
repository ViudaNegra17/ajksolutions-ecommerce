import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import 'dotenv/config'
import { Prisma } from '@prisma/client'
import type { CheckoutPreviewInput, CreateOrderInput } from '../../shared/schemas/checkout.schema'

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip
let prisma: typeof import('../../server/utils/prisma').prisma
let orderService: typeof import('../../server/services/order.service').orderService
let orderStatusService: typeof import('../../server/services/order-status.service').orderStatusService

describeWithDatabase('pedidos e inventario PostgreSQL de Fase 5', () => {
  const suffix = Date.now().toString()
  const event = {} as never
  const ids: Record<string, string> = {}

  function whatsapp(index: number) {
    return `09${String(index).padStart(2, '0')}${suffix.slice(-6)}`.slice(0, 10)
  }

  function customer(index: number) {
    return { firstName: 'Cliente', lastName: `Fase ${index}`, whatsapp: whatsapp(index) }
  }

  async function preview(
    items: CheckoutPreviewInput['items'],
    deliveryType: 'PICKUP' | 'DELIVERY' = 'PICKUP'
  ) {
    return orderService.preview({ items, deliveryType })
  }

  async function create(
    items: CheckoutPreviewInput['items'],
    index: number,
    options: Partial<CreateOrderInput> = {}
  ) {
    const deliveryType = options.deliveryType || 'PICKUP'
    const current = await preview(items, deliveryType)
    return orderService.create(event, {
      requestId: options.requestId || crypto.randomUUID(),
      items,
      checkoutFingerprint: options.checkoutFingerprint || current.checkoutFingerprint,
      customer: options.customer || customer(index),
      deliveryType,
      address: options.address || null,
      notes: options.notes || null,
      website: '',
      startedAt: Date.now() - 2000
    })
  }

  async function createBareOrder(
    customerId: string,
    addressId: string | null,
    deliveryType: 'PICKUP' | 'DELIVERY',
    overrides: { shipping?: string; shippingPendingQuote?: boolean } = {}
  ) {
    const shipping = overrides.shipping || '0.00'
    return prisma.order.create({
      data: {
        orderNumber: `I51-${crypto.randomUUID().slice(0, 12)}`,
        requestId: crypto.randomUUID(),
        checkoutFingerprint: 'A'.repeat(43),
        customerId,
        addressId,
        deliveryType,
        subtotal: '10.00',
        discount: '0.00',
        tax: '0.00',
        shipping,
        total: new Prisma.Decimal('10.00').add(shipping),
        currency: 'USD',
        shippingPendingQuote: overrides.shippingPendingQuote ?? deliveryType === 'DELIVERY',
        source: 'WEB'
      }
    })
  }

  beforeAll(async () => {
    vi.stubGlobal('getRequestIP', () => '203.0.113.50')
    vi.stubGlobal('getHeader', () => undefined)
    vi.stubEnv('NUXT_CHECKOUT_SIGNING_SECRET', 'checkout-secret-for-integration-tests')
    vi.stubEnv('NUXT_ORDER_HANDOFF_SECRET', 'handoff-secret-for-integration-tests-1')
    ;({ prisma } = await import('../../server/utils/prisma'))
    ;({ orderService } = await import('../../server/services/order.service'))
    ;({ orderStatusService } = await import('../../server/services/order-status.service'))

    const category = await prisma.category.create({
      data: { name: `Pedidos ${suffix}`, slug: `pedidos-${suffix}`, active: true }
    })
    const supplier = await prisma.supplier.create({
      data: { supplierCode: `S5${suffix}`, name: `Proveedor Fase 5 ${suffix}`, active: true }
    })
    const location = await prisma.inventoryLocation.findUniqueOrThrow({
      where: { locationCode: 'LOC-000001' }
    })
    const actor = await prisma.user.findFirstOrThrow({
      where: { active: true, deletedAt: null, roles: { some: { role: { code: 'SUPER_ADMIN' } } } }
    })
    const product = await prisma.product.create({
      data: {
        productCode: `P5O${suffix}`,
        sku: `P5-OWN-${suffix}`,
        name: 'Producto propio Fase 5',
        slug: `producto-propio-${suffix}`,
        categoryId: category.id,
        productType: 'PHYSICAL',
        priceMode: 'FIXED',
        price: '115.00',
        priceIncludesTax: true,
        taxRate: '15.00',
        active: true
      }
    })
    const contact = await prisma.product.create({
      data: {
        productCode: `P5C${suffix}`,
        sku: `P5-CONTACT-${suffix}`,
        name: 'Producto contacto Fase 5',
        slug: `producto-contacto-${suffix}`,
        categoryId: category.id,
        productType: 'PHYSICAL',
        priceMode: 'CONTACT',
        active: true
      }
    })
    const supplierProduct = await prisma.product.create({
      data: {
        productCode: `P5S${suffix}`,
        sku: `P5-SUP-${suffix}`,
        name: 'Producto proveedor Fase 5',
        slug: `producto-proveedor-${suffix}`,
        categoryId: category.id,
        productType: 'PHYSICAL',
        priceMode: 'FIXED',
        price: '20.00',
        taxRate: '0',
        active: true
      }
    })
    const variantProduct = await prisma.product.create({
      data: {
        productCode: `P5V${suffix}`,
        sku: `P5-VBASE-${suffix}`,
        name: 'Producto variante Fase 5',
        slug: `producto-variante-${suffix}`,
        categoryId: category.id,
        productType: 'PHYSICAL',
        priceMode: 'FIXED',
        price: '10.00',
        taxRate: '0',
        active: true,
        variants: {
          create: {
            variantCode: `P5VR${suffix}`,
            sku: `P5-VAR-${suffix}`,
            combinationKey: 'color:azul',
            name: 'Azul',
            priceOverride: '12.00'
          }
        }
      },
      include: { variants: true }
    })
    const race = await prisma.product.create({
      data: {
        productCode: `P5R${suffix}`,
        sku: `P5-RACE-${suffix}`,
        name: 'Última unidad Fase 5',
        slug: `ultima-unidad-${suffix}`,
        categoryId: category.id,
        productType: 'PHYSICAL',
        priceMode: 'FIXED',
        price: '30.00',
        taxRate: '0',
        active: true
      }
    })
    await prisma.inventoryStock.createMany({
      data: [
        { locationId: location.id, productId: product.id, quantityOnHand: 30 },
        { locationId: location.id, productId: supplierProduct.id, quantityOnHand: 0 },
        {
          locationId: location.id,
          productId: variantProduct.id,
          variantId: variantProduct.variants[0]!.id,
          quantityOnHand: 5
        },
        { locationId: location.id, productId: race.id, quantityOnHand: 1 }
      ]
    })
    await prisma.supplierProduct.create({
      data: {
        supplierId: supplier.id,
        productId: supplierProduct.id,
        supplierStock: 10,
        leadTimeDays: 3,
        active: true
      }
    })
    Object.assign(ids, {
      category: category.id,
      supplier: supplier.id,
      location: location.id,
      actor: actor.id,
      own: product.id,
      contact: contact.id,
      supplierProduct: supplierProduct.id,
      variantProduct: variantProduct.id,
      variant: variantProduct.variants[0]!.id,
      race: race.id
    })
  })

  afterAll(async () => {
    if (!prisma) return
    const orders = await prisma.order.findMany({
      where: {
        items: { some: { productId: { in: [ids.own, ids.supplierProduct, ids.variantProduct, ids.race] } } }
      },
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
    await prisma.supplierProduct.deleteMany({ where: { productId: ids.supplierProduct } })
    await prisma.inventoryStock.deleteMany({
      where: { productId: { in: [ids.own, ids.supplierProduct, ids.variantProduct, ids.race] } }
    })
    await prisma.productVariant.deleteMany({ where: { productId: ids.variantProduct } })
    await prisma.product.deleteMany({
      where: { id: { in: [ids.own, ids.contact, ids.supplierProduct, ids.variantProduct, ids.race] } }
    })
    await prisma.supplier.deleteMany({ where: { id: ids.supplier } })
    await prisma.category.deleteMany({ where: { id: ids.category } })
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    await prisma.$disconnect()
  })

  it('crea Order FIXED, reutiliza Customer, reserva stock y conserva snapshots de dirección/producto', async () => {
    const items = [{ productId: ids.own, variantId: null, quantity: 2 }]
    const address = {
      label: 'Casa',
      recipientName: 'Cliente Entrega',
      country: 'EC',
      province: 'Pichincha',
      city: 'Quito',
      addressLine1: 'Av. Siempre Viva 123',
      addressLine2: null,
      reference: 'Frente al parque',
      postalCode: null,
      phone: null
    }
    const first = await create(items, 1, { deliveryType: 'DELIVERY', address })
    const second = await create([{ productId: ids.own, variantId: null, quantity: 1 }], 1, {
      customer: customer(1)
    })
    expect(first.orderNumber).toMatch(/^ORD-\d{6}$/)
    const stored = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: first.orderNumber },
      include: { items: true, deliveryAddress: true }
    })
    const storedSecond = await prisma.order.findUniqueOrThrow({ where: { orderNumber: second.orderNumber } })
    expect(stored.customerId).toBe(storedSecond.customerId)
    expect(stored.items[0]).toMatchObject({
      productNameSnapshot: 'Producto propio Fase 5',
      skuSnapshot: `P5-OWN-${suffix}`,
      availabilitySource: 'OWN_STOCK',
      quantity: 2
    })
    expect(stored.deliveryAddress?.addressLine1).toBe('Av. Siempre Viva 123')
    const editable = await prisma.address.findUniqueOrThrow({ where: { id: stored.addressId! } })
    await prisma.address.update({ where: { id: editable.id }, data: { addressLine1: 'Dirección futura' } })
    await prisma.product.update({
      where: { id: ids.own },
      data: { name: 'Nombre futuro del producto', sku: `P5-FUTURE-${suffix}`, price: '999.00' }
    })
    const unchanged = await prisma.order.findUniqueOrThrow({
      where: { id: stored.id },
      include: { items: true, deliveryAddress: true }
    })
    expect(unchanged.deliveryAddress?.addressLine1).toBe('Av. Siempre Viva 123')
    expect(unchanged.items[0]).toMatchObject({
      productNameSnapshot: 'Producto propio Fase 5',
      skuSnapshot: `P5-OWN-${suffix}`,
      unitPrice: new Prisma.Decimal('100.00')
    })
    await prisma.product.update({
      where: { id: ids.own },
      data: { name: 'Producto propio Fase 5', sku: `P5-OWN-${suffix}`, price: '115.00' }
    })
    const stock = await prisma.inventoryStock.findFirstOrThrow({
      where: { productId: ids.own, variantId: null }
    })
    expect(stock.quantityReserved).toBeGreaterThanOrEqual(3)
  })

  it('PostgreSQL exige Address del mismo Customer, permite PICKUP nulo y preserva Address histórico', async () => {
    const customerA = await prisma.customer.create({
      data: {
        customerCode: `I51A${suffix}`,
        firstName: 'Customer',
        lastName: 'A'
      }
    })
    const customerB = await prisma.customer.create({
      data: {
        customerCode: `I51B${suffix}`,
        firstName: 'Customer',
        lastName: 'B'
      }
    })
    const address = await prisma.address.create({
      data: {
        customerId: customerA.id,
        recipientName: 'Customer A',
        country: 'EC',
        province: 'Pichincha',
        city: 'Quito',
        addressLine1: 'Calle íntegra 123',
        reference: 'Puerta azul'
      }
    })
    const createdIds: string[] = []
    try {
      const delivery = await createBareOrder(customerA.id, address.id, 'DELIVERY')
      createdIds.push(delivery.id)
      const pickup = await createBareOrder(customerA.id, null, 'PICKUP')
      createdIds.push(pickup.id)
      await expect(createBareOrder(customerB.id, address.id, 'DELIVERY')).rejects.toMatchObject({
        code: 'P2003'
      })
      await expect(
        createBareOrder(customerA.id, null, 'PICKUP', { shippingPendingQuote: true })
      ).rejects.toMatchObject({ code: 'P2039' })

      await prisma.address.update({
        where: { id: address.id },
        data: { deletedAt: new Date(), addressLine1: 'Dirección retirada' }
      })
      const historical = await prisma.order.findUniqueOrThrow({
        where: { id: delivery.id },
        include: { address: true }
      })
      expect(historical.address?.customerId).toBe(customerA.id)
      await expect(prisma.address.delete({ where: { id: address.id } })).rejects.toMatchObject({
        code: 'P2003'
      })
    } finally {
      await prisma.order.deleteMany({ where: { id: { in: createdIds } } })
      await prisma.address.deleteMany({ where: { id: address.id } })
      await prisma.customer.deleteMany({ where: { id: { in: [customerA.id, customerB.id] } } })
    }
  })

  it('preserva snapshots y relación de Variant ante update/soft delete y restringe hard delete', async () => {
    const owner = await prisma.customer.create({
      data: {
        customerCode: `I51V${suffix}`,
        firstName: 'Historial',
        lastName: 'Variante'
      }
    })
    const order = await createBareOrder(owner.id, null, 'PICKUP')
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: ids.variantProduct,
        variantId: ids.variant,
        productCodeSnapshot: `P5V${suffix}`,
        skuSnapshot: `P5-VAR-${suffix}`,
        productNameSnapshot: 'Producto variante Fase 5',
        variantSnapshot: 'Azul',
        unitPrice: '12.00',
        taxRate: '0.00',
        taxAmount: '0.00',
        quantity: 1,
        subtotal: '12.00',
        total: '12.00',
        priceIncludesTax: false,
        availabilitySource: 'OWN_STOCK'
      }
    })
    try {
      await prisma.product.update({
        where: { id: ids.variantProduct },
        data: { name: 'Producto variante futuro', sku: `P5-VBASE-FUTURE-${suffix}`, price: '50.00' }
      })
      await prisma.productVariant.update({
        where: { id: ids.variant },
        data: {
          name: 'Rojo futuro',
          sku: `P5-VAR-FUTURE-${suffix}`,
          priceOverride: '55.00',
          active: false,
          deletedAt: new Date()
        }
      })
      const item = await prisma.orderItem.findFirstOrThrow({
        where: { orderId: order.id },
        include: { variant: true }
      })
      expect(item).toMatchObject({
        productNameSnapshot: 'Producto variante Fase 5',
        skuSnapshot: `P5-VAR-${suffix}`,
        variantSnapshot: 'Azul'
      })
      expect(item.unitPrice.toFixed(2)).toBe('12.00')
      expect(item.variant?.id).toBe(ids.variant)
      const adminOrder = await orderService.get(order.id)
      expect(adminOrder.items[0]).toMatchObject({
        productNameSnapshot: 'Producto variante Fase 5',
        variantSnapshot: 'Azul'
      })
      await expect(prisma.productVariant.delete({ where: { id: ids.variant } })).rejects.toMatchObject({
        code: 'P2003'
      })
    } finally {
      await prisma.order.delete({ where: { id: order.id } })
      await prisma.customer.delete({ where: { id: owner.id } })
      await prisma.productVariant.update({
        where: { id: ids.variant },
        data: {
          name: 'Azul',
          sku: `P5-VAR-${suffix}`,
          priceOverride: '12.00',
          active: true,
          deletedAt: null
        }
      })
      await prisma.product.update({
        where: { id: ids.variantProduct },
        data: {
          name: 'Producto variante Fase 5',
          sku: `P5-VBASE-${suffix}`,
          price: '10.00'
        }
      })
    }
  })

  it('rechaza CONTACT y variantes ausentes o ajenas', async () => {
    await expect(preview([{ productId: ids.contact, variantId: null, quantity: 1 }])).rejects.toMatchObject({
      statusCode: 422,
      data: { error: { code: 'PRODUCT_REQUIRES_CONTACT' } }
    })
    await expect(
      preview([{ productId: ids.variantProduct, variantId: null, quantity: 1 }])
    ).rejects.toMatchObject({
      statusCode: 422,
      data: { error: { code: 'INVALID_VARIANT' } }
    })
    await expect(
      preview([{ productId: ids.variantProduct, variantId: crypto.randomUUID(), quantity: 1 }])
    ).rejects.toMatchObject({
      statusCode: 422,
      data: { error: { code: 'INVALID_VARIANT' } }
    })
    const valid = await preview([{ productId: ids.variantProduct, variantId: ids.variant, quantity: 1 }])
    expect(valid.items[0]).toMatchObject({ variantId: ids.variant, total: '12.00' })
  })

  it('usa proveedor para la línea completa sin modificar InventoryStock ni supplierStock', async () => {
    const beforeStock = await prisma.inventoryStock.findFirstOrThrow({
      where: { productId: ids.supplierProduct }
    })
    const beforeSupplier = await prisma.supplierProduct.findFirstOrThrow({
      where: { productId: ids.supplierProduct }
    })
    const created = await create([{ productId: ids.supplierProduct, variantId: null, quantity: 2 }], 2)
    const order = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: created.orderNumber },
      include: { items: true }
    })
    expect(order.items[0]?.availabilitySource).toBe('SUPPLIER_STOCK')
    expect(
      (await prisma.inventoryStock.findUniqueOrThrow({ where: { id: beforeStock.id } })).quantityReserved
    ).toBe(beforeStock.quantityReserved)
    expect(
      (await prisma.supplierProduct.findUniqueOrThrow({ where: { id: beforeSupplier.id } })).supplierStock
    ).toBe(beforeSupplier.supplierStock)
    expect(await prisma.inventoryMovement.count({ where: { referenceId: order.id } })).toBe(0)

    await prisma.inventoryStock.update({ where: { id: beforeStock.id }, data: { quantityOnHand: 1 } })
    const mixed = await create([{ productId: ids.supplierProduct, variantId: null, quantity: 2 }], 22)
    const mixedOrder = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: mixed.orderNumber },
      include: { items: true }
    })
    expect(mixedOrder.items[0]?.availabilitySource).toBe('SUPPLIER_STOCK')
    expect(
      (await prisma.inventoryStock.findUniqueOrThrow({ where: { id: beforeStock.id } })).quantityReserved
    ).toBe(0)
    await prisma.inventoryStock.update({ where: { id: beforeStock.id }, data: { quantityOnHand: 0 } })
  })

  it('rechaza CHECKOUT_CHANGED si precio o resolución cambian después del preview', async () => {
    const items = [{ productId: ids.own, variantId: null, quantity: 1 }]
    const oldPreview = await preview(items)
    await prisma.product.update({ where: { id: ids.own }, data: { price: '116.00' } })
    try {
      await expect(
        orderService.create(event, {
          requestId: crypto.randomUUID(),
          items,
          checkoutFingerprint: oldPreview.checkoutFingerprint,
          customer: customer(23),
          deliveryType: 'PICKUP',
          address: null,
          notes: null,
          website: '',
          startedAt: Date.now() - 2000
        })
      ).rejects.toMatchObject({ statusCode: 409, data: { error: { code: 'CHECKOUT_CHANGED' } } })
    } finally {
      await prisma.product.update({ where: { id: ids.own }, data: { price: '115.00' } })
    }
  })

  it('mantiene idempotencia y recupera exactamente el mismo handoff tras respuesta perdida', async () => {
    const items = [{ productId: ids.own, variantId: null, quantity: 1 }]
    const current = await preview(items)
    const requestId = crypto.randomUUID()
    const input = {
      requestId,
      items,
      checkoutFingerprint: current.checkoutFingerprint,
      customer: customer(3),
      deliveryType: 'PICKUP' as const,
      address: null,
      notes: null,
      website: '',
      startedAt: Date.now() - 2000
    }
    const first = await orderService.create(event, input)
    const reserved = (
      await prisma.inventoryStock.findFirstOrThrow({ where: { productId: ids.own, variantId: null } })
    ).quantityReserved
    const retry = await orderService.create(event, input)
    expect(retry).toEqual(first)
    expect(await prisma.order.count({ where: { requestId } })).toBe(1)
    expect(
      (await prisma.inventoryStock.findFirstOrThrow({ where: { productId: ids.own, variantId: null } }))
        .quantityReserved
    ).toBe(reserved)
  })

  it('impide que dos checkouts reserven la última unidad', async () => {
    const items = [{ productId: ids.race, variantId: null, quantity: 1 }]
    const current = await preview(items)
    const input = (index: number) => ({
      requestId: crypto.randomUUID(),
      items,
      checkoutFingerprint: current.checkoutFingerprint,
      customer: customer(10 + index),
      deliveryType: 'PICKUP' as const,
      address: null,
      notes: null,
      website: '',
      startedAt: Date.now() - 2000
    })
    const results = await Promise.allSettled([
      orderService.create(event, input(1)),
      orderService.create(event, input(2))
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
    const stock = await prisma.inventoryStock.findFirstOrThrow({ where: { productId: ids.race } })
    expect(stock.quantityReserved).toBe(1)
  })

  it('cancelar libera reserva una vez y registra RELEASE e historial', async () => {
    const created = await create([{ productId: ids.own, variantId: null, quantity: 2 }], 4)
    const order = await prisma.order.findUniqueOrThrow({ where: { orderNumber: created.orderNumber } })
    const before = await prisma.inventoryStock.findFirstOrThrow({
      where: { productId: ids.own, variantId: null }
    })
    await orderStatusService.change(event, ids.actor, order.id, 'CANCELLED', 'Cliente desistió')
    const after = await prisma.inventoryStock.findUniqueOrThrow({ where: { id: before.id } })
    expect(after.quantityReserved).toBe(before.quantityReserved - 2)
    expect(await prisma.inventoryMovement.count({ where: { referenceId: order.id, type: 'RELEASE' } })).toBe(
      1
    )
    expect(
      await prisma.orderStatusHistory.count({ where: { orderId: order.id, toStatus: 'CANCELLED' } })
    ).toBe(1)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).cancelledAt).toBeTruthy()
  })

  it('DELIVERED consume reserva y stock una sola vez con SALE', async () => {
    const created = await create([{ productId: ids.own, variantId: null, quantity: 2 }], 5)
    const order = await prisma.order.findUniqueOrThrow({ where: { orderNumber: created.orderNumber } })
    const before = await prisma.inventoryStock.findFirstOrThrow({
      where: { productId: ids.own, variantId: null }
    })
    for (const status of [
      'CONTACTED',
      'CONFIRMED',
      'PAYMENT_PENDING',
      'PAID',
      'PREPARING',
      'READY',
      'DELIVERED'
    ] as const) {
      await orderStatusService.change(event, ids.actor, order.id, status)
    }
    const after = await prisma.inventoryStock.findUniqueOrThrow({ where: { id: before.id } })
    expect(after.quantityOnHand).toBe(before.quantityOnHand - 2)
    expect(after.quantityReserved).toBe(before.quantityReserved - 2)
    expect(await prisma.inventoryMovement.count({ where: { referenceId: order.id, type: 'SALE' } })).toBe(1)
    const delivered = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(delivered.confirmedAt).toBeTruthy()
    expect(delivered.paidAt).toBeTruthy()
    expect(delivered.completedAt).toBeTruthy()
    await expect(orderStatusService.change(event, ids.actor, order.id, 'CANCELLED')).rejects.toMatchObject({
      statusCode: 422,
      data: { error: { code: 'ORDER_STATUS_TRANSITION_INVALID' } }
    })
  })

  it('protege handoff, no cambia NEW y audita solo la primera apertura', async () => {
    const created = await create([{ productId: ids.supplierProduct, variantId: null, quantity: 1 }], 6)
    const order = await prisma.order.findUniqueOrThrow({ where: { orderNumber: created.orderNumber } })
    expect(order.whatsappHandoffTokenHash).not.toBe(created.handoffToken)
    await expect(
      orderService.markWhatsAppOpened(event, created.orderNumber, 'A'.repeat(43))
    ).rejects.toMatchObject({
      statusCode: 404,
      data: { error: { code: 'ORDER_HANDOFF_INVALID' } }
    })
    await orderService.markWhatsAppOpened(event, created.orderNumber, created.handoffToken)
    await orderService.markWhatsAppOpened(event, created.orderNumber, created.handoffToken)
    const opened = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(opened.status).toBe('NEW')
    expect(opened.whatsappOpenedAt).toBeTruthy()
    expect(
      await prisma.auditLog.count({ where: { entityId: order.id, action: 'ORDER_WHATSAPP_OPENED' } })
    ).toBe(1)
  })

  it('seed asigna RBAC coherente a ADMIN, SALES y SUPPORT', async () => {
    const rows = await prisma.role.findMany({
      where: { code: { in: ['ADMIN', 'SALES', 'SUPPORT'] } },
      include: { permissions: { include: { permission: true } } }
    })
    const permissions = new Map(
      rows.map((role) => [role.code, new Set(role.permissions.map((item) => item.permission.code))])
    )
    expect(permissions.get('ADMIN')?.has('orders.cancel')).toBe(true)
    expect(permissions.get('SALES')?.has('orders.manageStatus')).toBe(true)
    expect(permissions.get('SALES')?.has('orders.cancel')).toBe(false)
    expect(permissions.get('SUPPORT')?.has('orders.view')).toBe(true)
    expect(permissions.get('SUPPORT')?.has('orders.update')).toBe(false)
  })
})
