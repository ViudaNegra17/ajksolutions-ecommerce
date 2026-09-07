import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'
import { Prisma } from '@prisma/client'
import type { CheckoutPreviewInput, CreateOrderInput } from '#shared/schemas/checkout.schema'
import { normalizeCartItems } from '#shared/schemas/cart.schema'
import type { CheckoutPreview, CheckoutPreviewItem, PublicOrderResult } from '#shared/types/orders'
import { decideAvailabilitySource } from '#shared/utils/orders'
import { addressBelongsToCustomer } from '#shared/utils/order-integrity'
import { buildWhatsAppUrl, normalizeDocument, normalizeEmail, normalizePhone } from '#shared/utils/tickets'
import { customerRepository } from '../repositories/customer.repository'
import { nextCommercialCode } from '../repositories/code.repository'
import { orderRepository } from '../repositories/order.repository'
import { apiError } from '../utils/api-error'
import {
  createOrderHandoffToken,
  hashOrderHandoffToken,
  secureEqual,
  signCheckoutFingerprint
} from '../utils/order-security'
import { auditService } from './audit.service'
import { calculateEffectivePrice, calculateProductPrice } from './price.service'
import { retryCustomerTransaction } from './ticket.service'

type ResolvedLine = CheckoutPreviewItem & {
  productCode: string
  sku: string
  priceIncludesTax: boolean
  stockId: string | null
}

type ResolvedCheckout = CheckoutPreview & { lines: ResolvedLine[]; locationId: string | null }

function settingString(values: Map<string, unknown>, key: string, fallback: string) {
  const value = values.get(key)
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function canonicalCheckout(
  deliveryType: CheckoutPreviewInput['deliveryType'],
  currency: string,
  lines: ResolvedLine[],
  totals: { subtotal: string; tax: string; shipping: string; total: string }
) {
  return JSON.stringify({
    version: 2,
    deliveryType,
    currency,
    items: [...lines]
      .sort((a, b) =>
        `${a.productId}:${a.variantId || ''}`.localeCompare(`${b.productId}:${b.variantId || ''}`)
      )
      .map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        productType: line.productType,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        subtotal: line.subtotal,
        taxAmount: line.taxAmount,
        total: line.total,
        availabilitySource: line.availabilitySource
      })),
    ...totals
  })
}

