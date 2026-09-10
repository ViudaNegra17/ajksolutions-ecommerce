import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import 'dotenv/config'
import { prisma } from '../../server/utils/prisma'

test.describe.configure({ mode: 'serial', timeout: 90_000 })
const suffix = Date.now().toString()
const ids: Record<string, string> = {}
const productName = 'Producto UX ' + suffix
const categorySlug = 'ux-' + suffix
const productSlug = 'producto-ux-' + suffix
async function login(request: APIRequestContext) {
  const response = await request.post('/api/auth/login', {
    data: { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD }
  })
  expect(response.ok(), await response.text()).toBe(true)
}
async function ready(page: Page, path: string) {
  await page.goto(path)
  await expect(page.locator('[data-admin-app], [data-public-app]')).toHaveAttribute('data-hydrated', 'true', {
    timeout: 45_000
  })
}
async function markDocument(page: Page) {
  await page.evaluate(() => {
    document.documentElement.dataset.noReload = 'preserved'
  })
}
async function unchangedDocument(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-no-reload', 'preserved')
}
test.beforeAll(async ({ request }) => {
  await login(request)
  const category = await request.post('/api/admin/categories', {
    data: { name: 'Categoría UX ' + suffix, slug: categorySlug, active: true, sortOrder: 0 }
  })
  expect(category.ok()).toBe(true)
  ids.category = (await category.json()).data.id
  const product = await request.post('/api/admin/products', {
    data: {
      sku: 'UX-' + suffix,
      name: productName,
      slug: productSlug,
      categoryId: ids.category,
      productType: 'PHYSICAL',
      priceMode: 'FIXED',
      price: '35.00',
      taxRate: '0',
      priceIncludesTax: false,
      manageStock: true,
      active: true,
      featured: false,
      images: [],
      variants: [],
      attributeValues: [],
      supplierProducts: []
    }
  })
  expect(product.ok(), await product.text()).toBe(true)
  ids.product = (await product.json()).data.id
  const location = await prisma.inventoryLocation.findFirstOrThrow({
    where: { active: true, deletedAt: null }
  })
  ids.location = location.id
  const adjustment = await request.post('/api/admin/inventory/adjust', {
    data: {
      locationId: location.id,
      productId: ids.product,
      variantId: null,
      type: 'INITIAL',
      quantity: 5,
      reason: 'Fixture UX'
    }
  })
  expect(adjustment.ok()).toBe(true)
  const customer = await prisma.customer.create({
    data: {
      customerCode: 'UXC' + suffix,
      firstName: 'Cliente',
      lastName: 'UX',
      email: 'ux-' + suffix + '@example.test'
    }
  })
  ids.customer = customer.id
  const order = await prisma.order.create({
    data: {
      orderNumber: 'UXO' + suffix,
      requestId: crypto.randomUUID(),
      checkoutFingerprint: 'A'.repeat(43),
      customerId: customer.id,
      status: 'NEW',
      deliveryType: 'PICKUP',
      subtotal: '35',
      tax: '0',
      total: '35',
      currency: 'USD'
    }
  })
  ids.order = order.id
  const service = await prisma.service.findFirstOrThrow({ where: { active: true, deletedAt: null } })
  const ticket = await prisma.ticket.create({
    data: {
      ticketCode: 'UXT' + suffix,
      customerId: customer.id,
      serviceId: service.id,
      subject: 'Solicitud UX',
      status: 'NEW',
      priority: 'NORMAL'
    }
  })
  ids.ticket = ticket.id
})
test.afterAll(async ({ request }) => {
  await login(request)
  for (const [key, resource] of [
    ['banner', 'banners'],
    ['promotion', 'promotions'],
    ['product', 'products'],
    ['category', 'categories']
  ] as const)
    if (ids[key]) await request.delete('/api/admin/' + resource + '/' + ids[key])
  const auditIds = Object.values(ids)
  await prisma.auditLog.deleteMany({ where: { entityId: { in: auditIds } } })
  if (ids.ticket) await prisma.ticket.deleteMany({ where: { id: ids.ticket } })
  if (ids.order) await prisma.order.deleteMany({ where: { id: ids.order } })
  if (ids.customer) await prisma.customer.deleteMany({ where: { id: ids.customer } })
  if (ids.banner) await prisma.banner.deleteMany({ where: { id: ids.banner } })
  if (ids.promotion) await prisma.promotion.deleteMany({ where: { id: ids.promotion } })
  if (ids.product) {
    await prisma.inventoryMovement.deleteMany({ where: { productId: ids.product } })
    await prisma.inventoryStock.deleteMany({ where: { productId: ids.product } })
    await prisma.product.deleteMany({ where: { id: ids.product } })
  }
  if (ids.category) await prisma.category.deleteMany({ where: { id: ids.category } })
  await prisma.$disconnect()
})

