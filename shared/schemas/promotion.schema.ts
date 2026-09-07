import { z } from 'zod'

export const promotionSchema = z
  .object({
    name: z.string().trim().min(2).max(180),
    description: z.string().trim().max(500).nullish(),
    badge: z.string().trim().min(1).max(40),
    type: z.literal('INFORMATIONAL').default('INFORMATIONAL'),
    startsAt: z.coerce.date().nullish(),
    endsAt: z.coerce.date().nullish(),
    active: z.boolean().default(false),
    priority: z.coerce.number().int().min(0).max(10_000).default(0),
    productIds: z.array(z.uuid()).max(100).default([]),
    categoryIds: z.array(z.uuid()).max(100).default([])
  })
  .superRefine((value, context) => {
    if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt)
      context.addIssue({ code: 'custom', path: ['endsAt'], message: 'La fecha final debe ser posterior.' })
    if (new Set(value.productIds).size !== value.productIds.length)
      context.addIssue({ code: 'custom', path: ['productIds'], message: 'Hay productos duplicados.' })
    if (new Set(value.categoryIds).size !== value.categoryIds.length)
      context.addIssue({ code: 'custom', path: ['categoryIds'], message: 'Hay categorías duplicadas.' })
  })

export type PromotionInput = z.infer<typeof promotionSchema>