export async function resolveCheckout(
  tx: Prisma.TransactionClient,
  input: CheckoutPreviewInput
): Promise<ResolvedCheckout> {
  let items
  try {
    items = normalizeCartItems(input.items)
  } catch (error) {
    throw apiError(
      422,
      'CART_QUANTITY_INVALID',
      error instanceof Error ? error.message : 'Cantidad inválida.'
    )
  }
  const context = await orderRepository.checkoutContext(tx, [...new Set(items.map((item) => item.productId))])
  if (!context.location && context.products.some((product) => product.productType === 'PHYSICAL'))
    throw apiError(
      503,
      'INVENTORY_LOCATION_NOT_CONFIGURED',
      'La ubicación de inventario no está configurada.'
    )
  const byId = new Map(context.products.map((product) => [product.id, product]))
  const currency = settingString(context.settings, 'currency', 'USD').toUpperCase()
  const lines: ResolvedLine[] = []

  for (const item of items) {
    const product = byId.get(item.productId)
    if (!product || !product.active || product.deletedAt) {
      throw apiError(422, 'PRODUCT_NOT_AVAILABLE', 'Un producto ya no está disponible para compra.')
    }
    if (product.priceMode === 'CONTACT') {
      throw apiError(422, 'PRODUCT_REQUIRES_CONTACT', `${product.name} requiere contacto comercial.`)
    }
    if (product.productType === 'DIGITAL' && item.quantity !== 1) {
      throw apiError(422, 'DIGITAL_QUANTITY_INVALID', 'Los productos digitales se compran de uno en uno.')
    }
    const hasVariants = product.variants.length > 0
    const variant = item.variantId
      ? product.variants.find((candidate) => candidate.id === item.variantId)
      : null
    if ((hasVariants && !item.variantId) || (item.variantId && !variant)) {
      throw apiError(422, 'INVALID_VARIANT', `Selecciona una variante válida para ${product.name}.`)
    }
    const effective = calculateEffectivePrice({
      priceMode: product.priceMode,
      price: product.price,
      priceOverride: variant?.priceOverride
    })
    if (!effective) throw apiError(422, 'PRODUCT_REQUIRES_CONTACT', `${product.name} requiere contacto.`)
    const calculated = calculateProductPrice({
      price: effective,
      taxRate: product.taxRate || '0',
      priceIncludesTax: product.priceIncludesTax
    })
    const quantity = new Prisma.Decimal(item.quantity)
    const subtotal = calculated.net.mul(quantity).toDecimalPlaces(2)
    const taxAmount = calculated.tax.mul(quantity).toDecimalPlaces(2)
    const total = subtotal.add(taxAmount).toDecimalPlaces(2)
    const stock = product.inventoryStocks.find((candidate) => candidate.variantId === (variant?.id || null))
    const ownAvailable = stock ? Math.max(0, stock.quantityOnHand - stock.quantityReserved) : 0
    const suppliers = product.supplierProducts.filter(
      (candidate) => candidate.variantId === (variant?.id || null) && candidate.supplierStock >= item.quantity
    )
    const supplier = suppliers[0]
    const source =
      product.productType === 'DIGITAL'
        ? ('DIGITAL' as const)
        : decideAvailabilitySource(ownAvailable, supplier?.supplierStock || 0, item.quantity)
    if (!source) {
      throw apiError(409, 'INSUFFICIENT_STOCK', `No existe disponibilidad suficiente para ${product.name}.`)
    }
    const warnings = source === 'SUPPLIER_STOCK' ? ['Disponibilidad bajo pedido; entrega por coordinar.'] : []
    lines.push({
      productId: product.id,
      variantId: variant?.id || null,
      productName: product.name,
      variantName: variant?.name || null,
      slug: product.slug,
      image: product.images[0]?.url || null,
      quantity: item.quantity,
      productType: product.productType,
      unitPrice: calculated.net.toFixed(2),
      taxRate: (product.taxRate || new Prisma.Decimal(0)).toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      subtotal: subtotal.toFixed(2),
      total: total.toFixed(2),
      availabilitySource: source,
      estimatedLeadTimeDays: source === 'SUPPLIER_STOCK' ? supplier?.leadTimeDays || null : null,
      warnings,
      productCode: product.productCode,
      sku: variant?.sku || product.sku,
      priceIncludesTax: product.priceIncludesTax,
      stockId: source === 'OWN_STOCK' ? stock?.id || null : null
    })
  }

  const digitalLines = lines.filter((line) => line.productType === 'DIGITAL')
  if (digitalLines.length && lines.length !== 1) {
    throw apiError(
      422,
      'DIGITAL_BUY_NOW_REQUIRED',
      'Los productos digitales usan compra directa y no pueden mezclarse con otros productos.'
    )
  }
  const hasPhysical = lines.some((line) => line.productType === 'PHYSICAL')
  if (hasPhysical && input.deliveryType === 'DIGITAL')
    throw apiError(422, 'DELIVERY_TYPE_INVALID', 'Un pedido con productos físicos requiere retiro o entrega.')
  if (!hasPhysical && input.deliveryType !== 'DIGITAL')
    throw apiError(422, 'DELIVERY_TYPE_INVALID', 'Un pedido exclusivamente digital requiere entrega digital.')

  const subtotal = lines.reduce((sum, line) => sum.add(line.subtotal), new Prisma.Decimal(0))
  const tax = lines.reduce((sum, line) => sum.add(line.taxAmount), new Prisma.Decimal(0))
  const shipping = new Prisma.Decimal(0)
  const total = subtotal.add(tax).add(shipping)
  const totals = {
    subtotal: subtotal.toFixed(2),
    tax: tax.toFixed(2),
    shipping: shipping.toFixed(2),
    total: total.toFixed(2)
  }
  const checkoutFingerprint = signCheckoutFingerprint(
    canonicalCheckout(input.deliveryType, currency, lines, totals)
  )
  const warnings = [
    ...new Set(lines.flatMap((line) => line.warnings)),
    ...(input.deliveryType === 'DELIVERY' ? ['El costo de envío se coordinará comercialmente.'] : [])
  ]
  return {
    items: lines.map(
      ({ productCode: _productCode, sku: _sku, priceIncludesTax: _included, stockId: _stockId, ...line }) =>
        line
    ),
    lines,
    ...totals,
    discount: '0.00',
    currency,
    shippingPendingQuote: input.deliveryType === 'DELIVERY',
    checkoutFingerprint,
    warnings,
    locationId: context.location?.id || null
  }
}

