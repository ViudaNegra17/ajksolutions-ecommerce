import { z } from 'zod'
import { serviceFormFieldSchema } from './service-form.schema'

export const servicePriceModes = ['FIXED', 'FROM', 'QUOTE'] as const

export const serviceSchema = z
  .object({
    name: z.string().trim().min(2).max(220),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(250)
      .optional(),
    shortDescription: z.string().trim().max(500).optional().nullable(),
    description: z.string().trim().max(20000).optional().nullable(),
    categoryId: z.string().uuid(),
    priceMode: z.enum(servicePriceModes).default('QUOTE'),
    price: z.coerce.number().positive().max(9999999999.99).optional().nullable(),
    priceIncludesTax: z.boolean().default(false),
    taxRate: z.coerce.number().min(0).max(100).optional().nullable(),
    estimatedDuration: z.string().trim().max(150).optional().nullable(),
    warranty: z.string().trim().max(255).optional().nullable(),
    remoteAvailable: z.boolean().default(false),
    onsiteAvailable: z.boolean().default(true),
    homeServiceAvailable: z.boolean().default(false),
    requiresDevice: z.boolean().default(false),
    allowAttachments: z.boolean().default(false),
    imageUrl: z.string().url().max(2048).optional().nullable().or(z.literal('')),
    featured: z.boolean().default(false),
    active: z.boolean().default(false),
    metaTitle: z.string().trim().max(255).optional().nullable(),
    metaDescription: z.string().trim().max(500).optional().nullable(),
    fields: z.array(serviceFormFieldSchema).max(100).default([])
  })
  .superRefine((service, context) => {
    if (service.priceMode === 'QUOTE' && service.price != null) {
      context.addIssue({ code: 'custom', path: ['price'], message: 'QUOTE no admite precio.' })
    }
    if (service.priceMode !== 'QUOTE' && service.price == null) {
      context.addIssue({ code: 'custom', path: ['price'], message: 'El precio es obligatorio.' })
    }
    const keys = service.fields.map((field) => field.key)
    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: 'custom',
        path: ['fields'],
        message: 'Las claves de campos deben ser únicas.'
      })
    }
  })

export type ServiceInput = z.infer<typeof serviceSchema>
