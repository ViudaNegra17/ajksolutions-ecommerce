import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { nextCommercialCode } from './code.repository'

type InventoryQuery = {
  page: number
  pageSize: number
  search: string
  locationId?: string
  productId?: string
}

export const inventoryRepository = {
  transaction<T>(callback: (transaction: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(callback, { isolationLevel: 'Serializable' })
  },
  findLocation(id: string) {
    return prisma.inventoryLocation.findFirst({ where: { id, active: true, deletedAt: null } })
  },
  findProduct(id: string) {
    return prisma.product.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, manageStock: true, productType: true }
    })
  },
  findVariant(id: string) {
    return prisma.productVariant.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, productId: true }
    })
  },
  async ensureAndLockStock(
    transaction: Prisma.TransactionClient,
    locationId: string,
    productId: string,
    variantId: string | null
  ) {
    await transaction.$executeRaw`
      INSERT INTO inventory_stocks (id, "locationId", "productId", "variantId", "quantityOnHand", "quantityReserved", "createdAt", "updatedAt")
      VALUES (${randomUUID()}::uuid, ${locationId}::uuid, ${productId}::uuid, ${variantId}::uuid, 0, 0, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `
    const rows = await transaction.$queryRaw<
      Array<{ id: string; quantityOnHand: number; quantityReserved: number }>
    >`
      SELECT id, "quantityOnHand", "quantityReserved"
      FROM inventory_stocks
      WHERE "locationId" = ${locationId}::uuid
        AND "productId" = ${productId}::uuid
        AND "variantId" IS NOT DISTINCT FROM ${variantId}::uuid
      FOR UPDATE
    `
    const stock = rows[0]
    if (!stock)
      throw apiError(500, 'INVENTORY_STOCK_LOCK_FAILED', 'No fue posible bloquear el registro de inventario.')
    return stock
  },
  updateStock(transaction: Prisma.TransactionClient, id: string, quantityOnHand: number) {
    return transaction.inventoryStock.update({ where: { id }, data: { quantityOnHand } })
  },
  async createMovement(
    transaction: Prisma.TransactionClient,
    data: Omit<Prisma.InventoryMovementUncheckedCreateInput, 'movementCode'>
  ) {
    return transaction.inventoryMovement.create({
      data: { ...data, movementCode: await nextCommercialCode(transaction, 'movement') }
    })
  },
  async list(input: InventoryQuery) {
    const where: Prisma.InventoryStockWhereInput = {
      ...(input.locationId ? { locationId: input.locationId } : {}),
      ...(input.productId ? { productId: input.productId } : {}),
      ...(input.search
        ? {
            product: {
              OR: [
                { name: { contains: input.search, mode: 'insensitive' } },
                { sku: { contains: input.search, mode: 'insensitive' } },
                { productCode: { contains: input.search, mode: 'insensitive' } }
              ]
            }
          }
        : {})
    }
    const [items, total] = await prisma.$transaction([
      prisma.inventoryStock.findMany({
        where,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          location: true,
          product: { select: { id: true, productCode: true, sku: true, name: true } },
          variant: { select: { id: true, variantCode: true, sku: true, name: true } }
        }
      }),
      prisma.inventoryStock.count({ where })
    ])
    return {
      items: items.map((item) => ({
        ...item,
        quantityAvailable: item.quantityOnHand - item.quantityReserved
      })),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total,
        totalPages: Math.ceil(total / input.pageSize)
      }
    }
  },
  async movements(input: InventoryQuery) {
    const where: Prisma.InventoryMovementWhereInput = {
      ...(input.locationId ? { locationId: input.locationId } : {}),
      ...(input.productId ? { productId: input.productId } : {}),
      ...(input.search
        ? {
            OR: [
              { movementCode: { contains: input.search, mode: 'insensitive' } },
              { reason: { contains: input.search, mode: 'insensitive' } },
              { product: { name: { contains: input.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    }
    const [items, total] = await prisma.$transaction([
      prisma.inventoryMovement.findMany({
        where,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          location: { select: { name: true, locationCode: true } },
          product: { select: { name: true, productCode: true } },
          variant: { select: { name: true, variantCode: true } },
          createdBy: { select: { firstName: true, lastName: true } }
        }
      }),
      prisma.inventoryMovement.count({ where })
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
  availability(productId: string, variantId?: string | null) {
    return prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: {
        inventoryStocks: {
          where: { variantId: variantId || null },
          select: { quantityOnHand: true, quantityReserved: true }
        },
        supplierProducts: {
          where: {
            variantId: variantId || null,
            active: true,
            supplier: { active: true, deletedAt: null }
          },
          select: { supplierStock: true }
        }
      }
    })
  },
  locations() {
    return prisma.inventoryLocation.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { name: 'asc' }
    })
  }
}
