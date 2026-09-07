import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(5000).nullish(),
  imageUrl: z.url().max(2048).nullish(),
  icon: z.string().trim().max(100).nullish(),
  parentId: z.uuid().nullish(),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0)
})

export type CategoryInput = z.infer<typeof categorySchema>
