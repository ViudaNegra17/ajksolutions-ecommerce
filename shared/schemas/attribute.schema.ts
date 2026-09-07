import { z } from 'zod'

export const attributeTypes = ['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTISELECT'] as const

const optionSchema = z.object({
  id: z.uuid().optional(),
  value: z.string().trim().min(1).max(150),
  label: z.string().trim().min(1).max(150),
  sortOrder: z.coerce.number().int().min(0).default(0),
  active: z.boolean().default(true)
})

export const attributeSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    type: z.enum(attributeTypes),
    unit: z.string().trim().max(50).nullish(),
    filterable: z.boolean().default(false),
    variant: z.boolean().default(false),
    active: z.boolean().default(true),
    sortOrder: z.coerce.number().int().min(0).default(0),
    options: z.array(optionSchema).default([]),
    categories: z
      .array(
        z.object({
          categoryId: z.uuid(),
          required: z.boolean().default(false),
          sortOrder: z.coerce.number().int().min(0).default(0)
        })
      )
      .default([])
  })
  .superRefine((value, context) => {
    if (['SELECT', 'MULTISELECT'].includes(value.type) && value.options.length === 0) {
      context.addIssue({ code: 'custom', path: ['options'], message: 'Agrega al menos una opción.' })
    }
    if (value.variant && !['SELECT', 'MULTISELECT'].includes(value.type)) {
      context.addIssue({
        code: 'custom',
        path: ['variant'],
        message: 'Solo atributos de opciones pueden generar variantes.'
      })
    }
  })

export type AttributeInput = z.infer<typeof attributeSchema>
