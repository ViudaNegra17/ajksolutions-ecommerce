import { z } from 'zod'

export const customerRequestSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  documentType: z.string().trim().max(30).optional().nullable(),
  documentNumber: z.string().trim().max(50).optional().nullable(),
  email: z.string().trim().email().max(320).optional().nullable().or(z.literal('')),
  phone: z.string().trim().max(30).optional().nullable(),
  whatsapp: z.string().trim().min(8).max(30)
})

export type CustomerRequestInput = z.infer<typeof customerRequestSchema>
