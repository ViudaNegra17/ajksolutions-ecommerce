import { z } from 'zod'

export const inventoryAdjustmentSchema = z.object({
  locationId: z.uuid(),
  productId: z.uuid(),
  variantId: z.uuid().nullish(),
  type: z.enum(['INITIAL', 'PURCHASE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RETURN']),
  quantity: z.coerce.number().int().positive().max(100000000),
  reason: z.string().trim().min(3).max(255),
  notes: z.string().trim().max(10000).nullish(),
  referenceType: z.string().trim().max(100).nullish(),
  referenceId: z.string().trim().max(100).nullish()
})

export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>
