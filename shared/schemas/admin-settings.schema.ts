import { z } from 'zod'

const nullable = (max: number) => z.string().trim().max(max)
const social = z.union([z.literal(''), z.url({ protocol: /^https$/ }).max(2048)])

export const adminSettingsSchema = z.object({
  business: z.object({
    name: z.string().trim().min(2).max(180),
    whatsapp: z.string().trim().min(8).max(30),
    email: z.union([z.literal(''), z.email().max(320)]),
    phone: nullable(30),
    address: nullable(255),
    city: nullable(120),
    country: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase()),
    timeZone: z.string().trim().min(3).max(100)
  }),
  commerce: z.object({
    currency: z
      .string()
      .trim()
      .length(3)
      .transform((value) => value.toUpperCase()),
    taxRate: z.coerce.number().min(0).max(100),
    pricesIncludeTax: z.boolean()
  }),
  inventory: z.object({
    defaultLocationCode: z.string().trim().min(3).max(20),
    lowStockThreshold: z.coerce.number().int().min(0).max(100_000)
  }),
  operations: z.object({
    orderAlertHours: z.coerce.number().int().min(1).max(720),
    ticketAlertHours: z.coerce.number().int().min(1).max(720)
  }),
  seo: z.object({
    siteName: z.string().trim().min(2).max(120),
    defaultTitle: z.string().trim().min(2).max(255),
    defaultDescription: z.string().trim().min(10).max(500)
  }),
  social: z.object({ facebook: social, instagram: social })
})
