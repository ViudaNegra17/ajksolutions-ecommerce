import type { H3Event } from 'h3'
import { Prisma, type OrderStatus } from '@prisma/client'
import { canTransitionOrder } from '#shared/utils/orders'
import { nextCommercialCode } from '../repositories/code.repository'
import { orderRepository } from '../repositories/order.repository'
import { apiError } from '../utils/api-error'
import { auditService } from './audit.service'

async function retryStatusTransaction<T>(operation: () => Promise<T>, attempts = 5): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034') throw error
      if (attempt === attempts)
        throw apiError(409, 'ORDER_CONCURRENCY_CONFLICT', 'El pedido cambió. Actualiza e intenta nuevamente.')
      await new Promise((resolve) => setTimeout(resolve, attempt * 10))
    }
  }
  throw new Error('Unreachable order status retry state')
}

export const orderStatusService = {
  async change(event: H3Event, userId: string, id: string, toStatus: OrderStatus, notes?: string | null) {
    return retryStatusTransaction(() =>
      orderRepository.transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id }, include: { items: true } })
        if (!order) throw apiError(404, 'ORDER_NOT_FOUND', 'El pedido no existe.')
        if (order.status === toStatus) return order
        if (!canTransitionOrder(order.status, toStatus)) {
          throw apiError(422, 'ORDER_STATUS_TRANSITION_INVALID', 'La transición de estado no está permitida.')
        }
        const ownItems = order.items.filter((item) => item.availabilitySource === 'OWN_STOCK')
        const setting = await tx.setting.findUnique({ where: { key: 'inventory.defaultLocationCode' } })
        const locationCode = typeof setting?.value === 'string' ? setting.value : 'LOC-000001'
        const location = await tx.inventoryLocation.findFirst({
          where: { locationCode, active: true, deletedAt: null }
        })
        if (ownItems.length && !location) {
          throw apiError(
            503,
            'INVENTORY_LOCATION_NOT_CONFIGURED',
            'La ubicación de inventario no está configurada.'
          )
        }

        for (const item of [...ownItems].sort((a, b) =>
          `${a.productId}:${a.variantId || ''}`.localeCompare(`${b.productId}:${b.variantId || ''}`)
        )) {
          if (!item.productId)
            throw apiError(
              409,
              'ORDER_INVENTORY_REFERENCE_INVALID',
              'Falta la referencia histórica de inventario.'
            )
          const stock = await tx.inventoryStock.findFirst({
            where: { locationId: location!.id, productId: item.productId, variantId: item.variantId }
          })
          if (!stock)
            throw apiError(409, 'ORDER_INVENTORY_REFERENCE_INVALID', 'No existe el stock reservado.')
          if (toStatus === 'CANCELLED') {
            const rows = await tx.$queryRaw<Array<{ quantityBefore: number; quantityAfter: number }>>`
              UPDATE inventory_stocks
              SET "quantityReserved" = "quantityReserved" - ${item.quantity}, "updatedAt" = NOW()
              WHERE id = ${stock.id}::uuid AND "quantityReserved" >= ${item.quantity}
              RETURNING "quantityReserved" + ${item.quantity} AS "quantityBefore",
                        "quantityReserved" AS "quantityAfter"
            `
            if (!rows[0])
              throw apiError(
                409,
                'ORDER_RESERVATION_INVALID',
                'La reserva no puede liberarse de forma segura.'
              )
            await tx.inventoryMovement.create({
              data: {
                movementCode: await nextCommercialCode(tx, 'movement'),
                locationId: location!.id,
                productId: item.productId,
                variantId: item.variantId,
                type: 'RELEASE',
                quantity: item.quantity,
                quantityBefore: rows[0].quantityBefore,
                quantityAfter: rows[0].quantityAfter,
                referenceType: 'ORDER',
                referenceId: order.id,
                reason: `Liberación por cancelación de ${order.orderNumber}`,
                createdById: userId
              }
            })
          }
          if (toStatus === 'DELIVERED') {
            const rows = await tx.$queryRaw<Array<{ quantityBefore: number; quantityAfter: number }>>`
              UPDATE inventory_stocks
              SET "quantityOnHand" = "quantityOnHand" - ${item.quantity},
                  "quantityReserved" = "quantityReserved" - ${item.quantity},
                  "updatedAt" = NOW()
              WHERE id = ${stock.id}::uuid
                AND "quantityOnHand" >= ${item.quantity}
                AND "quantityReserved" >= ${item.quantity}
              RETURNING "quantityOnHand" + ${item.quantity} AS "quantityBefore",
                        "quantityOnHand" AS "quantityAfter"
            `
            if (!rows[0])
              throw apiError(
                409,
                'ORDER_RESERVATION_INVALID',
                'La reserva no puede consumirse de forma segura.'
              )
            await tx.inventoryMovement.create({
              data: {
                movementCode: await nextCommercialCode(tx, 'movement'),
                locationId: location!.id,
                productId: item.productId,
                variantId: item.variantId,
                type: 'SALE',
                quantity: -item.quantity,
                quantityBefore: rows[0].quantityBefore,
                quantityAfter: rows[0].quantityAfter,
                referenceType: 'ORDER',
                referenceId: order.id,
                reason: `Venta entregada ${order.orderNumber}`,
                createdById: userId
              }
            })
          }
        }

        const now = new Date()
        const updated = await tx.order.update({
          where: { id },
          data: {
            status: toStatus,
            ...(toStatus === 'CONFIRMED' ? { confirmedAt: now } : {}),
            ...(toStatus === 'PAID' ? { paidAt: now } : {}),
            ...(toStatus === 'CANCELLED' ? { cancelledAt: now } : {}),
            ...(toStatus === 'DELIVERED' ? { completedAt: now } : {}),
            history: {
              create: { fromStatus: order.status, toStatus, userId, notes: notes || null }
            }
          }
        })
        await auditService.recordWithClient(event, tx, {
          userId,
          action:
            toStatus === 'CANCELLED'
              ? 'ORDER_CANCELLED'
              : toStatus === 'DELIVERED'
                ? 'ORDER_DELIVERED'
                : 'ORDER_STATUS_CHANGED',
          entity: 'Order',
          entityId: id,
          oldValues: { status: order.status },
          newValues: { status: toStatus }
        })
        return updated
      })
    )
  }
}
