import { expect, test, type APIRequestContext } from '@playwright/test'
import 'dotenv/config'
import { prisma } from '../../server/utils/prisma'
import { visualFixtures } from './fixtures/ui-phase7-5'

// Screens are independent; keep workers=1, but inspect all diffs after a visual failure.
test.describe.configure({ timeout: 90_000 })

const suffix = Date.now().toString()
let physicalSlug = ''
let digitalSlug = ''
const productIds: string[] = []
let categoryId = ''
let serviceSlug = ''

const screenshotOptions = {
  fullPage: true,
  animations: 'disabled' as const,
  style: 'nuxt-devtools-panel, #nuxt-devtools-container { visibility: hidden !important; }',
  maxDiffPixelRatio: 0.005,
  timeout: 15_000
}
const selectedScreens = new Set(process.env.VISUAL_SCREEN_FILTER?.split(',').filter(Boolean) || [])

function publicPath(screen: string) {
  if (screen === 'home') return '/'
  if (screen === 'products') return `/productos?search=${encodeURIComponent('Teclado inalámbrico compacto')}`
  if (screen === 'digital') return `/productos/${digitalSlug}/comprar`
  if (screen === 'services') return '/servicios'
  if (screen === 'service-detail') return `/servicios/${serviceSlug}`
  return `/productos/${physicalSlug}`
}

async function login(request: APIRequestContext) {
  const response = await request.post('/api/auth/login', {
    data: { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD }
  })
  expect(response.ok(), await response.text()).toBe(true)
}

test.beforeAll(async ({ request }) => {
  await login(request)
  const category = await prisma.category.create({
    data: { name: `Visual E2E ${suffix}`, slug: `visual-e2e-${suffix}`, active: true }
  })
  categoryId = category.id
  serviceSlug = (await prisma.service.findFirstOrThrow({ where: { active: true, deletedAt: null } })).slug

  for (const product of [
    {
      sku: `VIS-P-${suffix}`,
      name: 'Teclado inalámbrico compacto',
      productType: 'PHYSICAL',
      price: '35.00',
      manageStock: true
    },
    {
      sku: `VIS-D-${suffix}`,
      name: 'Software de productividad',
      productType: 'DIGITAL',
      price: '29.90',
      manageStock: false
    }
  ]) {
    const response = await request.post('/api/admin/products', {
      data: {
        ...product,
        ...(product.productType === 'PHYSICAL'
          ? {
              description: 'Un teclado cómodo y ligero para estudiar, trabajar y crear.',
              warranty: '12 meses de garantía.',
              weight: '0.35'
            }
          : {}),
        categoryId: category.id,
        priceMode: 'FIXED',
        taxRate: '0',
        priceIncludesTax: true,
        active: true,
        featured: true,
        images: [],
        variants: [],
        attributeValues: [],
        supplierProducts: []
      }
    })
    expect(response.status(), await response.text()).toBe(201)
    const saved = (await response.json()).data
    productIds.push(saved.id)
    if (product.productType === 'PHYSICAL') physicalSlug = saved.slug
    else digitalSlug = saved.slug
  }
  const location = await prisma.inventoryLocation.findFirstOrThrow({
    where: { active: true, deletedAt: null }
  })
  const adjustment = await request.post('/api/admin/inventory/adjust', {
    data: {
      locationId: location.id,
      productId: productIds[0],
      variantId: null,
      type: 'INITIAL',
      quantity: 8,
      reason: 'Referencia visual automatizada'
    }
  })
  expect(adjustment.ok(), await adjustment.text()).toBe(true)
})

test.afterAll(async ({ request }) => {
  await login(request)
  for (const id of productIds) await request.delete(`/api/admin/products/${id}`)
  await prisma.auditLog.deleteMany({ where: { entityId: { in: productIds } } })
  await prisma.inventoryMovement.deleteMany({ where: { productId: { in: productIds } } })
  await prisma.inventoryStock.deleteMany({ where: { productId: { in: productIds } } })
  await prisma.product.deleteMany({ where: { id: { in: productIds } } })
  if (categoryId) await prisma.category.delete({ where: { id: categoryId } })
  await prisma.$disconnect()
})

for (const width of [390, 1440]) {
  for (const screen of [
    'home',
    'products',
    'detail',
    'cart',
    'checkout',
    'digital',
    'services',
    'service-detail'
  ]) {
    if (selectedScreens.size && !selectedScreens.has(screen)) continue
    test(`visual ${screen} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await visualFixtures(page, { physicalSlug, digitalSlug, serviceSlug })
      await page.goto(publicPath(screen))

      if (screen === 'cart' || screen === 'checkout') {
        await page.waitForFunction(() => localStorage.getItem('ajksolutions-cart') !== null)
        await page.getByTestId('add-to-cart').click()
        await expect(page.getByTestId('cart-count')).toHaveText('1')
        await page.getByLabel('Carrito', { exact: true }).click()
        if (screen === 'checkout') {
          await page.getByRole('link', { name: 'Finalizar pedido', exact: true }).click()
          await expect(page.getByTestId('confirm-order')).toBeEnabled()
        }
      }
      if (screen === 'digital') await expect(page.locator('input[type="email"]')).toBeVisible()

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 45_000 })
      await page.evaluate(() => document.fonts.ready)
      await expect(page.locator('html')).not.toHaveClass(/dark/)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      await expect(page).toHaveScreenshot(`${screen}-${width}.png`, screenshotOptions)
    })
  }
}

for (const screen of ['dashboard', 'products', 'settings']) {
  if (selectedScreens.size && !selectedScreens.has(`admin-${screen}`)) continue
  test(`visual admin ${screen}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await login(page.request)
    await visualFixtures(page, { physicalSlug, digitalSlug, serviceSlug })
    const paths = {
      dashboard: '/admin',
      products: '/admin/catalogo/productos',
      settings: '/admin/configuracion'
    }
    await page.goto(paths[screen as keyof typeof paths])
    await expect(page.locator('[data-admin-app]')).toHaveAttribute('data-hydrated', 'true', {
      timeout: 45_000
    })
    await expect(page.getByTestId('admin-navbar').getByRole('heading', { level: 1 })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    await expect(page).toHaveScreenshot(`admin-${screen}.png`, {
      ...screenshotOptions,
      mask: [page.locator('header .hidden.text-right')]
    })
  })
}
