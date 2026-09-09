import { expect, test } from '@playwright/test'
import 'dotenv/config'
import argon2 from 'argon2'
import { prisma } from '../../server/utils/prisma'

test.describe.configure({ mode: 'serial', timeout: 60_000 })
const suffix = Date.now().toString()
const ids: Record<string, string> = {}
let originalSettings: Record<string, unknown>
const restrictedEmail = `support-fase7-${suffix}@example.test`
const restrictedPassword = `Fase7-${suffix}-Seguro`

async function login(page: import('@playwright/test').Page) {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) throw new Error('Credenciales seed obligatorias para E2E')
  const response = await page.request.post('/api/auth/login', { data: { email, password } })
  expect(response.ok(), await response.text()).toBe(true)
}

test.beforeAll(async () => {
  const supportRole = await prisma.role.findUniqueOrThrow({ where: { code: 'SUPPORT' } })
  const restricted = await prisma.user.create({
    data: {
      firstName: 'Soporte',
      lastName: 'Fase 7',
      email: restrictedEmail,
      passwordHash: await argon2.hash(restrictedPassword, { type: argon2.argon2id }),
      roles: { create: { roleId: supportRole.id } }
    }
  })
  ids.restrictedUser = restricted.id
  const category = await prisma.category.create({
    data: { name: `Operación F7 ${suffix}`, slug: `operacion-f7-${suffix}`, active: true }
  })
  ids.category = category.id
  const product = await prisma.product.create({
    data: {
      productCode: `E7P${suffix.slice(-10)}`,
      sku: `E7-${suffix}`,
      name: `Producto operación F7 ${suffix}`,
      slug: `producto-operacion-f7-${suffix}`,
      categoryId: category.id,
      productType: 'PHYSICAL',
      priceMode: 'FIXED',
      price: '37.50',
      taxRate: '0',
      manageStock: false,
      active: true,
      featured: true
    }
  })
  ids.product = product.id
  const customer = await prisma.customer.create({
    data: {
      customerCode: `E7C${suffix.slice(-10)}`,
      firstName: 'Cliente',
      lastName: `Fase7 ${suffix}`,
      email: `fase7-${suffix}@example.com`,
      whatsapp: `+5939${suffix.slice(-8)}`
    }
  })
  ids.customer = customer.id
  const order = await prisma.order.create({
    data: {
      orderNumber: `E7O${suffix.slice(-10)}`,
      requestId: crypto.randomUUID(),
      checkoutFingerprint: 'A'.repeat(43),
      customerId: customer.id,
      status: 'NEW',
      deliveryType: 'PICKUP',
      subtotal: '37.50',
      tax: '0',
      total: '37.50',
      currency: 'USD'
    }
  })
  ids.order = order.id
  const service = await prisma.service.findFirstOrThrow({ where: { active: true, deletedAt: null } })
  const ticket = await prisma.ticket.create({
    data: {
      ticketCode: `E7T${suffix.slice(-10)}`,
      customerId: customer.id,
      serviceId: service.id,
      subject: `Ticket F7 ${suffix}`,
      status: 'NEW',
      priority: 'NORMAL'
    }
  })
  ids.ticket = ticket.id
})

test.afterAll(async () => {
  if (originalSettings) {
    const admin = await prisma.user.findFirst({ where: { email: process.env.SEED_ADMIN_EMAIL } })
    if (admin) {
      // La restauración por Prisma evita depender de un servidor ya detenido.
      const social = (originalSettings.social || {}) as Record<string, string>
      await prisma.setting.updateMany({
        where: { key: 'social.facebook' },
        data: { value: social.facebook || '' }
      })
    }
  }
  await prisma.auditLog.deleteMany({ where: { entityId: { in: Object.values(ids) } } })
  if (ids.banner) await prisma.banner.deleteMany({ where: { id: ids.banner } })
  if (ids.expiredBanner) await prisma.banner.deleteMany({ where: { id: ids.expiredBanner } })
  if (ids.promotion) await prisma.promotion.deleteMany({ where: { id: ids.promotion } })
  await prisma.ticket.deleteMany({ where: { id: ids.ticket } })
  await prisma.order.deleteMany({ where: { id: ids.order } })
  await prisma.customer.deleteMany({ where: { id: ids.customer } })
  await prisma.product.deleteMany({ where: { id: ids.product } })
  await prisma.category.deleteMany({ where: { id: ids.category } })
  await prisma.user.deleteMany({ where: { id: ids.restrictedUser } })
  await prisma.$disconnect()
})

test('dashboard muestra KPIs y permite abrir pedido', async ({ page }) => {
  await login(page)
  await page.goto('/admin')
  await expect(page.locator('[data-admin-app]')).toHaveAttribute('data-hydrated', 'true', { timeout: 30_000 })
  await expect(page.getByText('Pedidos nuevos', { exact: true })).toBeVisible()
  await expect(page.getByText('Valor de pedidos', { exact: true })).toBeVisible()
  await page
    .getByRole('link', { name: ids.order ? /E7O/ : /ORD/ })
    .first()
    .click()
  await expect(page).toHaveURL(new RegExp(`/admin/pedidos/${ids.order}$`))
})

