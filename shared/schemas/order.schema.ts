import { z } from 'zod'

export const orderWhatsAppOpenedSchema = z
  .object({
    orderNumber: z.string().regex(/^ORD-\d{6,}$/),
    handoffToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/)
  })
  .strict()