async function businessWhatsApp() {
  const setting = await import('../utils/prisma').then(({ prisma }) =>
    prisma.setting.findUnique({ where: { key: 'business.whatsapp' }, select: { value: true } })
  )
  if (typeof setting?.value !== 'string' || !setting.value.trim()) {
    throw apiError(503, 'WHATSAPP_NOT_CONFIGURED', 'WhatsApp comercial no está configurado.')
  }
  return setting.value
}

type ResultOrder = NonNullable<Awaited<ReturnType<typeof orderRepository.findByRequestId>>>

export function orderWhatsAppMessage(order: ResultOrder) {
  const isDigitalOrder = order.items.length === 1 && order.items[0]?.productTypeSnapshot === 'DIGITAL'
  const products = order.items
    .map(
      (item) =>
        `${item.quantity} x ${item.productNameSnapshot}${item.variantSnapshot ? ` (${item.variantSnapshot})` : ''}\n$${item.total.toFixed(2)}`
    )
    .join('\n\n')
  const delivery =
    order.deliveryType === 'PICKUP'
      ? 'Retiro en tienda'
      : order.deliveryType === 'DIGITAL'
        ? 'Entrega digital al correo registrado'
        : order.deliveryAddress
          ? `${order.deliveryAddress.city}, ${order.deliveryAddress.addressLine1}\nReferencia: ${order.deliveryAddress.reference}`
          : 'Entrega por coordinar'
  return [
    isDigitalOrder ? '*NUEVA COMPRA DIGITAL*' : '*NUEVO PEDIDO WEB*',
    '',
    `Pedido: ${order.orderNumber}`,
    '',
    'Cliente:',
    `${order.customer.firstName} ${order.customer.lastName}`,
    '',
    'WhatsApp:',
    order.customer.whatsapp || 'No indicado',
    '',
    'Productos:',
    '',
    products,
    '',
    `Subtotal: $${order.subtotal.toFixed(2)}`,
    `IVA: $${order.tax.toFixed(2)}`,
    `Total: $${order.total.toFixed(2)}`,
    '',
    'Entrega:',
    delivery,
    '',
    isDigitalOrder
      ? 'Deseo continuar con la compra y coordinar el pago y la entrega por WhatsApp.'
      : 'Deseo confirmar disponibilidad y método de pago.'
  ].join('\n')
}

async function result(order: ResultOrder): Promise<PublicOrderResult> {
  const handoffToken = createOrderHandoffToken(order.requestId, order.id)
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    total: order.total.toFixed(2),
    currency: order.currency,
    whatsappUrl: buildWhatsAppUrl(await businessWhatsApp(), orderWhatsAppMessage(order)),
    handoffToken,
    hasDigitalItems: order.items.some((item) => item.productTypeSnapshot !== 'PHYSICAL'),
    summary: order.items.map((item) => ({
      name: item.productNameSnapshot,
      variant: item.variantSnapshot,
      quantity: item.quantity,
      total: item.total.toFixed(2)
    }))
  }
}

function requestIdConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    JSON.stringify(error.meta || {})
      .toLowerCase()
      .includes('requestid')
  )
}

function addressOwnershipConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2003' &&
    JSON.stringify(error.meta || {}).includes('orders_customerId_addressId_fkey')
  )
}

