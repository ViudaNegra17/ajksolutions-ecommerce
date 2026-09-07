import { z } from 'zod'
import { paginationSchema } from './pagination.schema'

const optionalUuid = z.union([z.uuid(), z.literal('')]).optional()
const optionalBoolean = z.union([z.literal('true'), z.literal('false'), z.literal('')]).optional()

export const catalogListQuerySchema = paginationSchema.extend({
  active: optionalBoolean
})

export const productListQuerySchema = catalogListQuerySchema.extend({
  categoryId: optionalUuid,
  brandId: optionalUuid,
  supplierId: optionalUuid,
  featured: optionalBoolean,
  priceMode: z.union([z.enum(['FIXED', 'CONTACT']), z.literal('')]).optional(),
  stock: z.union([z.enum(['with', 'without']), z.literal('')]).optional()
})

export const inventoryListQuerySchema = paginationSchema.extend({
  locationId: optionalUuid,
  productId: optionalUuid
})
