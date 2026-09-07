import { z } from 'zod'

export const cartItemSchema = z
  .object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().nullable().optional().default(null),
    quantity: z.number().int().min(1).max(99)
  })
  .strict()

export const cartItemsSchema = z.array(cartItemSchema).min(1, 'El carrito está vacío.').max(50)

export type CartItemInput = z.infer<typeof cartItemSchema>

export function normalizeCartItems(items: CartItemInput[]) {
  const grouped = new Map<string, CartItemInput>()
  for (const item of items) {
    const key = `${item.productId}:${item.variantId || ''}`
    const current = grouped.get(key)
    const quantity = (current?.quantity || 0) + item.quantity
    if (quantity > 99) throw new Error('La cantidad máxima por producto es 99.')
    grouped.set(key, { productId: item.productId, variantId: item.variantId || null, quantity })
  }
  return [...grouped.values()]
}
