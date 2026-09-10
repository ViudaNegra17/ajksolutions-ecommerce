import { expect, test } from '@playwright/test'
import argon2 from 'argon2'
import 'dotenv/config'
import { PERMISSIONS } from '../../shared/constants/permissions'
import { prisma } from '../../server/utils/prisma'

const email = process.env.SEED_ADMIN_EMAIL
const password = process.env.SEED_ADMIN_PASSWORD

async function login(
  request: import('@playwright/test').APIRequestContext,
  credentials = { email, password }
) {
  test.skip(!credentials.email || !credentials.password, 'Configura credenciales administrativas de prueba')
  const response = await request.post('/api/auth/login', { data: credentials })
  expect(response.ok(), await response.text()).toBe(true)
}

async function ready(page: import('@playwright/test').Page, path = '/admin') {
  await page.goto(path)
  await expect(page.locator('[data-admin-app]')).toHaveAttribute('data-hydrated', 'true', { timeout: 30_000 })
}

for (const scenario of [
  { mode: 'idle-expired', name: 'expira tras 30 minutos de inactividad' },
  { mode: 'absolute-expired', name: 'respeta el máximo absoluto aunque exista actividad reciente' }
] as const) {
  test(scenario.name, async ({ page }) => {
    await login(page.request)
    await ready(page)
    const configured = await page.request.post('/api/_test/admin-session', { data: { mode: scenario.mode } })
    expect(configured.ok(), await configured.text()).toBe(true)
    await page.reload()
    await expect(page).toHaveURL(/\/admin\/login\?reason=session-expired/)
    await expect(page.getByText('Tu sesión administrativa expiró por inactividad.')).toBeVisible()
    expect((await page.request.get('/api/admin/dashboard')).status()).toBe(401)
  })
}

test('avisa dos minutos antes y permite seguir conectado', async ({ page }) => {
  await login(page.request)
  await ready(page)
  const browserNow = Date.now()
  const revalidationAt = browserNow + 5 * 60 * 1000
  await page.route('**/api/auth/session*', async (route) => {
    const request = route.request()
    const touched = request.method() === 'POST'
    const lastActivity = touched ? revalidationAt : revalidationAt - 28 * 60 * 1000 - 30 * 1000
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: 'test',
            firstName: 'Admin',
            lastName: 'AJK',
            email: 'admin@example.com',
            roles: ['SUPER_ADMIN'],
            permissions: []
          },
          loggedInAt: new Date(revalidationAt - 60 * 60 * 1000).toISOString(),
          lastActivityAt: new Date(lastActivity).toISOString(),
          lastValidatedAt: new Date(revalidationAt).toISOString(),
          expiresAt: new Date(revalidationAt + 7 * 60 * 60 * 1000).toISOString(),
          idleExpiresAt: new Date(lastActivity + 30 * 60 * 1000).toISOString()
        }
      })
    })
  })
  await page.clock.install({ time: browserNow })
  await page.clock.fastForward(5 * 60 * 1000)
  await expect(page.getByRole('dialog', { name: 'Sesión por expirar' })).toBeVisible()
  await page.getByRole('button', { name: 'Seguir conectado' }).click()
  await expect(page.getByRole('dialog', { name: 'Sesión por expirar' })).toBeHidden()
  await expect(page.locator('[data-admin-app]')).toBeVisible()
})

test('un usuario desactivado pierde la sesión en la siguiente revalidación', async ({ page }) => {
  test.skip(!email, 'Configura SEED_ADMIN_EMAIL')
  await login(page.request)
  await ready(page)
  try {
    await prisma.user.update({ where: { email: email! }, data: { active: false } })
    await page.reload()
    await expect(page).toHaveURL(/\/admin\/login/)
    expect((await page.request.get('/api/admin/dashboard')).status()).toBe(401)
  } finally {
    await prisma.user.update({ where: { email: email! }, data: { active: true } })
  }
})

test('refresca permisos y el endpoint aplica la asignación actual', async ({ page }) => {
  const suffix = Date.now().toString(36)
  const roleCode = `SESSION_TEST_${suffix}`
  const testEmail = `session-${suffix}@example.com`
  const testPassword = 'Session-test-password-2026'
  const [dashboardPermission, productsPermission] = await Promise.all([
    prisma.permission.findUniqueOrThrow({ where: { code: PERMISSIONS.DASHBOARD_VIEW } }),
    prisma.permission.findUniqueOrThrow({ where: { code: PERMISSIONS.PRODUCTS_VIEW } })
  ])
  const role = await prisma.role.create({
    data: {
      code: roleCode,
      name: 'Session E2E',
      permissions: {
        create: [{ permissionId: dashboardPermission.id }, { permissionId: productsPermission.id }]
      }
    }
  })
  const user = await prisma.user.create({
    data: {
      firstName: 'Session',
      lastName: 'Test',
      email: testEmail,
      passwordHash: await argon2.hash(testPassword, { type: argon2.argon2id }),
      roles: { create: { roleId: role.id } }
    }
  })
  try {
    await login(page.request, { email: testEmail, password: testPassword })
    await ready(page)
    await expect(page.getByRole('link', { name: 'Productos', exact: true })).toBeVisible()
    await prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId: role.id, permissionId: productsPermission.id } }
    })
    const session = await page.request.get('/api/auth/session')
    expect(session.ok(), await session.text()).toBe(true)
    expect((await session.json()).data.user.permissions).not.toContain(PERMISSIONS.PRODUCTS_VIEW)
    await page.reload()
    await expect(page.getByRole('link', { name: 'Productos', exact: true })).toHaveCount(0)
    expect((await page.request.get('/api/admin/products')).status()).toBe(403)
  } finally {
    await prisma.auditLog.deleteMany({ where: { userId: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
    await prisma.role.delete({ where: { id: role.id } })
  }
})

test('logout y botón atrás no restauran un administrador operativo', async ({ page }) => {
  await login(page.request)
  await ready(page)
  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page).toHaveURL(/\/admin\/login/)
  await page.goBack()
  await expect(page).toHaveURL(/\/admin\/login/)
  expect((await page.request.get('/api/admin/dashboard')).status()).toBe(401)
})

test('auth, touch y admin responden no-store sin caché público', async ({ request }) => {
  await login(request)
  for (const target of ['/api/auth/session', '/api/auth/session/touch', '/api/admin/dashboard']) {
    const response = target.endsWith('/touch') ? await request.post(target) : await request.get(target)
    expect(response.headers()['cache-control']).toContain('no-store')
    expect(response.headers()['x-public-cache']).toBeUndefined()
  }
})
