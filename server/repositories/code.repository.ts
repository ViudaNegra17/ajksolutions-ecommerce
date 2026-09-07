import type { Prisma } from '@prisma/client'

const formats = {
  product: { prefix: 'PRD', width: 6 },
  supplier: { prefix: 'SUP', width: 6 },
  variant: { prefix: 'VAR', width: 7 },
  movement: { prefix: 'MOV', width: 9 },
  service: { prefix: 'SRV', width: 6 },
  customer: { prefix: 'CLI', width: 6 },
  ticket: { prefix: 'TCK', width: 6 },
  order: { prefix: 'ORD', width: 6 },
  license: { prefix: 'LIC', width: 7 },
  banner: { prefix: 'BAN', width: 6 },
  promotion: { prefix: 'PRO', width: 6 }
} as const

export async function nextCommercialCode(
  transaction: Prisma.TransactionClient,
  key: keyof typeof formats
): Promise<string> {
  const sequence = await transaction.codeSequence.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 }
  })
  const format = formats[key]
  return `${format.prefix}-${sequence.value.toString().padStart(format.width, '0')}`
}
