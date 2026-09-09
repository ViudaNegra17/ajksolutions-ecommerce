import type { Page } from '@playwright/test'
import type { PublicProductDetail } from '../../../shared/types/public-catalog'

export const visualProduct: PublicProductDetail = {
  id: 'visual-physical',
  productCode: 'PRD-000101',
  sku: 'AJK-101',
  name: 'Teclado inalámbrico compacto',
  slug: 'teclado-visual',
  shortDescription: 'Comodidad y precisión para tu espacio de trabajo.',
  productType: 'PHYSICAL',
  featured: true,
  brand: { name: 'AJK Selección', slug: 'ajk' },
  category: { name: 'Accesorios', slug: 'accesorios' },
  image: null,
  price: {
    mode: 'FIXED',
    amount: '35.00',
    net: '35.00',
    tax: '0.00',
    currency: 'USD',
    taxIncludedInDisplayedPrice: true
  },
  availability: {
    source: 'OWN_STOCK',
    available: true,
    ownStock: 8,
    supplierAvailable: false,
    estimatedLeadTimeDays: null
  },
  hasVariants: false,
  promotion: null,
  description: 'Un teclado cómodo y ligero para estudiar, trabajar y crear.',
  warranty: '12 meses de garantía.',
  metaTitle: null,
  metaDescription: null,
  images: [],
  specifications: [{ name: 'Conexión', value: 'Bluetooth', unit: null }],
  variants: [],
  breadcrumbs: [
    { name: 'Inicio', path: '/' },
    { name: 'Productos', path: '/productos' },
    { name: 'Teclado inalámbrico compacto', path: '/productos/teclado-visual' }
  ]
}
export const visualDigital: PublicProductDetail = {
  ...visualProduct,
  id: 'visual-digital',
  productCode: 'PRD-000102',
  sku: 'AJK-102',
  name: 'Software de productividad',
  slug: 'software-visual',
  productType: 'DIGITAL',
  featured: false,
  shortDescription: 'Herramientas digitales para organizar tus proyectos.',
  warranty: null,
  availability: {
    source: 'DIGITAL',
    available: true,
    ownStock: 0,
    supplierAvailable: false,
    estimatedLeadTimeDays: null
  },
  breadcrumbs: [
    { name: 'Inicio', path: '/' },
    { name: 'Productos', path: '/productos' },
    { name: 'Software de productividad', path: '/productos/software-visual' }
  ]
}
const categories = [
  {
    name: 'Accesorios',
    slug: 'accesorios',
    description: 'Completa tu espacio de trabajo.',
    imageUrl: null,
    icon: 'i-lucide-keyboard',
    children: []
  }
]
const settings = {
  business: {
    name: 'AJKSolutionS',
    whatsapp: '+593999999999',
    phone: '0999999999',
    email: 'hola@example.test',
    address: 'Atención coordinada por WhatsApp',
    city: 'Guayaquil',
    country: 'EC',
    timeZone: 'America/Guayaquil'
  },
  currency: 'USD',
  country: 'EC',
  commerce: { currency: 'USD', taxRate: 0, pricesIncludeTax: true },
  inventory: { defaultLocationCode: 'LOC-000001', lowStockThreshold: 3 },
  operations: { orderAlertHours: 24, ticketAlertHours: 24 },
  seo: {
    siteName: 'AJKSolutionS',
    title: 'Tecnología para tu día a día',
    description: 'Productos y soporte para ti.',
    defaultTitle: 'AJKSolutionS',
    defaultDescription: 'Tecnología y atención personalizada.'
  },
  social: { facebook: '', instagram: '' }
}
const service = {
  code: 'SRV-000101',
  name: 'Mantenimiento de computadoras',
  slug: 'mantenimiento-visual',
  shortDescription: 'Cuida el rendimiento de tu equipo con atención profesional.',
  image: null,
  category: { name: 'Soporte técnico', slug: 'soporte' },
  price: { mode: 'FROM', amount: '25.00', currency: 'USD', includesTax: true },
  modalities: ['En taller', 'Remoto'],
  estimatedDuration: '24 a 48 horas',
  featured: true,
  description: 'Revisión y mantenimiento para que puedas seguir trabajando.',
  warranty: 'Garantía de servicio.',
  requiresDevice: false,
  allowAttachments: false,
  formFields: [],
  metaTitle: null,
  metaDescription: null
}
export async function visualFixtures(
  page: Page,
  paths: { physicalSlug?: string; digitalSlug?: string; serviceSlug?: string } = {}
) {
  const physical = { ...visualProduct, slug: paths.physicalSlug ?? visualProduct.slug }
  const digital = { ...visualDigital, slug: paths.digitalSlug ?? visualDigital.slug }
  const visualService = { ...service, slug: paths.serviceSlug ?? service.slug }
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' })
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    let data: unknown
    if (path === '/api/home')
      data = {
        categories,
        brands: [physical.brand],
        featured: [physical, digital],
        newest: [physical, digital],
        settings,
        services: [visualService],
        banners: []
      }
    else if (path === '/api/categories') data = categories
    else if (path === '/api/banners') data = []
    else if (path === '/api/settings/public' || path === '/api/admin/settings') data = settings
    else if (path === '/api/products')
      data = {
        items: [physical, digital],
        pagination: { page: 1, pageSize: 12, total: 2, totalPages: 1 },
        filters: { categories, brands: [physical.brand], attributes: [] }
      }
    else if (path.endsWith('/related')) data = [digital]
    else if (path === `/api/products/${physical.slug}`) data = physical
    else if (path === `/api/products/${digital.slug}`) data = digital
    else if (path === '/api/services') data = { items: [visualService], categories: [visualService.category] }
    else if (path === `/api/services/${visualService.slug}`) data = visualService
    else if (path === '/api/admin/dashboard')
      data = {
        range: { timeZone: 'America/Guayaquil' },
        orders: { new: 3, pending: 5, confirmed: 2, delivered: 12 },
        tickets: { new: 2, open: 4 },
        customers: 18,
        products: 24,
        money: { orderValue: '540.00', confirmedValue: '210.00', deliveredValue: '1250.00', currency: 'USD' },
        lowStock: { threshold: 3, items: [] },
        supplierOnly: 2,
        alerts: { oldReservedOrders: 0, oldNewTickets: 0, productsWithoutImage: 0, contactFeatured: 0 },
        recentOrders: [],
        recentTickets: []
      }
    else if (path === '/api/admin/products')
      data = {
        items: [
          {
            ...physical,
            price: '35.00',
            active: true,
            inventoryStocks: [],
            supplierProducts: [],
            _count: { variants: 0 }
          }
        ],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 }
      }
    else if (path === '/api/admin/categories') data = []
    else if (path === '/api/admin/brands' || path === '/api/admin/suppliers')
      data = { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }
    else if (path === '/api/checkout/preview') {
      const digital = route.request().postDataJSON().deliveryType === 'DIGITAL'
      const product = digital ? visualDigital : physical
      data = {
        items: [
          {
            productId: product.id,
            variantId: null,
            productName: product.name,
            variantName: null,
            slug: product.slug,
            image: null,
            quantity: 1,
            productType: product.productType,
            unitPrice: '35.00',
            taxRate: '0',
            taxAmount: '0.00',
            subtotal: '35.00',
            total: '35.00',
            availabilitySource: digital ? 'DIGITAL' : 'OWN_STOCK',
            estimatedLeadTimeDays: null,
            warnings: []
          }
        ],
        subtotal: '35.00',
        discount: '0.00',
        tax: '0.00',
        shipping: '0.00',
        total: '35.00',
        currency: 'USD',
        shippingPendingQuote: false,
        checkoutFingerprint: 'visual-only',
        warnings: []
      }
    } else return route.continue()
    await route.fulfill({ json: { success: true, data } })
  })
}