export const orderService = {
  async preview(input: CheckoutPreviewInput): Promise<CheckoutPreview> {
    const resolved = await orderRepository.transaction((tx) => resolveCheckout(tx, input))
    const { lines: _lines, locationId: _locationId, ...preview } = resolved
    return preview
  },

  async create(event: H3Event, input: CreateOrderInput): Promise<PublicOrderResult> {
    if (input.website) throw apiError(422, 'SPAM_REJECTED', 'Solicitud inválida.')
    if (Date.now() - input.startedAt < 1200)
      throw apiError(422, 'FORM_TOO_FAST', 'Completa el checkout antes de confirmar.')
    const duplicate = await orderRepository.findByRequestId(input.requestId)
    if (duplicate) {
      if (!secureEqual(duplicate.checkoutFingerprint, input.checkoutFingerprint)) {
        throw apiError(409, 'ORDER_IDEMPOTENCY_CONFLICT', 'El requestId ya pertenece a otro checkout.')
      }
      return result(duplicate)
    }
    const normalizedCustomer = {
      ...input.customer,
      documentNumber: normalizeDocument(input.customer.documentNumber),
      email: normalizeEmail(input.customer.email),
      phone: normalizePhone(input.customer.phone),
      whatsapp: normalizePhone(input.customer.whatsapp)
    }
    if (!normalizedCustomer.whatsapp) throw apiError(422, 'WHATSAPP_INVALID', 'El WhatsApp no es válido.')

    let created: ResultOrder | null
    try {
      created = await retryCustomerTransaction(
        () =>
          orderRepository.transaction(async (tx) => {
            const resolved = await resolveCheckout(tx, {
              items: input.items,
              deliveryType: input.deliveryType
            })
            if (!secureEqual(resolved.checkoutFingerprint, input.checkoutFingerprint)) {
              throw apiError(
                409,
                'CHECKOUT_CHANGED',
                'El precio o la disponibilidad cambió. Revisa el resumen.'
              )
            }
            if (resolved.lines.some((line) => line.productType !== 'PHYSICAL') && !normalizedCustomer.email) {
              throw apiError(
                422,
                'DIGITAL_EMAIL_REQUIRED',
                'El correo electrónico es obligatorio para productos digitales.'
              )
            }
            const customer = await customerRepository.findOrCreate(tx, {
              ...normalizedCustomer,
              whatsapp: normalizedCustomer.whatsapp!
            })
            const address =
              input.deliveryType === 'DELIVERY' && input.address
                ? await tx.address.create({
                    data: {
                      ...input.address,
                      addressLine2: input.address.addressLine2 || null,
                      postalCode: input.address.postalCode || null,
                      phone: normalizePhone(input.address.phone),
                      customerId: customer.id
                    }
                  })
                : null
            if (address && !addressBelongsToCustomer(customer.id, address)) {
              throw apiError(
                422,
                'ORDER_ADDRESS_CUSTOMER_MISMATCH',
                'La dirección no pertenece al cliente del pedido.'
              )
            }
            const orderId = randomUUID()
            const handoffToken = createOrderHandoffToken(input.requestId, orderId)
            const order = await tx.order.create({
              data: {
                id: orderId,
                orderNumber: await nextCommercialCode(tx, 'order'),
                requestId: input.requestId,
                checkoutFingerprint: resolved.checkoutFingerprint,
                customerId: customer.id,
                addressId: address?.id || null,
                deliveryType: input.deliveryType,
                subtotal: resolved.subtotal,
                discount: resolved.discount,
                tax: resolved.tax,
                shipping: resolved.shipping,
                total: resolved.total,
                currency: resolved.currency,
                shippingPendingQuote: resolved.shippingPendingQuote,
                notes: input.notes || null,
                source: 'WEB',
                whatsappHandoffTokenHash: hashOrderHandoffToken(handoffToken),
                deliveryAddress: address
                  ? {
                      create: {
                        recipientName: address.recipientName,
                        country: address.country,
                        province: address.province,
                        city: address.city,
                        addressLine1: address.addressLine1,
                        addressLine2: address.addressLine2,
                        reference: address.reference,
                        postalCode: address.postalCode,
                        phone: address.phone
                      }
                    }
                  : undefined,
                items: {
                  create: resolved.lines.map((line) => ({
                    productId: line.productId,
                    variantId: line.variantId,
                    productCodeSnapshot: line.productCode,
                    skuSnapshot: line.sku,
                    productNameSnapshot: line.productName,
                    variantSnapshot: line.variantName,
                    unitPrice: line.unitPrice,
                    taxRate: line.taxRate,
                    taxAmount: line.taxAmount,
                    quantity: line.quantity,
                    subtotal: line.subtotal,
                    total: line.total,
                    priceIncludesTax: line.priceIncludesTax,
                    availabilitySource: line.availabilitySource,
                    productTypeSnapshot: line.productType,
                    estimatedLeadTimeDays: line.estimatedLeadTimeDays
                  }))
                },
                history: { create: { toStatus: 'NEW', notes: 'Pedido web creado' } }
              },
              include: {
                customer: { select: { firstName: true, lastName: true, whatsapp: true } },
                deliveryAddress: true,
                items: { orderBy: { createdAt: 'asc' } }
              }
            })

            for (const line of [...resolved.lines]
              .filter((item) => item.availabilitySource === 'OWN_STOCK')
              .sort((a, b) => (a.stockId || '').localeCompare(b.stockId || ''))) {
              if (!line.stockId)
                throw apiError(409, 'INSUFFICIENT_STOCK', `Stock insuficiente para ${line.productName}.`)
              const rows = await tx.$queryRaw<Array<{ quantityBefore: number; quantityAfter: number }>>`
              UPDATE inventory_stocks
              SET "quantityReserved" = "quantityReserved" + ${line.quantity}, "updatedAt" = NOW()
              WHERE id = ${line.stockId}::uuid
                AND ("quantityOnHand" - "quantityReserved") >= ${line.quantity}
              RETURNING "quantityReserved" - ${line.quantity} AS "quantityBefore",
                        "quantityReserved" AS "quantityAfter"
            `
              if (!rows[0])
                throw apiError(409, 'INSUFFICIENT_STOCK', `Stock insuficiente para ${line.productName}.`)
              await tx.inventoryMovement.create({
                data: {
                  movementCode: await nextCommercialCode(tx, 'movement'),
                  locationId: resolved.locationId!,
                  productId: line.productId,
                  variantId: line.variantId,
                  type: 'RESERVATION',
                  quantity: line.quantity,
                  quantityBefore: rows[0].quantityBefore,
                  quantityAfter: rows[0].quantityAfter,
                  referenceType: 'ORDER',
                  referenceId: order.id,
                  reason: `Reserva para ${order.orderNumber}`,
                  createdById: null
                }
              })
            }
            await auditService.recordWithClient(event, tx, {
              action: 'ORDER_CREATED',
              entity: 'Order',
              entityId: order.id,
              newValues: { orderNumber: order.orderNumber, source: 'WEB', total: order.total.toFixed(2) }
            })
            return order
          }),
        10
      )
    } catch (error) {
      if (addressOwnershipConflict(error)) {
        throw apiError(
          422,
          'ORDER_ADDRESS_CUSTOMER_MISMATCH',
          'La dirección no pertenece al cliente del pedido.'
        )
      }
      if (!requestIdConflict(error)) throw error
      created = await orderRepository.findByRequestId(input.requestId)
      if (created && !secureEqual(created.checkoutFingerprint, input.checkoutFingerprint)) {
        throw apiError(409, 'ORDER_IDEMPOTENCY_CONFLICT', 'El requestId ya pertenece a otro checkout.')
      }
    }
    if (!created) throw apiError(409, 'ORDER_IDEMPOTENCY_CONFLICT', 'El pedido ya está siendo procesado.')
    return result(created)
  },

  async markWhatsAppOpened(event: H3Event, orderNumber: string, token: string) {
    const handoff = await orderRepository.findWhatsAppHandoff(orderNumber)
    const expected = handoff ? createOrderHandoffToken(handoff.requestId, handoff.id) : ''
    if (
      !handoff ||
      handoff.status === 'CANCELLED' ||
      !handoff.whatsappHandoffTokenHash ||
      !secureEqual(token, expected) ||
      !secureEqual(hashOrderHandoffToken(token), handoff.whatsappHandoffTokenHash)
    ) {
      throw apiError(404, 'ORDER_HANDOFF_INVALID', 'No se pudo autorizar el handoff de WhatsApp.')
    }
    if (handoff.whatsappOpenedAt) return
    await orderRepository.transaction(async (tx) => {
      const openedAt = new Date()
      const updated = await tx.order.updateMany({
        where: { id: handoff.id, status: { not: 'CANCELLED' }, whatsappOpenedAt: null },
        data: { whatsappOpenedAt: openedAt }
      })
      if (!updated.count) return
      await auditService.recordWithClient(event, tx, {
        action: 'ORDER_WHATSAPP_OPENED',
        entity: 'Order',
        entityId: handoff.id,
        newValues: { whatsappOpenedAt: openedAt.toISOString() }
      })
    })
  },

  async list(input: Parameters<typeof orderRepository.list>[0]) {
    const data = await orderRepository.list(input)
    return {
      ...data,
      items: data.items.map((item) => ({
        ...item,
        total: item.total.toFixed(2),
        createdAt: item.createdAt.toISOString(),
        customer: `${item.customer.firstName} ${item.customer.lastName}`,
        itemCount: item._count.items,
        _count: undefined
      }))
    }
  },

  async get(id: string) {
    const order = await orderRepository.detail(id)
    if (!order) throw apiError(404, 'ORDER_NOT_FOUND', 'El pedido no existe.')
    return order
  }
}