test('caché público: HIT, parámetros, invalidación tras guardar y ausencia en privado', async ({
  request
}) => {
  await login(request)
  const path = '/api/products?category=' + categorySlug
  const first = await request.get(path)
  expect(first.ok()).toBe(true)
  expect((await request.get(path)).headers()['x-public-cache']).toBe('HIT')
  const other = await request.get(path + '&search=inexistente')
  expect((await other.json()).data.items).toHaveLength(0)
  const draft = (await (await request.get('/api/admin/products/' + ids.product)).json()).data
  const update = await request.put('/api/admin/products/' + ids.product, {
    data: { ...draft, shortDescription: 'Información actualizada al instante' }
  })
  expect(update.ok(), await update.text()).toBe(true)
  const fresh = await request.get(path)
  expect(fresh.headers()['x-public-cache']).toBe('MISS')
  expect((await fresh.json()).data.items[0].shortDescription).toBe('Información actualizada al instante')
  for (const url of [
    '/api/auth/session',
    '/api/admin/dashboard',
    '/api/admin/products',
    '/api/products/' + productSlug + '/availability'
  ]) {
    const response = await request.get(url)
    expect(response.headers()['cache-control']).toContain('no-store')
    expect(response.headers()['x-public-cache']).toBeUndefined()
  }
  const preview = await request.post('/api/checkout/preview', {
    data: { items: [{ productId: ids.product, variantId: null, quantity: 1 }], deliveryType: 'PICKUP' }
  })
  expect(preview.ok()).toBe(true)
  expect(preview.headers()['x-public-cache']).toBeUndefined()
  expect(preview.headers()['cache-control']).toContain('no-store')
  expect(JSON.stringify(await (await request.get('/api/home')).json())).not.toMatch(
    /supplierCost|passwordHash|handoffToken|permissions|quantityReserved/
  )
})

