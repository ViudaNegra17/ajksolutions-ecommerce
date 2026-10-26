import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import dotenv from 'dotenv'

const label = process.argv[2]
if (
  ![
    'before',
    'after',
    'asset-before',
    'asset-after',
    'replace-before',
    'replace-after',
    'fit-before',
    'fit-after'
  ].includes(label)
)
  throw new Error('Use a supported before/after diagnostic label')
const isAfter = label.endsWith('after')
const isInstitutionalAfter = ['asset-after', 'replace-after', 'fit-after'].includes(label)
const source = dotenv.parse(await readFile('.env'))
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(source.DATABASE_URL).hostname))
  throw new Error('This read-only diagnostic requires a local database')
const env = {
  ...process.env,
  DATABASE_URL: source.DATABASE_URL,
  NODE_ENV: 'production',
  NITRO_HOST: '127.0.0.1',
  NITRO_PORT: '3015',
  NUXT_PUBLIC_APP_URL: 'https://hero.local.invalid',
  DEBUG: '',
  NUXT_DEBUG: 'false'
}
for (const key of ['NUXT_SESSION_PASSWORD', 'NUXT_CHECKOUT_SIGNING_SECRET', 'NUXT_ORDER_HANDOFF_SECRET'])
  env[key] = randomBytes(48).toString('base64url')
