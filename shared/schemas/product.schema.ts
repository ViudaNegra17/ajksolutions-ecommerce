import { z } from 'zod'
import { normalizeSku } from '../utils/catalog-integrity'

const numericInput = z.union([z.string(), z.number().finite()])
const decimal = numericInput
  .transform((value) => String(value))
  .pipe(
    z
      .string()
      .trim()
      .regex(/^\d{1,10}(?:\.\d{1,4})?$/, 'Valor decimal inválido')
  )
const money = numericInput
  .transform((value) => String(value))
  .pipe(
    z
      .string()
      .trim()
      .regex(/^\d{1,10}(?:\.\d{1,2})?$/, 'Valor monetario inválido')
  )
const sku = z.string().trim().min(1).max(100).transform(normalizeSku)

const imageSchema = z.object({
  url: z.url().max(2048),
  storageKey: z.string().trim().max(500).nullish(),
  alt: z.string().trim().max(255).nullish(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false)
})

const attributeValueSchema = z.object({
  attributeId: z.uuid(),
  textValue: z.string().max(10000).nullish(),
  numberValue: decimal.nullish(),
  booleanValue: z.boolean().nullish(),
  optionIds: z.array(z.uuid()).default([])
})

const variantSchema = z.object({
  id: z.uuid().optional(),
  sku,
  name: z.string().trim().max(255).nullish(),
  priceOverride: money.nullish(),
  active: z.boolean().default(true),
  optionIds: z.array(z.uuid()).min(1)
})

export const supplierProductSchema = z.object({
  id: z.uuid().optional(),
  supplierId: z.uuid(),
  variantId: z.uuid().nullish(),
  supplierSku: z.string().trim().max(150).nullish(),
  supplierCost: money.nullish(),
  supplierStock: z.coerce.number().int().min(0).default(0),
  supplierUrl: z.union([z.url().max(2048), z.literal(''), z.null()]).optional(),
  leadTimeDays: z.coerce.number().int().min(0).max(3650).nullish(),
  active: z.boolean().default(true)
})

export const productSchema = z
  .object({
    sku,
    name: z.string().trim().min(2).max(220),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(250)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    shortDescription: z.string().trim().max(500).nullish(),
    description: z.string().trim().max(50000).nullish(),
    productType: z.enum(['PHYSICAL', 'DIGITAL']).default('PHYSICAL'),
    priceMode: z.enum(['FIXED', 'CONTACT']),
    price: money.nullish(),
    priceIncludesTax: z.boolean().default(false),
    taxRate: decimal.refine((value) => Number(value) <= 100).nullish(),
    brandId: z.uuid().nullish(),
    categoryId: z.uuid(),
    manageStock: z.boolean().default(true),
    active: z.boolean().default(false),
    featured: z.boolean().default(false),
    warranty: z.string().trim().max(255).nullish(),
    weight: decimal.nullish(),
    metaTitle: z.string().trim().max(255).nullish(),
    metaDescription: z.string().trim().max(500).nullish(),
    images: z.array(imageSchema).max(20).default([]),
    attributeValues: z.array(attributeValueSchema).default([]),
    variants: z.array(variantSchema).max(250).default([]),
    supplierProducts: z.array(supplierProductSchema).default([])
  })
  .superRefine((value, context) => {
    if (value.productType === 'DIGITAL' && value.manageStock) {
      context.addIssue({
        code: 'custom',
        path: ['manageStock'],
        message: 'Los productos digitales no administran inventario.'
      })
    }
    if (value.priceMode === 'FIXED' && value.price == null) {
      context.addIssue({ code: 'custom', path: ['price'], message: 'El precio es obligatorio.' })
    }
    if (value.priceMode === 'CONTACT' && value.price != null) {
      context.addIssue({
        code: 'custom',
        path: ['price'],
        message: 'Consultar precio no debe guardar un precio ficticio.'
      })
    }
    if (value.priceMode === 'FIXED' && Number(value.price) <= 0) {
      context.addIssue({
        code: 'custom',
        path: ['price'],
        message: 'Un producto con precio fijo debe tener precio mayor a cero.'
      })
    }
    value.variants.forEach((variant, index) => {
      if (value.priceMode === 'CONTACT' && variant.priceOverride != null) {
        context.addIssue({
          code: 'custom',
          path: ['variants', index, 'priceOverride'],
          message: 'Una variante de un producto por consultar no puede tener precio propio.'
        })
      }
      if (variant.priceOverride != null && Number(variant.priceOverride) <= 0) {
        context.addIssue({
          code: 'custom',
          path: ['variants', index, 'priceOverride'],
          message: 'El precio de variante debe ser mayor a cero.'
        })
      }
    })
    const skus = [value.sku, ...value.variants.map((variant) => variant.sku)]
    if (new Set(skus).size !== skus.length) {
      context.addIssue({
        code: 'custom',
        path: ['variants'],
        message: 'El SKU del producto y los SKU de variantes deben ser únicos.'
      })
    }
    if (value.images.filter((image) => image.isPrimary).length > 1) {
      context.addIssue({ code: 'custom', path: ['images'], message: 'Solo una imagen puede ser principal.' })
    }
    const combinations = value.variants.map((variant) => [...new Set(variant.optionIds)].sort().join(':'))
    if (new Set(combinations).size !== combinations.length) {
      context.addIssue({
        code: 'custom',
        path: ['variants'],
        message: 'Existen combinaciones de variantes duplicadas.'
      })
    }
  })

export type ProductInput = z.infer<typeof productSchema>
