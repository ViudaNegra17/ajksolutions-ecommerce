import type { H3Event } from 'h3'
import type { Prisma } from '@prisma/client'
import type { InventoryAdjustmentInput } from '#shared/schemas/inventory.schema'
import { inventoryRepository } from '../repositories/inventory.repository'
import { auditService } from './audit.service'
import { variantBelongsToProduct } from '#shared/utils/catalog-integrity'

const outboundTypes = new Set(['ADJUSTMENT_OUT', 'SALE', 'TRANSFER_OUT', 'RESERVATION'])

export const inventoryService = {
  list: inventoryRepository.list,
  movements: inventoryRepository.movements,
  locations: inventoryRepository.locations,
  async adjust(event: H3Event, userId: string, input: InventoryAdjustmentInput) {
    const [location, product, variant] = await Promise.all([
      inventoryRepository.findLocation(input.locationId),
      inventoryRepository.findProduct(input.productId),
      input.variantId ? inventoryRepository.findVariant(input.variantId) : null
    ])
    if (!location)
      throw apiError(422, 'INVENTORY_LOCATION_NOT_FOUND', 'La ubicación no existe o no está activa.')
    if (!product) throw apiError(422, 'PRODUCT_NOT_FOUND', 'El producto no existe.')
    if (product.productType !== 'PHYSICAL')
      throw apiError(
        422,
        'DIGITAL_INVENTORY_NOT_ALLOWED',
        'Los productos digitales no administran inventario.'
      )
    if (!product.manageStock)
      throw apiError(422, 'PRODUCT_STOCK_DISABLED', 'El producto no administra stock propio.')
    if (input.variantId && !variantBelongsToProduct(product.id, variant))
      throw apiError(422, 'VARIANT_PRODUCT_MISMATCH', 'La variante no pertenece al producto.')

    return inventoryRepository.transaction(async (transaction) => {
      const stock = await inventoryRepository.ensureAndLockStock(
        transaction,
        input.locationId,
        input.productId,
        input.variantId || null
      )
      const signedQuantity = outboundTypes.has(input.type) ? -input.quantity : input.quantity
      const quantityAfter = stock.quantityOnHand + signedQuantity
      if (quantityAfter < stock.quantityReserved || quantityAfter < 0) {
        throw apiError(
          409,
          'INVENTORY_NEGATIVE_STOCK',
          'El ajuste produciría stock negativo o inferior al reservado.'
        )
      }
      const updated = await inventoryRepository.updateStock(transaction, stock.id, quantityAfter)
      const movement = await inventoryRepository.createMovement(transaction, {
        locationId: input.locationId,
        productId: input.productId,
        variantId: input.variantId || null,
        type: input.type,
        quantity: signedQuantity,
        quantityBefore: stock.quantityOnHand,
        quantityAfter,
        referenceType: input.referenceType || null,
        referenceId: input.referenceId || null,
        reason: input.reason,
        notes: input.notes || null,
        createdById: userId
      })
      await auditService.recordWithClient(event, transaction, {
        userId,
        action: 'INVENTORY_ADJUSTED',
        entity: 'InventoryStock',
        entityId: stock.id,
        oldValues: { quantityOnHand: stock.quantityOnHand },
        newValues: {
          quantityOnHand: quantityAfter,
          movementCode: movement.movementCode
        } as Prisma.InputJsonValue
      })
      return {
        stock: { ...updated, quantityAvailable: updated.quantityOnHand - updated.quantityReserved },
        movement
      }
    })
  },
  async availability(productId: string, variantId?: string | null) {
    const data = await inventoryRepository.availability(productId, variantId)
    if (!data) throw apiError(404, 'PRODUCT_NOT_FOUND', 'El producto no existe.')
    const ownStock = data.inventoryStocks.reduce(
      (sum, stock) => sum + stock.quantityOnHand - stock.quantityReserved,
      0
    )
    const supplierStock = data.supplierProducts.reduce((sum, supplier) => sum + supplier.supplierStock, 0)
    return {
      ownStock,
      supplierStock,
      source: ownStock > 0 ? 'OWN_STOCK' : supplierStock > 0 ? 'SUPPLIER_STOCK' : 'OUT_OF_STOCK'
    }
  }
}
