import { chromium } from '@playwright/test'

const baseUrl = process.env.PERF_BASE_URL || 'http://localhost:3000'
const target = new URL(baseUrl)
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
  throw new Error('This diagnostic is restricted to a local development server')
}
const samples = Number(process.env.PERF_SAMPLES || 3)
if (!Number.isInteger(samples) || samples < 1 || samples > 10) {
  throw new Error('PERF_SAMPLES must be an integer between 1 and 10')
}

const browser = await chromium.launch()
try {
  for (let sample = 1; sample <= samples; sample += 1) {
    const context = await browser.newContext()
    const page = await context.newPage()
    const scripts = { total: 0, rekaModules: 0, optimizedReka: 0, devtools: 0 }
    const errors = []
    page.on('request', (request) => {
      if (request.resourceType() !== 'script') return
      scripts.total += 1
      const path = new URL(request.url()).pathname
      if (path.includes('reka-ui')) scripts.rekaModules += 1
      if (path.includes('reka-ui') && path.includes('/deps/')) scripts.optimizedReka += 1
      if (path.includes('devtools')) scripts.devtools += 1
    })
    page.on('pageerror', (error) => errors.push(error.name))
    page.on('console', (message) => {
      if (message.type() === 'error' || /hydration.*mismatch/i.test(message.text())) {
        errors.push('console:' + message.type())
      }
    })
    const started = performance.now()
    try {
      const response = await page.goto(target.origin, {
        waitUntil: 'domcontentloaded',
        timeout: 90_000
      })
      const domContentLoadedMs = Math.round(performance.now() - started)
      const ttfbMs = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0]
        return Math.round(navigation.responseStart - navigation.startTime)
      })
      await page.locator('[data-public-app][data-hydrated=true]').waitFor({ timeout: 60_000 })
      console.log(
        JSON.stringify({
          sample,
          status: response.status(),
          ttfbMs,
          domContentLoadedMs,
          interactiveMs: Math.round(performance.now() - started),
          scripts,
          errors
        })
      )
      if (!response.ok() || errors.length) process.exitCode = 1
    } catch (error) {
      console.log(
        JSON.stringify({
          sample,
          error: error.name,
          elapsedMs: Math.round(performance.now() - started),
          scripts,
          errors
        })
      )
      process.exitCode = 1
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
