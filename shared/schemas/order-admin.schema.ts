import { z } from 'zod'
import { paginationSchema } from './pagination.schema'

export const orderStatuses = [
  'NEW',
  'CONTACTED',
  'CONFIRMED',
  'PAYMENT_PENDING',
  'PAID',
  'PREPARING',
  'READY',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED'
] as const

export const orderListQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional(),
  status: z.enum(orderStatuses).optional(),
  customer: z.string().trim().max(200).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  deliveryType: z.enum(['PICKUP', 'DELIVERY', 'DIGITAL']).optional(),
  availabilitySource: z.enum(['OWN_STOCK', 'SUPPLIER_STOCK', 'DIGITAL']).optional()
})

export const orderStatusUpdateSchema = z
  .object({ status: z.enum(orderStatuses), notes: z.string().trim().max(2000).optional().nullable() })
  .strict()
