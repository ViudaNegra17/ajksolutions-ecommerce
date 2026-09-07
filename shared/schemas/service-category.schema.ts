import { z } from 'zod'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => value || null)

export const serviceCategorySchema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(180)
    .optional(),
  description: optionalText(5000),
  imageUrl: z.string().url().max(2048).optional().nullable().or(z.literal('')),
  icon: optionalText(100),
  parentId: z.string().uuid().optional().nullable().or(z.literal('')),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0)
})

export type ServiceCategoryInput = z.infer<typeof serviceCategorySchema>
