import { expect, test } from '@playwright/test'
import 'dotenv/config'
import { visualFixtures } from './fixtures/ui-phase7-5'

test('Home comercial usa solo su read model y enlaces canónicos', async ({ page, request }) => {
  const response = await request.get('/api/home')
  expect(response.ok()).toBe(true)
  const home = (await response.json()).data
  expect(Object.keys(home).sort()).toEqual(['banners', 'services', 'settings'])
  expect(home.services.length).toBeLessThanOrEqual(3)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  for (const title of [
    'Soluciones AJKSolutionS',
    '¿Tu equipo necesita atención?',
    'Respaldo AJKSolutionS',
    'Cómo comprar o solicitar',
    '¿Necesitas ayuda para elegir?'
  ]) {
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  }
  await expect(
    page.getByRole('heading', { name: /Productos destacados|Nuevos productos|Categorías/, exact: true })
  ).toHaveCount(0)
  await expect(
    page.getByRole('link', { name: 'Ver licencias digitales', exact: true }).first()
  ).toHaveAttribute('href', '/productos?productType=DIGITAL')
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `Home ${width}`
    ).toBe(true)
  }
})

test('detalles legibles conservan garantía, peso, CTA y formulario sin overflow', async ({ page }) => {
  await visualFixtures(page)
  await page.goto('/')
  await expect(page.locator('[data-public-app]')).toHaveAttribute('data-hydrated', 'true')
  for (const [path, text] of [
    ['/productos/teclado-visual', 'Un teclado cómodo y ligero para estudiar, trabajar y crear.'],
    ['/servicios/mantenimiento-visual', 'Revisión y mantenimiento para que puedas seguir trabajando.']
  ]) {
    if (path!.startsWith('/productos')) {
      await page
        .getByRole('navigation', { name: 'Navegación principal' })
        .getByRole('link', { name: 'Productos', exact: true })
        .click()
      await page.getByRole('link', { name: 'Teclado inalámbrico compacto', exact: true }).first().click()
    } else {
      await page
        .getByRole('navigation', { name: 'Navegación principal' })
        .getByRole('link', { name: 'Servicios', exact: true })
        .click()
      await page.getByRole('link', { name: 'Ver servicio', exact: true }).first().click()
    }
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByRole('heading', { name: 'Descripción', exact: true })).toBeVisible()
    await expect(page.getByText(text!, { exact: true })).toBeVisible()
    await expect(page.locator('.prose-invert')).toHaveCount(0)
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `${path} ${width}`
      ).toBe(true)
    }
    if (path!.startsWith('/productos')) {
      await expect(page.getByTestId('add-to-cart')).toBeEnabled()
      await expect(page.getByText('0.35 kg')).toBeVisible()
      await expect(page.getByText('12 meses de garantía.')).toBeVisible()
    } else {
      await expect(page.locator('form:not([role="search"])')).toBeVisible()
    }
  }
})

test('formulario comercial oculta identificadores, cambia garantía y limpia peso digital', async ({
  page
}) => {
  const response = await page.request.post('/api/auth/login', {
    data: { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD }
  })
  expect(response.ok()).toBe(true)
  await page.goto('/admin/catalogo/productos/nuevo')
  await expect(page.locator('[data-admin-app]')).toHaveAttribute('data-hydrated', 'true')
  await expect(page.getByLabel('SKU', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Slug', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Código / código de barras', { exact: true })).toBeVisible()
  await page.getByLabel('Peso (kg)', { exact: true }).fill('1.125')
  await page
    .locator('select')
    .filter({ has: page.locator('option[value="DIGITAL"]') })
    .selectOption('DIGITAL')
  await expect(page.getByLabel('Peso (kg)', { exact: true })).toHaveCount(0)
  await page.getByLabel('Garantía', { exact: true }).click()
  await page.getByRole('option', { name: 'Personalizada', exact: true }).click()
  await page.getByLabel('Garantía personalizada', { exact: true }).fill('Texto temporal')
  await page.getByLabel('Garantía', { exact: true }).click()
  await page.getByRole('option', { name: '12 meses', exact: true }).click()
  await expect(page.getByLabel('Garantía personalizada', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'SEO', exact: true }).click()
  await expect(page.getByLabel('Slug público', { exact: true })).toHaveCount(0)
  await page.goto('/admin/catalogo/atributos')
  await expect(page.locator('[data-admin-app]')).toHaveAttribute('data-hydrated', 'true')
  await page.getByRole('button', { name: 'Nuevo atributo', exact: true }).click()
  await expect(page.getByLabel('Slug', { exact: true })).toHaveCount(0)
  await page.getByLabel('Nombre', { exact: true }).fill('Conexión de prueba')
  await page
    .locator('select')
    .filter({ has: page.locator('option[value="SELECT"]') })
    .selectOption('SELECT')
  await page.getByLabel('Opciones (valor|etiqueta por línea)', { exact: true }).fill('usb|USB')
  await page.route('**/api/admin/attributes', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    await route.fulfill({ status: 201, json: { success: true, data: { id: 'fixture-attribute' } } })
  })
  const saved = page.waitForRequest(
    (request) => request.url().endsWith('/api/admin/attributes') && request.method() === 'POST'
  )
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  const payload = (await saved).postDataJSON()
  expect(payload.type).toBe('SELECT')
  expect(payload.options).toEqual([{ value: 'usb', label: 'USB', sortOrder: 0, active: true }])
  expect(payload).not.toHaveProperty('slug')
  await expect(page.getByText('Atributo creado', { exact: true })).toBeVisible()
})

test('hero y campaña reutilizan imagen, contenido y CTA administrables', async ({ page, request }) => {
  const home = (await (await request.get('/api/home')).json()).data
  const hero = {
    title: 'Solución comercial de prueba',
    subtitle: 'Tu próximo proyecto',
    description: 'Contenido administrado sin precios inventados.',
    imageUrl: '/ajksolutions-official.png',
    mobileImageUrl: '/ajksolutions-official.png',
    ctaLabel: 'Ver laptops',
    ctaUrl: '/productos',
    placement: 'HOME_HERO'
  }
  await page.route('**/api/home', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          ...home,
          banners: [hero, { ...hero, title: 'Campaña de prueba', placement: 'HOME_SECONDARY' }]
        }
      }
    })
  )
  await page.goto('/productos')
  await expect(page.locator('[data-public-app]')).toHaveAttribute('data-hydrated', 'true')
  await page.getByRole('link', { name: 'AJKSolutionS, inicio', exact: true }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: hero.title })).toBeVisible()
  await expect(page.getByRole('img', { name: hero.title, exact: true })).toBeVisible()
  await expect(page.locator('picture source')).toHaveAttribute('srcset', hero.mobileImageUrl)
  await expect(page.getByRole('heading', { name: 'Campaña de prueba', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver laptops', exact: true }).first()).toHaveAttribute(
    'href',
    '/productos'
  )
  await page.setViewportSize({ width: 320, height: 900 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
})
