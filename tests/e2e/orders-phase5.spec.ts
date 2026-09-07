import { expect, test } from '@playwright/test'
import 'dotenv/config'
import { prisma } from '../../server/utils/prisma'

test.describe.configure({ mode: 'serial', timeout: 60_000 })
const suffix = Date.now().toString()
const slug = `producto-order-e2e-${suffix}`
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
    data: { name: `Categoría Order E2E ${suffix}`, slug: `categoria-order-e2e-${suffix}`, active: true }
  })
  const product = await prisma.product.create({
    data: {
      productCode: `E5${suffix}`,
      sku: `E2E-ORDER-${suffix}`,
      name: `Producto Order E2E ${suffix}`,
      slug,
      categoryId: category.id,
      productType: 'PHYSICAL',
      priceMode: 'FIXED',
      price: '25.00',
      taxRate: '0',
      active: true,
      shortDescription: 'Producto para validar checkout de extremo a extremo.'
    }
  })
  const location = await prisma.inventoryLocation.findUniqueOrThrow({ where: { locationCode: 'LOC-000001' } })
  const stock = await prisma.inventoryStock.create({
    data: { locationId: location.id, productId: product.id, quantityOnHand: 10 }
  })
  Object.assign(ids, { category: category.id, product: product.id, stock: stock.id })
})

test.afterAll(async () => {
  const orders = await prisma.order.findMany({
    where: { items: { some: { productId: ids.product } } },
    select: { id: true, customerId: true }
  })
  await prisma.auditLog.deleteMany({ where: { entityId: { in: orders.map((order) => order.id) } } })
  await prisma.inventoryMovement.deleteMany({
    where: { referenceType: 'ORDER', referenceId: { in: orders.map((order) => order.id) } }
  })
  await prisma.order.deleteMany({ where: { id: { in: orders.map((order) => order.id) } } })
  await prisma.address.deleteMany({ where: { customerId: { in: orders.map((order) => order.customerId) } } })
  await prisma.customer.deleteMany({ where: { id: { in: orders.map((order) => order.customerId) } } })
  await prisma.inventoryStock.deleteMany({ where: { id: ids.stock } })
  await prisma.product.deleteMany({ where: { id: ids.product } })
  await prisma.category.deleteMany({ where: { id: ids.category } })
  await prisma.$disconnect()
})

test('producto → carrito → checkout → ORD → WhatsApp y carrito limpio', async ({ page }) => {
  await page.goto(`/productos/${slug}`)
  await expect(page.locator('[data-public-app]')).toHaveAttribute('data-hydrated', 'true', {
    timeout: 30_000
  })
  await page.getByTestId('add-to-cart').click()
  await expect(page.getByTestId('cart-count')).toHaveText('1')
  await page.getByLabel('Carrito').click()
  await expect(page.getByRole('heading', { name: 'Tu carrito' })).toBeVisible()
  await page.getByRole('link', { name: 'Finalizar pedido' }).click()
  await expect(page.getByRole('heading', { name: 'Finalizar pedido' })).toBeVisible()
  await page.getByLabel('Nombres').fill('Cliente')
  await page.getByLabel('Apellidos').fill('Order E2E')
  await page.getByLabel('WhatsApp').fill('0991234567')
  await page.waitForTimeout(1300)
  const responsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/api/orders') && response.request().method() === 'POST'
  )
  await page.getByTestId('confirm-order').click()
  const response = await responsePromise
  const body = await response.json()
  expect(response.status(), JSON.stringify(body)).toBe(201)
  expect(body.data.orderNumber).toMatch(/^ORD-\d{6}$/)
  expect(body.data.handoffToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
  await expect(page.getByRole('heading', { name: 'Pedido registrado' })).toBeVisible()
  await expect(page.getByText(body.data.orderNumber)).toBeVisible()
  await page.evaluate(() => {
    window.open = () => null
  })
  const handoff = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/orders/whatsapp-opened') && response.request().method() === 'POST'
  )
  await page.getByRole('button', { name: 'Continuar por WhatsApp' }).click()
  expect((await handoff).status()).toBe(204)
  const order = await prisma.order.findUniqueOrThrow({ where: { orderNumber: body.data.orderNumber } })
  ids.order = order.id
  expect(order.status).toBe('NEW')
  expect(order.whatsappOpenedAt).toBeTruthy()
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('ajksolutions-cart') || '{}').items)
  ).toEqual([])
})

