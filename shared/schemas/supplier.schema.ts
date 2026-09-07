import { z } from 'zod'

const optionalText = (max: number) => z.string().trim().max(max).nullish()

export const supplierSchema = z.object({
  name: z.string().trim().min(2).max(180),
  legalName: optionalText(220),
  taxId: optionalText(50),
  email: z.union([z.email().max(320), z.literal(''), z.null()]).optional(),
  phone: optionalText(50),
  whatsapp: optionalText(50),
  website: z.union([z.url().max(2048), z.literal(''), z.null()]).optional(),
  contactName: optionalText(180),
  notes: optionalText(10000),
  active: z.boolean().default(true)
})

export type SupplierInput = z.infer<typeof supplierSchema>