test('banner vigente aparece en home y expirado no se publica', async ({ page }) => {
  await login(page)
  const active = await page.request.post('/api/admin/banners', {
    data: {
      title: `Banner F7 ${suffix}`,
      subtitle: 'Operación dinámica',
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3',
      ctaLabel: 'Ver productos',
      ctaUrl: '/productos',
      placement: 'HOME_HERO',
      sortOrder: 1,
      active: true
    }
  })
  expect(active.status(), await active.text()).toBe(201)
  ids.banner = (await active.json()).data.id
  const expired = await page.request.post('/api/admin/banners', {
    data: {
      title: `Expirado F7 ${suffix}`,
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3',
      placement: 'HOME_HERO',
      active: true,
      endsAt: new Date(Date.now() - 86_400_000).toISOString()
    }
  })
  expect(expired.status()).toBe(201)
  ids.expiredBanner = (await expired.json()).data.id
  await page.goto('/')
  await expect(page.getByRole('heading', { name: `Banner F7 ${suffix}` })).toBeVisible()
  await expect(page.getByText(`Expirado F7 ${suffix}`)).toHaveCount(0)
})

test('promoción muestra badge sin alterar el precio', async ({ page }) => {
  await login(page)
  const response = await page.request.post('/api/admin/promotions', {
    data: {
      name: `Promoción F7 ${suffix}`,
      description: 'Sólo informativa',
      badge: 'Oferta F7',
      type: 'INFORMATIONAL',
      active: true,
      priority: 50,
      productIds: [ids.product],
      categoryIds: []
    }
  })
  expect(response.status(), await response.text()).toBe(201)
  ids.promotion = (await response.json()).data.id
  await page.goto(`/productos?search=${encodeURIComponent(`Producto operación F7 ${suffix}`)}`)
  await expect(page.getByText('Oferta F7')).toBeVisible()
  await expect(page.getByText('$37,50')).toBeVisible()
})

test('settings público se actualiza por whitelist y cliente abre su historial', async ({ page }) => {
  await login(page)
  const current = await page.request.get('/api/admin/settings')
  originalSettings = (await current.json()).data
  const changed = structuredClone(originalSettings) as Record<string, Record<string, unknown>>
  changed.social!.facebook = 'https://facebook.com/ajksolutions-fase7'
  const update = await page.request.put('/api/admin/settings', { data: changed })
  expect(update.ok(), await update.text()).toBe(true)
  const publicResponse = await page.request.get('/api/settings/public')
  const publicBody = await publicResponse.json()
  expect(publicBody.data.social.facebook).toBe('https://facebook.com/ajksolutions-fase7')
  expect(publicBody.data).not.toHaveProperty('databaseUrl')
  await page.goto(`/admin/clientes?search=${suffix}`)
  await page.getByRole('link', { name: 'Abrir' }).first().click()
  await expect(page).toHaveURL(new RegExp(`/admin/clientes/${ids.customer}$`))
  await expect(page.getByText(ids.order ? /E7O/ : /ORD/)).toBeVisible()
  await expect(page.getByText(ids.ticket ? /E7T/ : /TCK/)).toBeVisible()
})

test('rutas operativas y públicas principales responden y renderizan', async ({ page }) => {
  await login(page)
  for (const route of [
    '/admin',
    '/admin/pedidos',
    '/admin/tickets',
    '/admin/clientes',
    '/admin/banners',
    '/admin/promociones',
    '/admin/configuracion'
  ]) {
    const response = await page.goto(route)
    expect(response?.ok(), `${route} respondió ${response?.status()}`).toBe(true)
    await expect(page.locator('[data-admin-app]')).toHaveAttribute('data-hydrated', 'true', {
      timeout: 30_000
    })
  }
  for (const route of ['/', '/productos', '/servicios']) {
    const response = await page.goto(route)
    expect(response?.ok(), `${route} respondió ${response?.status()}`).toBe(true)
    await expect(page.locator('body')).toBeVisible()
  }
})

test('RBAC impide escrituras de contenido y settings sin permisos', async ({ page }) => {
  await page.request.post('/api/auth/logout')
  const session = await page.request.post('/api/auth/login', {
    data: { email: restrictedEmail, password: restrictedPassword }
  })
  expect(session.ok(), await session.text()).toBe(true)

  const banner = await page.request.post('/api/admin/banners', {
    data: {
      title: 'No autorizado',
      imageUrl: 'https://example.com/banner.jpg',
      placement: 'HOME_HERO',
      active: true
    }
  })
  const promotion = await page.request.post('/api/admin/promotions', {
    data: {
      name: 'No autorizada',
      badge: 'No',
      type: 'INFORMATIONAL',
      active: true,
      productIds: [],
      categoryIds: []
    }
  })
  const settings = await page.request.put('/api/admin/settings', { data: {} })

  expect(banner.status()).toBe(403)
  expect(promotion.status()).toBe(403)
  expect(settings.status()).toBe(403)
})
