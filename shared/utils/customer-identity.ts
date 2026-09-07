export type CustomerIdentity = {
  id: string
  documentNumber: string | null
  email: string | null
  whatsapp: string | null
  deletedAt: Date | string | null
}

export function resolveCustomerIdentity<T extends CustomerIdentity>(
  input: Pick<CustomerIdentity, 'documentNumber' | 'email' | 'whatsapp'>,
  matches: T[]
) {
  const ownerIds = new Set(matches.map((customer) => customer.id))
  if (ownerIds.size > 1 || matches.some((customer) => customer.deletedAt)) {
    return { conflict: true as const, customer: null }
  }
  const customer =
    matches.find((item) => input.documentNumber != null && item.documentNumber === input.documentNumber) ||
    matches.find((item) => input.email != null && item.email === input.email) ||
    matches.find((item) => item.whatsapp === input.whatsapp) ||
    null
  return { conflict: false as const, customer }
}
