import { z } from 'zod'
import { cartItemsSchema } from './cart.schema'
import { customerRequestSchema } from './customer.schema'

export const deliveryTypeSchema = z.enum(['PICKUP', 'DELIVERY', 'DIGITAL'])

export const checkoutAddressSchema = z
  .object({
    label: z.string().trim().min(1).max(80).default('Principal'),
    recipientName: z.string().trim().min(2).max(220),
    country: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase()),
    province: z.string().trim().min(2).max(120),
    city: z.string().trim().min(2).max(120),
    addressLine1: z.string().trim().min(3).max(255),
    addressLine2: z.string().trim().max(255).optional().nullable(),
    reference: z.string().trim().min(3).max(500),
    postalCode: z.string().trim().max(30).optional().nullable(),
    phone: z.string().trim().max(30).optional().nullable()
  })
  .strict()

export const checkoutPreviewSchema = z
  .object({ items: cartItemsSchema, deliveryType: deliveryTypeSchema.default('PICKUP') })
  .strict()

export const createOrderSchema = z
  .object({
    requestId: z.string().uuid(),
    items: cartItemsSchema,
    checkoutFingerprint: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    customer: customerRequestSchema,
    deliveryType: deliveryTypeSchema,
    address: checkoutAddressSchema.optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
    website: z.string().max(0).optional().default(''),
    startedAt: z.coerce.number().int().positive()
  })
  .strict()
  .superRefine((value, context) => {
    if (value.deliveryType === 'DELIVERY' && !value.address) {
      context.addIssue({
        code: 'custom',
        path: ['address'],
        message: 'La dirección de entrega es obligatoria.'
      })
    }
  })

export type CheckoutPreviewInput = z.infer<typeof checkoutPreviewSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type CheckoutAddressInput = z.infer<typeof checkoutAddressSchema>
