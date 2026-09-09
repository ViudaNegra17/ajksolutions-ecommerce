import { expect, test } from '@playwright/test'
import 'dotenv/config'
import { prisma } from '../../server/utils/prisma'

test.describe.configure({ mode: 'serial', timeout: 60_000 })
const suffix = Date.now().toString()
const slug = `licencia-digital-62-${suffix}`
const physicalSlug = `producto-fisico-62-${suffix}`
const ids: Record<string, string> = {}

async function login(page: import('@playwright/test').Page) {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) throw new Error('Credenciales seed obligatorias para E2E')
  const response = await page.request.post('/api/auth/login', { data: { email, password } })
  expect(response.ok(), await response.text()).toBe(true)
}

test.beforeAll(async () => {
  const category = await prisma.category.create({
    data: { name: `Licencias 6.2 E2E ${suffix}`, slug: `licencias-62-e2e-${suffix}`, active: true }
  })
  ids.category = category.id
  const physical = await prisma.product.create({
    data: {
      productCode: `PF62${suffix}`,
      sku: `PF62-${suffix}`,
      name: `Producto físico 6.2 ${suffix}`,
      slug: physicalSlug,
      categoryId: category.id,
      productType: 'PHYSICAL',
      priceMode: 'FIXED',
      price: '19.90',
      priceIncludesTax: false,
      taxRate: '0',
      manageStock: true,
      active: true
    }
  })
  ids.physical = physical.id
})

test.afterAll(async () => {
  if (ids.product) {
    const orders = await prisma.order.findMany({
      where: { items: { some: { productId: ids.product } } },
      select: { id: true, customerId: true }
    })
    await prisma.auditLog.deleteMany({
      where: {
        OR: [{ entityId: { in: orders.map((order) => order.id) } }, { entityId: ids.product }]
      }
    })
    await prisma.order.deleteMany({ where: { id: { in: orders.map((order) => order.id) } } })
    await prisma.customer.deleteMany({ where: { id: { in: orders.map((order) => order.customerId) } } })
  }
  await prisma.product.deleteMany({ where: { id: { in: [ids.product, ids.physical].filter(Boolean) } } })
  await prisma.category.deleteMany({ where: { id: ids.category } })
  await prisma.$disconnect()
})

test('admin gestiona DIGITAL como producto y no existe inventario interno de licencias', async ({ page }) => {
  await login(page)
  await page.goto('/admin/catalogo/productos/nuevo')
  await expect(page.locator('[data-admin-app]')).toHaveAttribute('data-hydrated', 'true', { timeout: 30_000 })
  await expect(page.locator('option[value="DIGITAL"]')).toHaveText('Digital / Licencia')
  await expect(page.getByRole('link', { name: 'Licencias' })).toHaveCount(0)

  const response = await page.request.post('/api/admin/products', {
    data: {
      sku: `E2E-D62-${suffix}`,
      name: `Licencia digital 6.2 ${suffix}`,
      slug,
      categoryId: ids.category,
      productType: 'DIGITAL',
      priceMode: 'FIXED',
      price: '29.90',
      priceIncludesTax: false,
      taxRate: '0',
      manageStock: false,
      active: true,
      featured: false,
      images: [],
      attributeValues: [],
      variants: [],
      supplierProducts: []
    }
  })
  expect(response.status(), await response.text()).toBe(201)
  const body = await response.json()
  ids.product = body.data.id
  const legacyApi = await page.request.get('/api/admin/licenses')
  expect(legacyApi.status()).toBe(404)
})

