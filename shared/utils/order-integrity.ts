type AddressOwnership = { customerId: string } | null | undefined

export function addressBelongsToCustomer(customerId: string, address: AddressOwnership) {
  return Boolean(address && address.customerId === customerId)
}

export function isPickupShippingConsistent(input: {
  deliveryType: string
  addressId: string | null
  shipping: string | number
  shippingPendingQuote: boolean
}) {
  if (input.deliveryType !== 'PICKUP') return true
  return input.addressId === null && Number(input.shipping) === 0 && input.shippingPendingQuote === false
}
