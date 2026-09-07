import type { Prisma } from '@prisma/client'
import type { CustomerRequestInput } from '#shared/schemas/customer.schema'
import { resolveCustomerIdentity } from '#shared/utils/customer-identity'
import { apiError } from '../utils/api-error'
import { nextCommercialCode } from './code.repository'

export type NormalizedCustomer = CustomerRequestInput & {
  documentNumber: string | null
  email: string | null
  phone: string | null
  whatsapp: string
}

export const customerRepository = {
  async findOrCreate(tx: Prisma.TransactionClient, input: NormalizedCustomer) {
    const identities: Prisma.CustomerWhereInput[] = [
      ...(input.documentNumber ? [{ documentNumber: input.documentNumber }] : []),
      ...(input.email ? [{ email: input.email }] : []),
      { whatsapp: input.whatsapp }
    ]
    const matches = await tx.customer.findMany({ where: { OR: identities } })
    const resolution = resolveCustomerIdentity(input, matches)
    if (resolution.conflict) {
      throw apiError(
        409,
        'CUSTOMER_IDENTITY_CONFLICT',
        'Los identificadores enviados pertenecen a clientes diferentes o no reutilizables.'
      )
    }
    const existing = resolution.customer
    if (existing) {
      return tx.customer.update({
        where: { id: existing.id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          documentType: input.documentType || existing.documentType,
          documentNumber: input.documentNumber || existing.documentNumber,
          email: input.email || existing.email,
          phone: input.phone || existing.phone,
          whatsapp: input.whatsapp,
          active: true
        }
      })
    }
    return tx.customer.create({
      data: {
        customerCode: await nextCommercialCode(tx, 'customer'),
        firstName: input.firstName,
        lastName: input.lastName,
        documentType: input.documentType || null,
        documentNumber: input.documentNumber,
        email: input.email,
        phone: input.phone,
        whatsapp: input.whatsapp
      }
    })
  }
}
