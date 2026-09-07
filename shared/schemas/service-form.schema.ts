import { z } from 'zod'

export const serviceFormFieldTypes = [
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'BOOLEAN',
  'SELECT',
  'MULTISELECT',
  'DATE',
  'EMAIL',
  'PHONE'
] as const

const validationConfigSchema = z
  .object({
    minLength: z.number().int().min(0).max(10000).optional(),
    maxLength: z.number().int().min(1).max(10000).optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional()
  })
  .strict()
  .nullable()
  .optional()

const optionSchema = z.object({
  id: z.string().uuid().optional(),
  value: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9_-]*$/)
    .max(150),
  label: z.string().trim().min(1).max(180),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
  active: z.boolean().default(true)
})

const reservedKeys = new Set(
  ['adminRole', 'assignedUserId', 'priority', 'status', 'ticketCode', 'customerId'].map((item) =>
    item.toLowerCase()
  )
)

export const serviceFormFieldSchema = z
  .object({
    id: z.string().uuid().optional(),
    key: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_]{1,99}$/)
      .refine((value) => !reservedKeys.has(value.toLowerCase()), 'La clave está reservada.'),
    label: z.string().trim().min(1).max(180),
    description: z.string().trim().max(500).optional().nullable(),
    placeholder: z.string().trim().max(255).optional().nullable(),
    type: z.enum(serviceFormFieldTypes),
    required: z.boolean().default(false),
    active: z.boolean().default(true),
    sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
    validationConfig: validationConfigSchema,
    options: z.array(optionSchema).max(100).default([])
  })
  .superRefine((field, context) => {
    const supportsOptions = field.type === 'SELECT' || field.type === 'MULTISELECT'
    if (!supportsOptions && field.options.length) {
      context.addIssue({ code: 'custom', path: ['options'], message: 'Este tipo no admite opciones.' })
    }
    if (supportsOptions && !field.options.some((option) => option.active)) {
      context.addIssue({ code: 'custom', path: ['options'], message: 'Agrega al menos una opción activa.' })
    }
    const values = field.options.map((option) => option.value)
    if (new Set(values).size !== values.length) {
      context.addIssue({ code: 'custom', path: ['options'], message: 'Las opciones no pueden repetirse.' })
    }
    const config = field.validationConfig
    if (config?.minLength != null && config.maxLength != null && config.minLength > config.maxLength) {
      context.addIssue({ code: 'custom', path: ['validationConfig'], message: 'Rango de longitud inválido.' })
    }
    if (config?.min != null && config.max != null && config.min > config.max) {
      context.addIssue({ code: 'custom', path: ['validationConfig'], message: 'Rango numérico inválido.' })
    }
  })

export type ServiceFormFieldInput = z.infer<typeof serviceFormFieldSchema>
