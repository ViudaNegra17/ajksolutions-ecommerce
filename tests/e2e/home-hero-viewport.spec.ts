import { expect, test } from '@playwright/test'

test.describe('Hero: contenedor Nuxt UI, altura disponible y favicon', () => {
  test('encaja en ventanas desktop bajas sin perder imagen ni CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-public-app]')).toHaveAttribute('data-hydrated', 'true', {
      timeout: 30_000
    })
    for (const viewport of [
      { width: 1347, height: 636 },
      { width: 1347, height: 502 },
      { width: 1366, height: 600 },
      { width: 1280, height: 600 },
      { width: 1024, height: 600 }
    ]) {
      await page.setViewportSize(viewport)
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      )
      const geometry = await page.evaluate(() => {
        const hero = document.querySelector('section[aria-labelledby="home-hero"]')!
        const container = hero.firstElementChild!.getBoundingClientRect()
        const header = document.querySelector('header')!.firstElementChild!.getBoundingClientRect()
        const image = hero.querySelector('img')!.getBoundingClientRect()
        return {
          leftDelta: Math.abs(container.x - header.x),
          widthDelta: Math.abs(container.width - header.width),
          imageBottom: image.bottom,
          ctaBottom: Math.max(
            ...[...hero.querySelectorAll('a')].map((link) => link.getBoundingClientRect().bottom)
          ),
          overflow: document.documentElement.scrollWidth > innerWidth + 1
        }
      })
      expect(geometry.leftDelta).toBeLessThanOrEqual(1)
      expect(geometry.widthDelta).toBeLessThanOrEqual(1)
      expect(geometry.imageBottom).toBeLessThanOrEqual(viewport.height - 8)
      expect(geometry.ctaBottom).toBeLessThanOrEqual(viewport.height - 8)
      expect(geometry.overflow).toBe(false)
    }
  })

  test('reorganiza square y móvil al redimensionar sin recargar', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-public-app]')).toHaveAttribute('data-hydrated', 'true', {
      timeout: 30_000
    })
    await page.evaluate(() => {
      document.documentElement.dataset.heroResize = 'same-document'
    })
    for (const viewport of [
      { width: 1024, height: 1024 },
      { width: 390, height: 844 }
    ]) {
      await page.setViewportSize(viewport)
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      )
      const hero = page.locator('section[aria-labelledby="home-hero"]')
      const image = await hero.locator('img').boundingBox()
      const lastAction = await hero.locator('a').last().boundingBox()
      expect(image!.y).toBeGreaterThan(lastAction!.y + lastAction!.height)
      await expect(page.locator('html')).toHaveAttribute('data-hero-resize', 'same-document')
    }
  })

  test('sirve el favicon oficial declarado en el head SSR', async ({ page, request }) => {
    await page.goto('/')
    const pngHref = await page.locator('head link[rel="icon"][type="image/png"]').getAttribute('href')
    const icoHref = await page.locator('head link[rel="icon"][type="image/x-icon"]').getAttribute('href')
    const png = await request.get(pngHref!)
    const ico = await request.get(icoHref!)
    expect(png.status()).toBe(200)
    expect(png.headers()['content-type']).toContain('image/png')
    expect((await png.body()).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(ico.status()).toBe(200)
    expect((await ico.body()).readUInt16LE(2)).toBe(1)
  })
})
