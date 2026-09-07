import { Prisma } from '@prisma/client'
import type { z } from 'zod'
import type { orderListQuerySchema } from '#shared/schemas/order-admin.schema'
import { prisma } from '../utils/prisma'

type OrderListQuery = z.infer<typeof orderListQuerySchema>

const orderResultInclude = {
  customer: { select: { firstName: true, lastName: true, whatsapp: true } },
  deliveryAddress: true,
  items: { orderBy: { createdAt: 'asc' as const } }
} satisfies Prisma.OrderInclude

export const orderRepository = {
  transaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(operation, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 20_000
    })
  },

  findByRequestId(requestId: string) {
    return prisma.order.findUnique({ where: { requestId }, include: orderResultInclude })
  },

  findWhatsAppHandoff(orderNumber: string) {
    return prisma.order.findUnique({
      where: { orderNumber },
      select: {
        id: true,
        requestId: true,
        status: true,
        whatsappHandoffTokenHash: true,
        whatsappOpenedAt: true
      }
    })
  },

  async checkoutContext(tx: Prisma.TransactionClient, productIds: string[]) {
    const settings = await tx.setting.findMany({
      where: { key: { in: ['currency', 'country', 'inventory.defaultLocationCode', 'business.whatsapp'] } },
      select: { key: true, value: true }
    })
    const values = new Map(settings.map((setting) => [setting.key, setting.value]))
    const locationCode =
      typeof values.get('inventory.defaultLocationCode') === 'string'
        ? String(values.get('inventory.defaultLocationCode'))
        : 'LOC-000001'
    const location = await tx.inventoryLocation.findFirst({
      where: { locationCode, active: true, deletedAt: null },
      select: { id: true, locationCode: true }
    })
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
          select: { url: true }
        },
        variants: { where: { active: true, deletedAt: null }, orderBy: { id: 'asc' } },
        inventoryStocks: {
          where: location ? { locationId: location.id } : { id: { in: [] } },
          orderBy: { id: 'asc' }
        },
        supplierProducts: {
          where: { active: true, supplier: { active: true, deletedAt: null } },
          orderBy: [{ supplierStock: 'desc' }, { id: 'asc' }]
        }
      }
    })
    return { settings: values, location, products }
  },

  async list(input: OrderListQuery) {
    const where: Prisma.OrderWhereInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.deliveryType ? { deliveryType: input.deliveryType } : {}),
      ...(input.availabilitySource
        ? { items: { some: { availabilitySource: input.availabilitySource } } }
        : {}),
      ...(input.dateFrom || input.dateTo
        ? {
            createdAt: {
              ...(input.dateFrom ? { gte: input.dateFrom } : {}),
              ...(input.dateTo ? { lte: input.dateTo } : {})
            }
          }
        : {}),
      ...(input.customer
        ? {
            customer: {
              OR: [
                { firstName: { contains: input.customer, mode: 'insensitive' } },
                { lastName: { contains: input.customer, mode: 'insensitive' } },
                { documentNumber: { contains: input.customer, mode: 'insensitive' } },
                { email: { contains: input.customer, mode: 'insensitive' } },
                { whatsapp: { contains: input.customer, mode: 'insensitive' } }
              ]
            }
          }
        : {}),
      ...(input.search
        ? {
            OR: [
              { orderNumber: { contains: input.search, mode: 'insensitive' } },
              { customer: { firstName: { contains: input.search, mode: 'insensitive' } } },
              { customer: { lastName: { contains: input.search, mode: 'insensitive' } } },
              { customer: { documentNumber: { contains: input.search, mode: 'insensitive' } } },
              { customer: { email: { contains: input.search, mode: 'insensitive' } } },
              { customer: { whatsapp: { contains: input.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    }
    const [items, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          status: true,
          deliveryType: true,
          total: true,
          currency: true,
          whatsappOpenedAt: true,
          customer: { select: { firstName: true, lastName: true } },
          _count: { select: { items: true } }
        }
      }),
      prisma.order.count({ where })
    ])
    return {
      items,
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total,
        totalPages: Math.ceil(total / input.pageSize)
      }
    }
  },

  detail(id: string) {
    return prisma.order.findUnique({
      where: { id },
      omit: { whatsappHandoffTokenHash: true, checkoutFingerprint: true },
      include: {
        customer: true,
        deliveryAddress: true,
        items: { orderBy: { createdAt: 'asc' } },
        history: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { firstName: true, lastName: true } } }
        }
      }
    })
  }
}
