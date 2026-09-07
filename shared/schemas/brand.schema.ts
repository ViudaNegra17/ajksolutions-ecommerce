import { z } from 'zod'

export const brandSchema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(5000).nullish(),
  logoUrl: z.url().max(2048).nullish(),
  websiteUrl: z.url().max(2048).nullish(),
  active: z.boolean().default(true)
})

export type BrandInput = z.infer<typeof brandSchema>
