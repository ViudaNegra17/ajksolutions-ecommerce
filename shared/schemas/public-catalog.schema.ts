import { z } from 'zod'

const slug = z
  .string()
  .trim()
  .max(180)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .optional()
const optionalDecimal = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,2})?$/)
  .optional()

export const publicProductQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(60).default(24),
    search: z.string().trim().max(120).default(''),
    category: slug,
    brand: slug,
    productType: z.enum(['PHYSICAL', 'DIGITAL']).optional(),
    priceMode: z.enum(['FIXED', 'CONTACT']).optional(),
    availability: z.enum(['OWN_STOCK', 'SUPPLIER_STOCK', 'DIGITAL', 'OUT_OF_STOCK']).optional(),
    featured: z.enum(['true', 'false']).optional(),
    sort: z.enum(['relevance', 'newest', 'price-asc', 'price-desc', 'name-asc']).default('relevance'),
    minPrice: optionalDecimal,
    maxPrice: optionalDecimal,
    attributes: z.string().trim().max(1500).default('')
  })
  .superRefine((value, context) => {
    if (value.minPrice && value.maxPrice && Number(value.minPrice) > Number(value.maxPrice)) {
      context.addIssue({
        code: 'custom',
        path: ['maxPrice'],
        message: 'El precio máximo debe ser igual o mayor al mínimo.'
      })
    }
  })

export const publicSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(10).default(6)
})

export const publicAvailabilityQuerySchema = z.object({
  variant: z.string().trim().max(50).optional()
})

export type PublicProductQuery = z.infer<typeof publicProductQuerySchema>
