import { expect, test, request as playwrightRequest, type APIRequestContext } from '@playwright/test'
import argon2 from 'argon2'
import 'dotenv/config'
import { prisma } from '../../server/utils/prisma'
import { ROLE_CODES } from '../../shared/constants/permissions'

test.describe.configure({ mode: 'serial' })
const prefix = 'qa-security-e2e-' + Date.now()
const password = 'Clave-Inicial-Segura-2026'
const roleNames: Record<string, string> = {}
const accounts: Record<string, string> = {}
let createdEmail = ''
async function login(
  request: APIRequestContext,
  email = process.env.SEED_ADMIN_EMAIL,
  secret = process.env.SEED_ADMIN_PASSWORD
) {
  const response = await request.post('/api/auth/login', { data: { email, password: secret } })
  expect(response.ok()).toBe(true)
}
async function ready(page: import('@playwright/test').Page) {
  await page.goto('/admin/seguridad')
  await expect(page.locator('[data-admin-app]')).toHaveAttribute('data-hydrated', 'true', { timeout: 30_000 })
}
test.beforeAll(async () => {
  const roles = await prisma.role.findMany({ where: { code: { in: [...ROLE_CODES] } } })
  const hash = await argon2.hash(password, { type: argon2.argon2id })
  for (const role of roles) {
    roleNames[role.code] = role.name
    if (role.code === 'SUPER_ADMIN') continue
    const email = prefix + '-' + role.code.toLowerCase() + '@example.test'
    await prisma.user.create({
      data: {
        firstName: 'QA',
        lastName: role.code,
        email,
        passwordHash: hash,
        roles: { create: { roleId: role.id } }
      }
    })
    accounts[role.code] = email
  }
})
test.afterAll(async () => {
  const users = await prisma.user.findMany({ where: { email: { startsWith: prefix } }, select: { id: true } })
  await prisma.auditLog.deleteMany({
    where: { entity: 'User', entityId: { in: users.map((user) => user.id) } }
  })
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } })
  await prisma.$disconnect()
})
test('las APIs de Seguridad requieren sesión', async ({ request }) => {
  for (const path of ['/api/admin/security/users', '/api/admin/security/roles']) {
    expect((await request.get(path)).status()).toBe(401)
  }
  expect((await request.post('/api/admin/security/users', { data: {} })).status()).toBe(401)
})
test('administra usuarios por UI, consulta roles y se adapta a móvil', async ({ page }) => {
  await login(page.request)
  await ready(page)
  await expect(page.getByText('Módulo preparado')).toHaveCount(0)
  await expect(page.getByLabel('Buscar usuarios', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Nuevo usuario', exact: true }).click()
  const dialog = page.getByRole('dialog')
  createdEmail = prefix + '-created@example.test'
  await dialog.getByLabel('Nombre', { exact: true }).fill('QA')
  await dialog.getByLabel('Apellido', { exact: true }).fill('Creado por interfaz')
  await dialog.getByLabel('Correo electrónico', { exact: true }).fill(createdEmail)
  await dialog.getByLabel('Contraseña inicial', { exact: true }).fill(password)
  await dialog.getByRole('checkbox', { name: roleNames.SALES, exact: true }).check()
  await dialog.getByRole('button', { name: 'Guardar usuario', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText(createdEmail, { exact: true })).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: createdEmail })
  await row.getByRole('button', { name: /Editar a/ }).click()
  await dialog.getByLabel('Apellido', { exact: true }).fill('Actualizado por interfaz')
  await dialog.getByRole('button', { name: 'Guardar usuario', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(row).toContainText('Actualizado por interfaz')
  await page.getByLabel('Buscar usuarios', { exact: true }).fill(createdEmail)
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(page.getByRole('row').filter({ hasText: createdEmail })).toHaveCount(1)
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 }
  ]) {
    await page.setViewportSize(viewport)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  }
  await page.getByRole('tab', { name: 'Roles y permisos', exact: true }).click()
  for (const role of ROLE_CODES)
    await expect(page.getByRole('heading', { name: roleNames[role], exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Usuarios', exact: true }).click()
  await page.getByRole('button', { name: 'Nuevo usuario', exact: true }).click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})
test('ADMIN, SALES y SUPPORT reciben 403 por API y por URL directa', async ({ request }) => {
  await login(request)
  const users = (await (await request.get('/api/admin/security/users')).json()).data
  expect(JSON.stringify(users)).not.toContain('passwordHash')
  const target = users.items.find((user: { email: string }) => user.email === createdEmail)
  for (const role of ['ADMIN', 'SALES', 'SUPPORT']) {
    const restricted = await playwrightRequest.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'
    })
    try {
      await login(restricted, accounts[role], password)
      expect((await restricted.get('/api/admin/security/users')).status()).toBe(403)
      expect((await restricted.get('/api/admin/security/roles')).status()).toBe(403)
      expect((await restricted.post('/api/admin/security/users', { data: {} })).status()).toBe(403)
      expect((await restricted.put('/api/admin/security/users/' + target.id, { data: {} })).status()).toBe(
        403
      )
      expect((await restricted.get('/admin/seguridad')).status()).toBe(403)
    } finally {
      await restricted.dispose()
    }
  }
})
test('los cambios de roles y estado se aplican a una sesión previamente creada', async ({ request }) => {
  await login(request)
  const response = await request.get(
    '/api/admin/security/users?search=' + encodeURIComponent(accounts.SALES!)
  )
  const target = (await response.json()).data.items[0]
  const session = await playwrightRequest.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'
  })
  const update = {
    firstName: target.firstName,
    lastName: target.lastName,
    email: target.email,
    roles: ['SUPPORT'],
    active: true
  }
  try {
    await login(session, target.email, password)
    expect((await request.put('/api/admin/security/users/' + target.id, { data: update })).status()).toBe(200)
    const refreshed = await session.get('/api/auth/session')
    expect((await refreshed.json()).data.user.roles).toEqual(['SUPPORT'])
    expect(
      (
        await request.put('/api/admin/security/users/' + target.id, { data: { ...update, active: false } })
      ).status()
    ).toBe(200)
    expect((await session.get('/api/auth/session')).status()).toBe(401)
    expect((await request.put('/api/admin/security/users/' + target.id, { data: update })).status()).toBe(200)
    await login(session, target.email, password)
  } finally {
    await session.dispose()
  }
})
test('impide el bloqueo propio y valida entradas inválidas', async ({ request }) => {
  await login(request)
  const self = (await (await request.get('/api/auth/session')).json()).data.user
  const update = {
    firstName: self.firstName,
    lastName: self.lastName,
    email: self.email,
    roles: self.roles,
    active: true
  }
  for (const changed of [
    { ...update, active: false },
    { ...update, roles: ['SALES'] }
  ]) {
    const response = await request.put('/api/admin/security/users/' + self.id, { data: changed })
    expect(response.status()).toBe(409)
  }
  expect((await request.put('/api/admin/security/users/invalid', { data: update })).status()).toBe(422)
  expect(
    (await request.post('/api/admin/security/users', { data: { ...update, password: 'corta' } })).status()
  ).toBe(422)
  expect(
    (
      await request.put('/api/admin/security/users/' + self.id, {
        data: { ...update, permissions: ['security.manage'] }
      })
    ).status()
  ).toBe(422)
})
