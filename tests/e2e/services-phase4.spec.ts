import { expect, test } from '@playwright/test'
import 'dotenv/config'
import { prisma } from '../../server/utils/prisma'

test.describe.configure({ mode: 'serial', timeout: 60_000 })
const suffix = Date.now().toString()
const slug = `servicio-e2e-${suffix}`
const ids: Record<string, string> = {}

async function login(page: import('@playwright/test').Page) {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password)
    throw new Error('SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD son obligatorios para Fase 4 E2E')
  const response = await page.request.post('/api/auth/login', { data: { email, password } })
  expect(response.ok(), await response.text()).toBe(true)
}

test.beforeAll(async () => {
  const category = await prisma.serviceCategory.create({
    data: { name: `Categoría E2E ${suffix}`, slug: `categoria-e2e-${suffix}`, active: true }
  })
  const service = await prisma.service.create({
    data: {
      serviceCode: `E2E-${suffix}`,
      name: `Diagnóstico E2E ${suffix}`,
      slug,
      shortDescription: 'Servicio verificable desde el portal.',
      categoryId: category.id,
      priceMode: 'QUOTE',
      active: true,
      featured: true,
      fields: { create: { key: 'problema', label: 'Describe el problema', type: 'TEXTAREA', required: true } }
    }
  })
  const supportRole = await prisma.role.findUniqueOrThrow({ where: { code: 'SUPPORT' } })
  const [support, invalid] = await Promise.all([
    prisma.user.create({
      data: {
        firstName: 'Support',
        lastName: 'E2E 4.1',
        email: `support-e2e-4-1-${suffix}@example.test`,
        passwordHash: 'not-used-in-e2e'
      }
    }),
    prisma.user.create({
      data: {
        firstName: 'Inactive',
        lastName: 'E2E 4.1',
        email: `inactive-e2e-4-1-${suffix}@example.test`,
        passwordHash: 'not-used-in-e2e',
        active: false
      }
    })
  ])
  await prisma.userRole.createMany({
    data: [
      { userId: support.id, roleId: supportRole.id },
      { userId: invalid.id, roleId: supportRole.id }
    ]
  })
  Object.assign(ids, {
    category: category.id,
    service: service.id,
    support: support.id,
    invalid: invalid.id
  })
})

test.afterAll(async () => {
  if (ids.service) {
    const tickets = await prisma.ticket.findMany({
      where: { serviceId: ids.service },
      select: { id: true, customerId: true }
    })
    await prisma.ticket.deleteMany({ where: { serviceId: ids.service } })
    await prisma.customer.deleteMany({ where: { id: { in: tickets.map((item) => item.customerId) } } })
    await prisma.service.delete({ where: { id: ids.service } })
  }
  if (ids.adminService) await prisma.service.delete({ where: { id: ids.adminService } })
  if (ids.category) await prisma.serviceCategory.delete({ where: { id: ids.category } })
  await prisma.user.deleteMany({ where: { id: { in: [ids.support, ids.invalid].filter(Boolean) } } })
  await prisma.$disconnect()
})