test('checkout DELIVERY crea Order con Address perteneciente al Customer', async ({ page }) => {
  const items = [{ productId: ids.product, variantId: null, quantity: 1 }]
  const previewResponse = await page.request.post('/api/checkout/preview', {
    data: { items, deliveryType: 'DELIVERY' }
  })
  expect(previewResponse.ok(), await previewResponse.text()).toBe(true)
  const preview = await previewResponse.json()
  const orderResponse = await page.request.post('/api/orders', {
    data: {
      requestId: crypto.randomUUID(),
      items,
      checkoutFingerprint: preview.data.checkoutFingerprint,
      customer: {
        firstName: 'Cliente',
        lastName: 'Delivery E2E',
        whatsapp: '0981234567'
      },
      deliveryType: 'DELIVERY',
      address: {
        label: 'Casa',
        recipientName: 'Cliente Delivery E2E',
        country: 'EC',
        province: 'Pichincha',
        city: 'Quito',
        addressLine1: 'Av. Integridad 123',
        reference: 'Puerta azul'
      },
      notes: null,
      website: '',
      startedAt: Date.now() - 2000
    }
  })
  expect(orderResponse.status(), await orderResponse.text()).toBe(201)
  const body = await orderResponse.json()
  const order = await prisma.order.findUniqueOrThrow({
    where: { orderNumber: body.data.orderNumber },
    include: { address: true, deliveryAddress: true }
  })
  expect(order.address?.customerId).toBe(order.customerId)
  expect(order.deliveryAddress?.addressLine1).toBe('Av. Integridad 123')
  expect(order.shippingPendingQuote).toBe(true)
})

test('preview usa precio actual y rechaza payload monetario manipulado', async ({ page }) => {
  await page.goto(`/productos/${slug}`)
  await expect(page.locator('[data-public-app]')).toHaveAttribute('data-hydrated', 'true', {
    timeout: 30_000
  })
  await page.getByTestId('add-to-cart').click()
  await prisma.product.update({ where: { id: ids.product }, data: { price: '30.00' } })
  await page.getByLabel('Carrito').click()
  await page.getByRole('link', { name: 'Finalizar pedido' }).click()
  await expect(page.getByText(/\$30[,.]00/).first()).toBeVisible({ timeout: 30_000 })
  const manipulated = await page.request.post('/api/checkout/preview', {
    data: {
      items: [{ productId: ids.product, variantId: null, quantity: 1, unitPrice: '0.01' }],
      deliveryType: 'PICKUP'
    }
  })
  expect(manipulated.status()).toBe(422)
  await prisma.product.update({ where: { id: ids.product }, data: { price: '25.00' } })
})

test('sin stock conserva el carrito y muestra error comprensible', async ({ page }) => {
  await page.goto(`/productos/${slug}`)
  await expect(page.locator('[data-public-app]')).toHaveAttribute('data-hydrated', 'true', {
    timeout: 30_000
  })
  await page.getByTestId('add-to-cart').click()
  const stock = await prisma.inventoryStock.findUniqueOrThrow({ where: { id: ids.stock } })
  await prisma.inventoryStock.update({
    where: { id: ids.stock },
    data: { quantityOnHand: stock.quantityReserved }
  })
  await page.getByLabel('Carrito').click()
  await page.getByRole('link', { name: 'Finalizar pedido' }).click()
  await expect(page.getByText(/No existe disponibilidad suficiente/)).toBeVisible({ timeout: 15_000 })
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('ajksolutions-cart') || '{}').items.length)
  ).toBe(1)
  await prisma.inventoryStock.update({ where: { id: ids.stock }, data: { quantityOnHand: 10 } })
})

test('admin abre pedido, avanza estado y cancela liberando reserva', async ({ page }) => {
  await login(page)
  const before = await prisma.inventoryStock.findUniqueOrThrow({ where: { id: ids.stock } })
  await page.goto(`/admin/pedidos/${ids.order}`)
  await expect(page.locator('[data-admin-app]')).toHaveAttribute('data-hydrated', 'true', { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: /ORD-/ })).toBeVisible()
  await page.getByTestId('order-status').selectOption('CONTACTED')
  const contactedResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/admin/orders/${ids.order}/status`) &&
      response.request().method() === 'PUT'
  )
  await page.getByRole('button', { name: 'Guardar estado' }).click()
  expect((await contactedResponse).ok()).toBe(true)
  await expect
    .poll(async () => (await prisma.order.findUniqueOrThrow({ where: { id: ids.order } })).status)
    .toBe('CONTACTED')
  await expect(page.getByTestId('order-status')).toHaveValue('CONTACTED')
  await expect(page.getByTestId('order-status').locator('option[value="CANCELLED"]')).toHaveCount(1)
  const cancelledResponse = await page.request.put(`/api/admin/orders/${ids.order}/status`, {
    data: { status: 'CANCELLED', notes: 'Cancelación E2E' }
  })
  expect(cancelledResponse.ok(), await cancelledResponse.text()).toBe(true)
  await expect
    .poll(async () => (await prisma.order.findUniqueOrThrow({ where: { id: ids.order } })).status)
    .toBe('CANCELLED')
  const after = await prisma.inventoryStock.findUniqueOrThrow({ where: { id: ids.stock } })
  expect(after.quantityReserved).toBe(before.quantityReserved - 1)
  expect(await prisma.inventoryMovement.count({ where: { referenceId: ids.order, type: 'RELEASE' } })).toBe(1)
})
