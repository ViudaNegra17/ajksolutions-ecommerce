import { Prisma } from '@prisma/client'

type PriceCalculationInput = {
  price: Prisma.Decimal | string
  taxRate: Prisma.Decimal | string
  priceIncludesTax: boolean
}

type EffectivePriceInput = {
  priceMode: 'FIXED' | 'CONTACT'
  price: Prisma.Decimal | string | null
  priceOverride?: Prisma.Decimal | string | null
}

export function calculateEffectivePrice(input: EffectivePriceInput): Prisma.Decimal | null {
  if (input.priceMode === 'CONTACT') return null
  const value = input.priceOverride ?? input.price
  return value == null ? null : new Prisma.Decimal(value)
}

export function calculateProductPrice(input: PriceCalculationInput) {
  const price = new Prisma.Decimal(input.price)
  const rate = new Prisma.Decimal(input.taxRate).div(100)
  const divisor = new Prisma.Decimal(1).add(rate)
  const net = input.priceIncludesTax ? price.div(divisor) : price
  const tax = input.priceIncludesTax ? price.sub(net) : net.mul(rate)
  const total = input.priceIncludesTax ? price : net.add(tax)

  return {
    net: net.toDecimalPlaces(2),
    tax: tax.toDecimalPlaces(2),
    total: total.toDecimalPlaces(2)
  }
}
