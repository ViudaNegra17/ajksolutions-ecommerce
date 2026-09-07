export type AvailabilitySource = 'OWN_STOCK' | 'SUPPLIER_STOCK' | 'DIGITAL'

export type CheckoutPreviewItem = {
  productId: string
  variantId: string | null
  productName: string
  variantName: string | null
  slug: string
  image: string | null
  quantity: number
  productType: 'PHYSICAL' | 'DIGITAL'
  unitPrice: string
  taxRate: string
  taxAmount: string
  subtotal: string
  total: string
  availabilitySource: AvailabilitySource
  estimatedLeadTimeDays: number | null
  warnings: string[]
}

export type CheckoutPreview = {
  items: CheckoutPreviewItem[]
  subtotal: string
  discount: string
  tax: string
  shipping: string
  total: string
  currency: string
  shippingPendingQuote: boolean
  checkoutFingerprint: string
  warnings: string[]
}

export type PublicOrderResult = {
  orderNumber: string
  status: string
  total: string
  currency: string
  whatsappUrl: string
  handoffToken: string
  hasDigitalItems: boolean
  summary: Array<{ name: string; variant: string | null; quantity: number; total: string }>
}

export type CartDisplayItem = {
  productId: string
  variantId: string | null
  quantity: number
  productType: 'PHYSICAL' | 'DIGITAL'
  name: string
  variantName: string | null
  slug: string
  image: string | null
  displayPrice: string
}