const output = 'logs/hero-responsive'
const screenshots = 'docs/hero-responsive'
await mkdir(output, { recursive: true })
await mkdir(screenshots, { recursive: true })
const server = spawn(process.execPath, ['.output/server/index.mjs'], {
  env,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe']
})
const logs = []
server.stderr.on('data', (chunk) => logs.push(chunk.toString()))
const ready = new Promise((resolve, reject) => {
  server.stdout.on('data', (chunk) => {
    logs.push(chunk.toString())
    if (chunk.toString().includes('Listening on')) resolve()
  })
  server.on('error', reject)
  server.on('exit', (code) => reject(new Error('Runtime exited ' + code)))
})
let browser
const timer = setTimeout(() => server.kill(), 60000)
const rows = []
try {
  await ready
  clearTimeout(timer)
  const html = await fetch('http://127.0.0.1:3015/').then((response) => response.text())
  if (!html.includes('id="home-hero"')) throw new Error('Hero missing from SSR HTML')
  if (
    isInstitutionalAfter &&
    (!html.includes('ajksolutions-hero-ecosystem.webp') || !html.includes('srcset='))
  )
    throw new Error('Institutional asset or responsive srcset missing from SSR')
  browser = await chromium.launch()
  const sizes = [
    [320, 568],
    [360, 800],
    [375, 812],
    [390, 844],
    [412, 915],
    [430, 932],
    [768, 1024],
    [820, 1180],
    [1024, 768],
    [1024, 1024],
    [1280, 720],
    [1366, 768],
    [1440, 900],
    [1536, 864],
    [1920, 1080],
    [2560, 1440]
  ]
  if (label.startsWith('fit-')) sizes.push([1347, 636], [1347, 502], [1366, 600], [1280, 600], [1024, 600])
  const captures = new Set([390, 768, 1347, 1366, 1920])
  for (const [width, height] of [...sizes, [1920, 1080], [1920, 1080]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (
        message.type() === 'error' ||
        (/hydration/i.test(message.text()) && /mismatch/i.test(message.text()))
      )
        errors.push(message.text())
    })
    await page.addInitScript(() => {
      window.heroMetrics = { cls: 0, lcp: 0 }
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          if (!entry.hadRecentInput) window.heroMetrics.cls += entry.value
      }).observe({ type: 'layout-shift', buffered: true })
      new PerformanceObserver((list) => {
        const entry = list.getEntries().at(-1)
        window.heroMetrics.lcp = entry?.startTime || 0
        window.heroMetrics.lcpElement = entry?.element?.tagName || null
        window.heroMetrics.lcpImage = entry?.element?.currentSrc || null
      }).observe({ type: 'largest-contentful-paint', buffered: true })
    })
    const response = await page.goto('http://127.0.0.1:3015/')
    await page.locator('[data-public-app][data-hydrated="true"]').waitFor({ timeout: 45000 })
    await page.evaluate(() => document.fonts.ready)
    const hero = page.locator('section[aria-labelledby="home-hero"]')
    await hero
      .locator('img')
      .evaluateAll((images) => Promise.all(images.map((image) => image.decode().catch(() => {}))))
    await page.waitForTimeout(800)
    const row = await page.evaluate(() => {
      const section = document.querySelector('section[aria-labelledby="home-hero"]')
      const box = (element) => {
        const r = element.getBoundingClientRect()
        return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }
      }
      const nav = performance.getEntriesByType('navigation')[0]
      const resources = performance.getEntriesByType('resource')
      const js = resources.filter((entry) => /\.m?js(?:\?|$)/.test(new URL(entry.name).pathname))
      return {
        width: innerWidth,
        height: innerHeight,
        hero: box(section),
        container: box(section.firstElementChild),
        headerContainer: box(document.querySelector('header').firstElementChild),
        heading: box(section.querySelector('h1')),
        ctas: [...section.querySelectorAll('a')].map((link) => ({
          text: link.textContent.trim(),
          href: link.getAttribute('href'),
          ...box(link)
        })),
        images: [...section.querySelectorAll('img')].map((image) => ({
          url: image.currentSrc,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          objectFit: getComputedStyle(image).objectFit,
          sizes: image.sizes,
          ...box(image)
        })),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        heroOverflow: section.scrollWidth > section.clientWidth + 1,
        ttfb: nav.responseStart,
        htmlBytes: nav.encodedBodySize,
        requests: resources.length,
        transferBytes: resources.reduce((sum, entry) => sum + entry.transferSize, 0),
        imageResources: resources
          .filter((entry) => entry.initiatorType === 'img')
          .map((entry) => ({ url: entry.name, bytes: entry.transferSize, duration: entry.duration })),
        jsAssets: js.length,
        jsBytes: js.reduce((sum, entry) => sum + entry.transferSize, 0),
        cssBytes: resources
          .filter((entry) => /\.css$/.test(new URL(entry.name).pathname))
          .reduce((sum, entry) => sum + entry.transferSize, 0),
        jsUrls: js.map((entry) => new URL(entry.name).pathname),
        ...window.heroMetrics
      }
    })
    row.status = response.status()
    row.errors = errors
    if (label === 'fit-after') {
      if (
        Math.abs(row.container.x - row.headerContainer.x) > 1 ||
        Math.abs(row.container.width - row.headerContainer.width) > 1
      )
        throw new Error('Hero is not aligned to the Nuxt UI container')
      if (
        width >= 1024 &&
        width / height >= 1.2 &&
        (row.images[0].bottom > height - 8 || row.ctas.some((cta) => cta.bottom > height - 8))
      )
        throw new Error('Hero image or CTA falls below the initial desktop viewport: ' + JSON.stringify(row))
    }
    if (
      isInstitutionalAfter &&
      (row.images.length !== 1 ||
        !/\/ajksolutions-hero-ecosystem(?:-\d+)?\.webp(?:\?|$)/.test(row.images[0].url) ||
        row.images[0].naturalWidth === 0 ||
        row.images[0].objectFit !== 'contain')
    )
      throw new Error('Institutional image missing, failed or cropped')
    if (isAfter && (row.overflow || row.heroOverflow || errors.length || row.status !== 200))
      throw new Error('Hero validation failed: ' + JSON.stringify(row))
    if (isAfter && width < 640 && row.ctas.some((cta) => cta.height < 48 || cta.width < width - 65))
      throw new Error('Mobile touch targets not full-width')
    if (
      (captures.has(width) || (width === 1024 && height === 1024)) &&
      !rows.some((r) => r.width === width && r.height === height)
    )
      await hero.screenshot({ path: screenshots + '/' + label + '-' + width + 'x' + height + '.png' })
    rows.push(row)
    await context.close()
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const navigationErrors = []
  page.on('pageerror', (error) => navigationErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' || /hydration.*mismatch/i.test(message.text()))
      navigationErrors.push(message.text())
  })
  await page.goto('http://127.0.0.1:3015/')
  await page.locator('[data-public-app][data-hydrated="true"]').waitFor()
  const hero = page.locator('section[aria-labelledby="home-hero"]')
  if (label === 'fit-after') {
    const icon = page.locator('head link[rel="icon"][type="image/png"]')
    const href = await icon.getAttribute('href')
    if (!href?.includes('/favicon.png')) throw new Error('Official favicon missing from head')
    const iconResponse = await page.request.get(new URL(href, page.url()).href)
    if (iconResponse.status() !== 200 || !iconResponse.headers()['content-type']?.includes('image/png'))
      throw new Error('Official favicon is not served as a PNG')
    for (const viewport of [
      { width: 1347, height: 636 },
      { width: 1920, height: 1080 },
      { width: 1024, height: 1024 },
      { width: 390, height: 844 }
    ]) {
      await page.setViewportSize(viewport)
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      )
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
        throw new Error('Overflow after live viewport resize')
    }
  }
  for (const [index, path] of ['/productos', '/servicios'].entries()) {
    await hero.locator('a').nth(index).focus()
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('href'))
    if (focused !== path) throw new Error('Wrong keyboard target')
    await page.keyboard.press('Enter')
    await page.waitForURL('**' + path)
    await page
      .getByRole('heading', {
        level: 1,
        name: index === 0 ? 'Productos' : 'Servicios tecnológicos',
        exact: true
      })
      .waitFor()
    await page.goto('http://127.0.0.1:3015/')
    await page.locator('[data-public-app][data-hydrated="true"]').waitFor()
  }
  await hero.locator('a').first().focus()
  await page.keyboard.press('Tab')
  if (
    !(await hero
      .locator('a')
      .nth(1)
      .evaluate((link) => link === document.activeElement))
  )
    throw new Error('Tab order incorrect')
  await page.keyboard.press('Shift+Tab')
  if (
    !(await hero
      .locator('a')
      .first()
      .evaluate((link) => link === document.activeElement))
  )
    throw new Error('Reverse Tab order incorrect')
  if (navigationErrors.length) throw new Error(navigationErrors.join('\n'))
  await context.close()
  await writeFile(
    output + '/' + label + '.json',
    JSON.stringify({ label, rows, keyboard: 'PASS', ssr: 'PASS' }, null, 2)
  )
  console.log(
    JSON.stringify(
      {
        label,
        viewports: sizes.length,
        samples: rows.length,
        errors: rows.flatMap((r) => r.errors),
        rows: rows.filter((r) => r.width === 1920).map((row) => ({ ...row, jsUrls: undefined }))
      },
      null,
      2
    )
  )
} finally {
  clearTimeout(timer)
  if (browser) await browser.close()
  server.kill()
  await new Promise((resolve) => (server.exitCode !== null ? resolve() : server.once('exit', resolve)))
  await writeFile(output + '/' + label + '-server.log', logs.join(''))
}
