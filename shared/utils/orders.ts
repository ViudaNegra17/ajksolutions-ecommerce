import type { OrderStatus } from '@prisma/client'

export const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONTACTED', 'CANCELLED'],
  CONTACTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PAYMENT_PENDING', 'PAID', 'CANCELLED'],
  PAYMENT_PENDING: ['PAID', 'CANCELLED'],
  PAID: ['PREPARING'],
  PREPARING: ['READY'],
  READY: ['SHIPPED', 'DELIVERED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: []
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return from === to || orderTransitions[from].includes(to)
}

export function decideAvailabilitySource(ownAvailable: number, supplierAvailable: number, requested: number) {
  if (ownAvailable >= requested) return 'OWN_STOCK' as const
  if (supplierAvailable >= requested) return 'SUPPLIER_STOCK' as const
  return null
}
