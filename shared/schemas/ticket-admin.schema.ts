import { z } from 'zod'
import { paginationSchema } from './pagination.schema'

export const ticketStatuses = [
  'NEW',
  'ASSIGNED',
  'IN_REVIEW',
  'WAITING_CUSTOMER',
  'QUOTED',
  'APPROVED',
  'IN_PROGRESS',
  'COMPLETED',
  'DELIVERED',
  'CANCELLED'
] as const
export const ticketPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const

export const ticketListQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional(),
  status: z.enum(ticketStatuses).optional(),
  priority: z.enum(ticketPriorities).optional(),
  service: z.string().uuid().optional(),
  assignedUser: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
})

export const ticketStatusSchema = z.object({
  status: z.enum(ticketStatuses),
  notes: z.string().trim().max(1000).optional().nullable()
})
export const ticketPrioritySchema = z.object({
  priority: z.enum(ticketPriorities),
  notes: z.string().trim().max(1000).optional().nullable()
})
export const ticketAssignmentSchema = z.object({
  assignedUserId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable()
})
export const ticketMessageSchema = z.object({
  message: z.string().trim().min(1).max(10000),
  internal: z.boolean().default(true)
})
