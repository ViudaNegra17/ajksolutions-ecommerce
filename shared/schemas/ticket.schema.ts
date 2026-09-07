import { z } from 'zod'
import { customerRequestSchema } from './customer.schema'

export const publicTicketSchema = z.object({
  requestId: z.string().uuid(),
  serviceSlug: z.string().trim().min(1).max(250),
  customer: customerRequestSchema,
  description: z.string().trim().max(5000).optional().nullable(),
  answers: z
    .array(
      z.object({
        fieldId: z.string().uuid(),
        value: z.union([
          z.string().max(10000),
          z.number().finite(),
          z.boolean(),
          z.array(z.string().uuid()).max(100)
        ])
      })
    )
    .max(100),
  website: z.string().max(0).optional().default(''),
  startedAt: z.coerce.number().int().positive()
})

export const whatsappOpenedSchema = z.object({
  ticketCode: z.string().regex(/^TCK-\d{6,}$/),
  handoffToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/)
})

export type PublicTicketInput = z.infer<typeof publicTicketSchema>