test('sin F5: guardar producto y ajustar inventario actualiza lista y movimientos', async ({ page }) => {
  await login(page.request)
  await ready(page, '/admin/catalogo/productos/' + ids.product)
  await markDocument(page)
  await page.getByLabel('Nombre', { exact: true }).fill(productName + ' editado')
  await page.getByRole('button', { name: 'Guardar producto', exact: true }).click()
  await expect(page.getByText('Producto actualizado', { exact: true })).toBeVisible()
  await unchangedDocument(page)
  await page.getByRole('link', { name: 'Volver', exact: true }).click()
  await page.getByPlaceholder('Código, SKU, nombre o slug').fill(productName)
  await expect(page.getByText(productName + ' editado', { exact: true })).toBeVisible()
  await ready(page, '/admin/catalogo/inventario')
  await page.getByPlaceholder('Producto, SKU o movimiento').fill(productName)
  const row = page.getByRole('row').filter({ hasText: productName })
  await expect(row).toBeVisible()
  await markDocument(page)
  await row.getByRole('button', { name: 'Ajustar', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Cantidad', { exact: true }).fill('2')
  await dialog.getByLabel('Motivo').fill('Ajuste UX sin recargar')
  await dialog.getByRole('button', { name: 'Confirmar ajuste', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(row.getByRole('cell', { name: '7', exact: true }).first()).toBeVisible()
  await unchangedDocument(page)
  await page.getByRole('button', { name: 'Movimientos', exact: true }).click()
  await expect(page.getByText('Ajuste UX sin recargar', { exact: true })).toBeVisible()
})

test('sin F5: cambiar estado de pedido y de solicitud', async ({ page }) => {
  await login(page.request)
  await ready(page, '/admin/pedidos/' + ids.order)
  await markDocument(page)
  await page
    .locator('select')
    .filter({ has: page.locator('option[value="CONTACTED"]') })
    .selectOption('CONTACTED')
  await page.getByRole('button', { name: /Actualizar estado|Guardar estado/ }).click()
  await expect(page.getByText('Contactado', { exact: true }).first()).toBeVisible()
  await unchangedDocument(page)
  await ready(page, '/admin/tickets/' + ids.ticket)
  await markDocument(page)
  const ticketStatus = page.locator('select').filter({ has: page.locator('option[value="IN_REVIEW"]') })
  await ticketStatus.selectOption('IN_REVIEW')
  await expect
    .poll(async () => (await (await page.request.get('/api/admin/tickets/' + ids.ticket)).json()).data.status)
    .toBe('IN_REVIEW')
  await expect(ticketStatus).toHaveValue('IN_REVIEW')
  await unchangedDocument(page)
})

test('sin F5: banner, promoción y settings; el público recibe contenido nuevo', async ({ page }) => {
  await login(page.request)
  const banner = await page.request.post('/api/admin/banners', {
    data: {
      title: 'Banner UX ' + suffix,
      imageUrl: 'https://example.com/banner.png',
      placement: 'HOME_SECONDARY',
      active: true,
      sortOrder: 0
    }
  })
  expect(banner.ok(), await banner.text()).toBe(true)
  ids.banner = (await banner.json()).data.id
  await page.request.get('/api/home')
  await ready(page, '/admin/banners')
  await markDocument(page)
  await page
    .getByRole('row')
    .filter({ hasText: 'Banner UX ' + suffix })
    .getByRole('button', { name: 'Editar', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByLabel('Título', { exact: true })
    .fill('Banner actualizado UX ' + suffix)
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Banner actualizado UX ' + suffix, { exact: true })).toBeVisible()
  await unchangedDocument(page)
  const home = await page.request.get('/api/home')
  expect(
    (await home.json()).data.banners.some(
      (item: { title: string }) => item.title === 'Banner actualizado UX ' + suffix
    )
  ).toBe(true)
  const promotion = await page.request.post('/api/admin/promotions', {
    data: {
      name: 'Promoción UX ' + suffix,
      badge: 'Novedad',
      type: 'INFORMATIONAL',
      active: true,
      priority: 0,
      productIds: [ids.product],
      categoryIds: []
    }
  })
  expect(promotion.ok(), await promotion.text()).toBe(true)
  ids.promotion = (await promotion.json()).data.id
  await ready(page, '/admin/promociones')
  await markDocument(page)
  await page
    .getByRole('row')
    .filter({ hasText: 'Promoción UX ' + suffix })
    .getByRole('button', { name: 'Editar', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByLabel('Nombre', { exact: true })
    .fill('Promoción actualizada UX ' + suffix)
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Promoción actualizada UX ' + suffix, { exact: true })).toBeVisible()
  await unchangedDocument(page)
  const original = (await (await page.request.get('/api/admin/settings')).json()).data
  try {
    await ready(page, '/admin/configuracion')
    await markDocument(page)
    await page.getByLabel('Facebook HTTPS', { exact: true }).fill('https://facebook.com/ajk-ux-' + suffix)
    await page.getByRole('button', { name: 'Guardar configuración', exact: true }).click()
    await expect(page.getByText('Configuración guardada', { exact: true })).toBeVisible()
    await unchangedDocument(page)
    const settings = await page.request.get('/api/settings/public')
    expect((await settings.json()).data.social.facebook).toBe('https://facebook.com/ajk-ux-' + suffix)
  } finally {
    expect((await page.request.put('/api/admin/settings', { data: original })).ok()).toBe(true)
  }
})

test('móvil: menú y filtros gestionan foco/Escape; búsqueda usa teclado e IDs únicos', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await ready(page, '/productos')
  const trigger = page.getByRole('button', { name: 'Abrir menú', exact: true })
  await trigger.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    expect(
      await page.getByRole('dialog').evaluate((element) => element.contains(document.activeElement))
    ).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await page.getByRole('button', { name: 'Filtros', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  const idsFound = await page
    .locator('input[role="combobox"]')
    .evaluateAll((elements) => elements.map((element) => element.id))
  expect(new Set(idsFound).size).toBe(idsFound.length)
  const search = page.getByRole('combobox', { name: 'Buscar productos', exact: true })
  await search.fill(productName)
  await expect(page.getByRole('option').filter({ hasText: productName })).toBeVisible()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp('/productos/' + productSlug + '$'))
})

test('admin desktop: sidebar oficial colapsa, navega, persiste y permite redimensionar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await login(page.request)
  await ready(page, '/admin')

  const sidebar = page.getByTestId('admin-sidebar')
  const navbar = page.getByTestId('admin-navbar')
  const collapse = page.getByTestId('admin-sidebar-collapse')
  await expect(sidebar).toBeVisible()
  await expect(navbar).toBeVisible()
  await expect(navbar.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  await expect(navbar.getByTestId('admin-sidebar-collapse')).toBeVisible()
  await expect(sidebar.getByTestId('admin-sidebar-collapse')).toHaveCount(0)
  await expect(sidebar).toHaveAttribute('data-collapsed', 'false')
  await expect(sidebar.getByRole('link', { name: 'Dashboard', exact: true })).toHaveAttribute(
    'aria-current',
    'page'
  )

  await collapse.click()
  await expect(sidebar).toHaveAttribute('data-collapsed', 'true')
  await markDocument(page)
  await sidebar.getByRole('link', { name: 'Productos', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/catalogo\/productos$/)
  await unchangedDocument(page)
  await expect(navbar.getByRole('heading', { name: 'Productos', exact: true })).toBeVisible()
  await expect(page.locator('main').getByRole('heading', { name: 'Productos', exact: true })).toHaveCount(0)
  await expect(sidebar).toHaveAttribute('data-collapsed', 'true')
  await expect(sidebar.getByRole('link', { name: 'Productos', exact: true })).toHaveAttribute(
    'aria-current',
    'page'
  )

  await collapse.click()
  await expect(sidebar).toHaveAttribute('data-collapsed', 'false')
  const sidebarId = await sidebar.getAttribute('id')
  const handle = page.locator(`[data-slot="handle"][aria-controls="${sidebarId}"]`)
  const before = await sidebar.boundingBox()
  const handleBox = await handle.boundingBox()
  expect(before).not.toBeNull()
  expect(handleBox).not.toBeNull()
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + 120)
  await page.mouse.down()
  await page.mouse.move(handleBox!.x + 36, handleBox!.y + 120)
  await page.mouse.up()
  await expect.poll(async () => (await sidebar.boundingBox())?.width || 0).toBeGreaterThan(before!.width + 20)
})

test('admin móvil: sidebar oficial abre, cierra con Escape y navega sin F5', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page.request)
  await ready(page, '/admin')

  const toggle = page.getByTestId('admin-sidebar-toggle')
  await expect(page.getByTestId('admin-navbar').getByTestId('admin-sidebar-collapse')).toBeHidden()
  await expect(page.getByTestId('admin-sidebar')).not.toBeVisible()
  await toggle.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(toggle).toBeFocused()

  await markDocument(page)
  await toggle.click()
  await dialog.getByRole('link', { name: 'Productos', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/catalogo\/productos$/)
  await expect(dialog).not.toBeVisible()
  await unchangedDocument(page)
})

test('responsive: cero overflow en storefront y admin a ocho anchuras', async ({ page }) => {
  test.setTimeout(240_000)
  await login(page.request)
  for (const path of [
    '/',
    '/productos',
    '/productos/' + productSlug,
    '/carrito',
    '/checkout',
    '/servicios',
    '/admin',
    '/admin/catalogo/productos',
    '/admin/catalogo/inventario',
    '/admin/pedidos',
    '/admin/tickets',
    '/admin/clientes',
    '/admin/configuracion',
    '/admin/banners',
    '/admin/promociones'
  ]) {
    await ready(page, path)
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        path + ' at ' + width
      ).toBe(true)
    }
  }
})