test('/productos → DIGITAL → Buy Now → checkout → ORD → WhatsApp sin carrito', async ({ page }) => {
  await page.goto(`/productos?search=${encodeURIComponent(`Licencia digital 6.2 ${suffix}`)}`)
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }).locator('a[href="/licencias"]')
  ).toHaveCount(0)
  const productLink = page.getByRole('link', { name: `Licencia digital 6.2 ${suffix}` }).first()
  await expect(productLink).toBeVisible({ timeout: 30_000 })
  await productLink.click()
  await expect(page).toHaveURL(new RegExp(`/productos/${slug}$`))
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    new RegExp(`/productos/${slug}$`)
  )
  await expect(page.locator('[data-public-app]')).toHaveAttribute('data-hydrated', 'true', {
    timeout: 30_000
  })
  await page.getByTestId('digital-buy-now').click()
  await expect(page).toHaveURL(new RegExp(`/productos/${slug}/comprar`))
  expect(page.url()).not.toContain('/carrito')
  await page.getByLabel('Nombres').fill('Cliente')
  await page.getByLabel('Apellidos').fill('Digital 6.2')
  await page.getByLabel('Email').fill(`e2e-62-${suffix}@example.com`)
  await page.getByLabel('WhatsApp').fill('0996200002')
  await page.waitForTimeout(1300)
  const responsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/api/orders') && response.request().method() === 'POST'
  )
  await page.getByTestId('confirm-license-order').click()
  const response = await responsePromise
  const body = await response.json()
  expect(response.status(), JSON.stringify(body)).toBe(201)
  expect(body.data.orderNumber).toMatch(/^ORD-\d{6}$/)
  await expect(page.getByRole('heading', { name: 'Pedido registrado' })).toBeVisible()
  await expect(page.getByText(body.data.orderNumber)).toBeVisible()
  const stored = await prisma.order.findUniqueOrThrow({
    where: { orderNumber: body.data.orderNumber },
    include: { items: true }
  })
  expect(stored.deliveryType).toBe('DIGITAL')
  expect(stored.addressId).toBeNull()
  expect(stored.items).toHaveLength(1)
  expect(stored.items[0]?.productTypeSnapshot).toBe('DIGITAL')
})

test('rutas /licencias redirigen permanentemente a la superficie canónica', async ({ page }) => {
  const indexRedirect = await page.request.get('/licencias', { maxRedirects: 0 })
  expect(indexRedirect.status()).toBe(301)
  expect(indexRedirect.headers().location).toBe('/productos')
  const detailRedirect = await page.request.get(`/licencias/${slug}`, { maxRedirects: 0 })
  expect(detailRedirect.status()).toBe(301)
  expect(detailRedirect.headers().location).toBe(`/productos/${slug}`)
  const buyRedirect = await page.request.get(`/licencias/${slug}/comprar?source=legacy`, {
    maxRedirects: 0
  })
  expect(buyRedirect.status()).toBe(301)
  expect(buyRedirect.headers().location).toBe(`/productos/${slug}/comprar?source=legacy`)

  let response = await page.goto('/licencias')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(/\/productos$/)

  response = await page.goto(`/licencias/${slug}`)
  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(new RegExp(`/productos/${slug}$`))

  response = await page.goto(`/licencias/${slug}/comprar?source=legacy`)
  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(new RegExp(`/productos/${slug}/comprar\\?source=legacy$`))
})

test('PHYSICAL no puede abrir checkout directo y DIGITAL solo aparece en sitemap bajo /productos', async ({
  page
}) => {
  const response = await page.goto(`/productos/${physicalSlug}/comprar`)
  expect(response?.status()).toBe(404)

  const sitemap = await page.request.get('/sitemap.xml')
  const xml = await sitemap.text()
  expect(xml).toContain(`/productos/${slug}`)
  expect(xml).not.toContain(`/licencias/${slug}`)
})

test('la búsqueda global abre DIGITAL en /productos', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('combobox', { name: 'Buscar productos' }).first()
  await search.fill(`Licencia digital 6.2 ${suffix}`)
  await expect(page.getByRole('link', { name: `Licencia digital 6.2 ${suffix}` }).first()).toBeVisible({
    timeout: 30_000
  })
  await page
    .getByRole('link', { name: `Licencia digital 6.2 ${suffix}` })
    .first()
    .click()
  await expect(page).toHaveURL(new RegExp(`/productos/${slug}$`))
})

test('detalle y checkout DIGITAL son utilizables en viewport móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/productos/${slug}`)
  await expect(page.locator('[data-public-app]')).toHaveAttribute('data-hydrated', 'true', {
    timeout: 30_000
  })
  await expect(page.getByTestId('digital-buy-now')).toBeVisible()
  await page.getByTestId('digital-buy-now').click()
  await expect(page).toHaveURL(new RegExp(`/productos/${slug}/comprar$`))
  await expect(page.getByLabel('Nombres')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeVisible()
})
