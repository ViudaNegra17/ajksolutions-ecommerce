import { z } from 'zod'

const optionalText = (max: number) => z.string().trim().max(max).nullish()
export const bannerPlacementSchema = z.enum(['HOME_HERO', 'HOME_SECONDARY', 'PRODUCTS_TOP'])
export const publicBannerQuerySchema = z.object({ placement: bannerPlacementSchema })
const safeUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value.startsWith('/') || /^https:\/\//i.test(value), 'Usa una ruta interna o HTTPS.')

export const bannerSchema = z
  .object({
    title: z.string().trim().min(2).max(180),
    subtitle: optionalText(220),
    description: optionalText(500),
    imageUrl: z.url({ protocol: /^https$/ }).max(2048),
    mobileImageUrl: z
      .url({ protocol: /^https$/ })
      .max(2048)
      .nullish(),
    ctaLabel: optionalText(80),
    ctaUrl: safeUrl.nullish(),
    placement: bannerPlacementSchema,
    sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
    active: z.boolean().default(false),
    startsAt: z.coerce.date().nullish(),
    endsAt: z.coerce.date().nullish()
  })
  .superRefine((value, context) => {
    if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt)
      context.addIssue({ code: 'custom', path: ['endsAt'], message: 'La fecha final debe ser posterior.' })
    if (Boolean(value.ctaLabel) !== Boolean(value.ctaUrl))
      context.addIssue({ code: 'custom', path: ['ctaUrl'], message: 'CTA y URL deben configurarse juntos.' })
  })

export type BannerInput = z.infer<typeof bannerSchema>