test('lista, detalle, SEO y sitemap publican solo el servicio activo', async ({ page, request }) => {
  await page.goto(`/servicios?search=${encodeURIComponent(`Diagnóstico E2E ${suffix}`)}`)
  await expect(page.getByText(`Diagnóstico E2E ${suffix}`).first()).toBeVisible()
  await page.goto(`/servicios/${slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Diagnóstico E2E')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    new RegExp(`/servicios/${slug}$`)
  )
  expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain('Service')
  expect(await (await request.get('/sitemap.xml')).text()).toContain(`/servicios/${slug}`)
})

test('crea ticket antes de habilitar WhatsApp y conserva el código', async ({ page }) => {
  await page.goto(`/servicios/${slug}`)
  await expect(page.locator('[data-public-app]')).toHaveAttribute('data-hydrated', 'true', {
    timeout: 15_000
  })
  await page.getByLabel('Nombres').fill('Cliente')
  await page.getByLabel('Apellidos').fill('E2E')
  await page.getByLabel('WhatsApp').fill('0999999999')
  await page.getByLabel('Describe el problema').fill('El equipo no inicia')
  await page.waitForTimeout(1300)
  const responsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/api/tickets') && response.request().method() === 'POST'
  )
  await page.getByRole('button', { name: 'Crear ticket de servicio' }).click()
  const response = await responsePromise
  const payload = (await response.json()) as {
    success: true
    data: { ticketCode: string; handoffToken: string }
  }
  expect(response.ok(), JSON.stringify(payload)).toBe(true)
  expect(payload.data.handoffToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
  await expect(page.getByRole('heading', { name: 'Solicitud registrada' })).toBeVisible()
  await expect(page.locator('strong').filter({ hasText: /TCK-\d{6}/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar por WhatsApp' })).toBeVisible()
  const insecure = await page.request.post('/api/tickets/whatsapp-opened', {
    data: { ticketCode: payload.data.ticketCode }
  })
  expect(insecure.status()).toBe(422)
  await page.evaluate(() => {
    window.open = () => null
  })
  const handoffPromise = page.waitForResponse(
    (opened) => opened.url().endsWith('/api/tickets/whatsapp-opened') && opened.request().method() === 'POST'
  )
  await page.getByRole('button', { name: 'Continuar por WhatsApp' }).click()
  expect((await handoffPromise).status()).toBe(204)
  await expect
    .poll(async () => {
      const stored = await prisma.ticket.findUniqueOrThrow({
        where: { ticketCode: payload.data.ticketCode }
      })
      return { opened: Boolean(stored.whatsappOpenedAt), status: stored.status }
    })
    .toEqual({ opened: true, status: 'NEW' })
  expect(await prisma.ticket.count({ where: { serviceId: ids.service, status: 'NEW', source: 'WEB' } })).toBe(
    1
  )
})

test('admin crea y publica un servicio con campo dinámico', async ({ page }) => {
  await login(page)
  await page.goto('/admin/servicios/nuevo')
  await expect(page.locator('[data-admin-app]')).toHaveAttribute('data-hydrated', 'true', { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'Nuevo servicio' })).toBeVisible()
  await page.getByLabel('Nombre').fill(`Servicio admin E2E ${suffix}`)
  await page.getByTestId('service-category').selectOption(ids.category)
  await page.getByRole('button', { name: 'Agregar campo' }).click()
  await page.getByTestId('service-field-key-0').fill('detalle_solicitud')
  await page.getByTestId('service-field-label-0').fill('Detalle de solicitud')
  await page.getByLabel('Publicado').check()
  await page.getByRole('button', { name: 'Guardar servicio' }).click()
  await expect(page).toHaveURL(/\/admin\/servicios\/[0-9a-f-]+$/)
  const created = await prisma.service.findFirstOrThrow({ where: { name: `Servicio admin E2E ${suffix}` } })
  ids.adminService = created.id
  await page.goto(`/servicios/${created.slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Servicio admin E2E')
  await expect(page.getByLabel('Detalle de solicitud')).toBeVisible()
})

test('admin abre, cambia estado, asigna y agrega nota al ticket', async ({ page }) => {
  await login(page)
  const ticket = await prisma.ticket.findFirstOrThrow({ where: { serviceId: ids.service } })
  await page.goto('/admin/tickets')
  await expect(page.locator('[data-admin-app]')).toHaveAttribute('data-hydrated', 'true', { timeout: 15_000 })
  await page.getByRole('link', { name: 'Abrir' }).first().click()
  await expect(page.getByRole('heading', { name: ticket.ticketCode })).toBeVisible()
  await page.getByLabel('Nota del cambio').fill('Revisión inicial E2E')
  await page.getByTestId('ticket-status').selectOption('IN_REVIEW')
  await expect
    .poll(async () => (await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).status)
    .toBe('IN_REVIEW')
  const invalidAssignment = await page.request.put(`/api/admin/tickets/${ticket.id}/assignment`, {
    data: { assignedUserId: ids.invalid }
  })
  expect(invalidAssignment.status()).toBe(422)
  await expect(page.getByTestId('ticket-assignee').locator(`option[value="${ids.invalid}"]`)).toHaveCount(0)
  await expect(page.getByTestId('ticket-assignee').locator(`option[value="${ids.support}"]`)).toHaveCount(1)
  await page.getByTestId('ticket-assignee').selectOption(ids.support)
  await expect
    .poll(async () => (await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).assignedUserId)
    .toBe(ids.support)
  const responsible = await prisma.user.findUniqueOrThrow({
    where: { id: ids.support }
  })
  await page.getByPlaceholder('Agregar nota interna').fill('Nota interna E2E')
  await page.getByRole('button', { name: 'Agregar nota' }).click()
  await expect
    .poll(() =>
      prisma.ticketMessage.count({
        where: { ticketId: ticket.id, message: 'Nota interna E2E', internal: true }
      })
    )
    .toBe(1)
  const stored = await prisma.ticket.findUniqueOrThrow({
    where: { id: ticket.id },
    include: { history: true }
  })
  expect(stored.assignedUserId).toBe(responsible.id)
  expect(stored.history.some((item) => item.action === 'STATUS_CHANGED')).toBe(true)
  expect(stored.history.some((item) => item.action === 'ASSIGNED')).toBe(true)
})
