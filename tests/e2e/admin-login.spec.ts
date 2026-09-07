import { expect, test } from '@playwright/test'
import 'dotenv/config'

test('muestra el acceso administrativo', async ({ page }) => {
  await page.goto('/admin/login')
  await expect(page.getByRole('heading', { name: 'Acceso administrativo' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Contraseña')).toBeVisible()
})

test('health comprueba la conexión real con PostgreSQL', async ({ request }) => {
  const response = await request.get('/api/health')
  expect(response.ok()).toBeTruthy()
  await expect(response.json()).resolves.toEqual({ status: 'ok', database: 'connected' })
})

test('inicia y cierra una sesión administrativa completa', async ({ page }) => {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  test.skip(!email || !password, 'Configura SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD para esta prueba')

  const loginResponse = await page.request.post('/api/auth/login', {
    data: { email, password }
  })
  expect(loginResponse.ok()).toBeTruthy()

  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salir' })).toBeVisible()

  const logoutResponse = await page.request.post('/api/auth/logout')
  expect(logoutResponse.ok()).toBeTruthy()
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login(?:\?.*)?$/)
})
