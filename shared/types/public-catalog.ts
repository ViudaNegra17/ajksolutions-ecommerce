export type PublicAvailabilitySource = 'OWN_STOCK' | 'SUPPLIER_STOCK' | 'DIGITAL' | 'OUT_OF_STOCK'

export type PublicAvailability = {
  source: PublicAvailabilitySource
  available: boolean
  ownStock: number
  supplierAvailable: boolean
  estimatedLeadTimeDays: number | null
}

export type PublicPrice = {
  mode: 'FIXED' | 'CONTACT'
  amount: string | null
  net: string | null
  tax: string | null
  currency: string
  taxIncludedInDisplayedPrice: boolean
}

export type PublicImage = { url: string; alt: string; isPrimary: boolean }

export type PublicBanner = {
  title: string
  subtitle: string | null
  description: string | null
  imageUrl: string
  mobileImageUrl: string | null
  ctaLabel: string | null
  ctaUrl: string | null
  placement: 'HOME_HERO' | 'HOME_SECONDARY' | 'PRODUCTS_TOP'
}

export type PublicProductCard = {
  id: string
  productCode: string
  sku: string
  name: string
  slug: string
  shortDescription: string | null
  productType: 'PHYSICAL' | 'DIGITAL'
  featured: boolean
  brand: { name: string; slug: string } | null
  category: { name: string; slug: string }
  image: PublicImage | null
  price: PublicPrice
  availability: PublicAvailability
  hasVariants: boolean
  promotion: { name: string; description: string | null; badge: string } | null
}

export type PublicCategory = {
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  icon: string | null
  children: PublicCategory[]
}

export type PublicVariantOption = {
  attribute: string
  attributeSlug: string
  value: string
  label: string
}

export type PublicVariant = {
  id: string
  code: string
  sku: string
  name: string
  options: PublicVariantOption[]
  price: PublicPrice
  availability: PublicAvailability
}

export type PublicSpecification = { name: string; value: string; unit: string | null }

export type PublicProductDetail = PublicProductCard & {
  description: string | null
  warranty: string | null
  metaTitle: string | null
  metaDescription: string | null
  images: PublicImage[]
  specifications: PublicSpecification[]
  variants: PublicVariant[]
  breadcrumbs: Array<{ name: string; path: string }>
}

export type PublicFilterOption = { label: string; value: string }
export type PublicAttributeFilter = {
  name: string
  slug: string
  options: PublicFilterOption[]
}

export type PublicSettings = {
  business: {
    name: string
    phone: string | null
    whatsapp: string | null
    email: string | null
    address: string | null
    city: string | null
  }
  currency: string
  country: string
  seo: { siteName: string; title: string | null; description: string | null }
  social: { facebook: string | null; instagram: string | null }
}
