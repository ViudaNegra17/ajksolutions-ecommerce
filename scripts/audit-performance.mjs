import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs/promises'
import { chromium } from '@playwright/test'

const mode = process.argv[2] || 'http'
const base = new URL(process.env.AUDIT_BASE_URL || 'http://localhost:3000')
if (!['localhost', '127.0.0.1', '[::1]', 'ajksolutions-ecommerce-neon.vercel.app'].includes(base.hostname))
  throw new Error('Target not allowlisted')
const label = process.env.AUDIT_LABEL || 'audit'
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid label')
const routes = [
  '/',
  '/productos',
  '/servicios',
  '/api/home',
  '/api/products',
  '/api/services',
  '/api/health/live',
  '/api/health/ready'
]
for (const route of (process.env.AUDIT_DETAIL_ROUTES || '').split(',').filter(Boolean)) {
  if (!/^\/(productos|servicios)\/[\w-]+$/.test(route)) throw new Error('Invalid detail route')
  routes.push(route)
}
if (process.env.AUDIT_FIRST_ROUTE && routes.includes(process.env.AUDIT_FIRST_ROUTE)) {
  routes.splice(routes.indexOf(process.env.AUDIT_FIRST_ROUTE), 1)
  routes.unshift(process.env.AUDIT_FIRST_ROUTE)
}
const records = []
await fs.mkdir('logs/performance-audit', { recursive: true })
const record = (value) => {
  records.push(value)
  const { route, sample, status, error, ttfbMs, hydratedMs, lcp, scriptRequests } = value
  console.log(JSON.stringify({ route, sample, status, error, ttfbMs, hydratedMs, lcp, scriptRequests }))
}
const round = (value) => Math.round(value * 100) / 100

function request(path) {
  return new Promise((resolve) => {
    const started = performance.now()
    const timing = {}
    const req = (base.protocol === 'https:' ? https : http).get(
      new URL(path, base),
      { agent: false },
      (res) => {
        const ttfb = performance.now() - started
        let bytes = 0
        const chunks = []
        res.on('data', (chunk) => {
          bytes += chunk.length
          if (bytes < 2048) chunks.push(chunk)
        })
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            ttfbMs: round(ttfb),
            totalMs: round(performance.now() - started),
            downloadMs: round(performance.now() - started - ttfb),
            bytes,
            ...timing,
            headers: Object.fromEntries(
              Object.entries(res.headers).filter(([key]) =>
                /^(server|server-timing|cache-control|content-type|x-vercel.*|x-request-id|x-public-cache)$/.test(
                  key
                )
              )
            ),
            errorBody: res.statusCode >= 400 ? Buffer.concat(chunks).toString().slice(0, 1000) : undefined,
            serverDurationMs: res.headers['server-timing']?.match(/dur=([\d.]+);desc="Generate"/)?.[1]
              ? Number(res.headers['server-timing'].match(/dur=([\d.]+);desc="Generate"/)[1])
              : null,
            dbDurationMs: null
          })
        )
      }
    )
    req.on('socket', (socket) => {
      let lookupAt = started,
        connectAt = started
      socket.once('lookup', () => {
        lookupAt = performance.now()
        timing.dnsMs = round(lookupAt - started)
      })
      socket.once('connect', () => {
        connectAt = performance.now()
        timing.tcpMs = round(connectAt - lookupAt)
      })
      socket.once('secureConnect', () => {
        timing.tlsMs = round(performance.now() - connectAt)
      })
    })
    req.setTimeout(25000, () => req.destroy(new Error('AUDIT_TIMEOUT')))
    req.on('error', (error) =>
      resolve({ error: error.code || error.message, totalMs: round(performance.now() - started) })
    )
  })
}

try {
  if (mode === 'http') {
    for (const route of routes.filter(
      (r) => process.env.AUDIT_DETAILS_ONLY !== 'true' || /^\/(productos|servicios)\//.test(r)
    ))
      for (let sample = 1; sample <= 3; sample++)
        record({
          route,
          sample,
          coldVerified: process.env.AUDIT_FRESH_PROCESS === 'true' && route === routes[0] && sample === 1,
          ...(await request(route))
        })
  } else if (mode === 'browser') {
    const browser = await chromium.launch()
    try {
      for (const route of routes.filter(
        (r) => !r.startsWith('/api/') && (process.env.AUDIT_HOME_ONLY !== 'true' || r === '/')
      ))
        for (let sample = 1; sample <= 3; sample++) {
          const context = await browser.newContext({
            viewport:
              process.env.AUDIT_MOBILE === 'true'
                ? { width: 390, height: 844 }
                : { width: 1440, height: 1000 }
          })
          const page = await context.newPage(),
            errors = [],
            apiRequests = [],
            failed = []
          await page.addInitScript(() => {
            window.__audit = { longTasks: [], lcp: null, hydratedMs: null }
            new PerformanceObserver((list) => {
              for (const e of list.getEntries()) window.__audit.longTasks.push(e.duration)
            }).observe({ type: 'longtask', buffered: true })
            new PerformanceObserver((list) => {
              const e = list.getEntries().at(-1)
              window.__audit.lcp = {
                ms: e.startTime,
                tag: e.element?.tagName,
                id: e.element?.id,
                image: Boolean(e.url)
              }
            }).observe({ type: 'largest-contentful-paint', buffered: true })
            new MutationObserver(() => {
              if (
                window.__audit.hydratedMs === null &&
                document.querySelector('[data-public-app][data-hydrated=true]')
              )
                window.__audit.hydratedMs = performance.now()
            }).observe(document, { subtree: true, attributes: true, childList: true })
          })
          page.on('pageerror', (e) => errors.push(e.name))
          page.on('console', (m) => {
            if (/hydration.*mismatch/i.test(m.text())) errors.push('hydration-mismatch')
          })
          page.on('request', (r) => {
            if (new URL(r.url()).pathname.startsWith('/api/')) apiRequests.push(new URL(r.url()).pathname)
          })
          page.on('requestfailed', (r) =>
            failed.push({
              host: new URL(r.url()).hostname,
              path: new URL(r.url()).pathname,
              error: r.failure()?.errorText
            })
          )
          try {
            const response = await page.goto(new URL(route, base).href, {
              waitUntil: 'domcontentloaded',
              timeout: 90000
            })
            if (response.ok()) {
              await page.locator('[data-public-app][data-hydrated=true]').waitFor({ timeout: 60000 })
              await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {})
              await page.waitForTimeout(750)
            }
            const metrics = await page.evaluate(() => {
              const n = performance.getEntriesByType('navigation')[0],
                resources = performance.getEntriesByType('resource')
              const sum = (type) =>
                resources
                  .filter((r) => r.initiatorType === type)
                  .reduce((total, r) => total + r.transferSize, 0)
              return {
                dnsMs: n.domainLookupEnd - n.domainLookupStart,
                tcpMs: n.connectEnd - n.connectStart,
                ttfbMs: n.responseStart - n.startTime,
                requestStartMs: n.requestStart - n.startTime,
                requestWaitMs: n.responseStart - n.requestStart,
                downloadMs: n.responseEnd - n.responseStart,
                domContentLoadedMs: n.domContentLoadedEventEnd,
                loadMs: n.loadEventEnd,
                ...window.__audit,
                resources: resources.length,
                scriptRequests: resources.filter((r) => r.initiatorType === 'script').length,
                jsTransferBytes: sum('script'),
                cssTransferBytes: sum('link'),
                jsAssets: resources
                  .filter((r) => /\.m?js$/.test(new URL(r.name).pathname))
                  .map((r) => new URL(r.name).pathname),
                jsResources: resources
                  .filter((r) => /\.m?js$/.test(new URL(r.name).pathname))
                  .map((r) => ({
                    path: new URL(r.name).pathname,
                    initiator: r.initiatorType,
                    startMs: r.startTime,
                    endMs: r.responseEnd,
                    transferBytes: r.transferSize
                  })),
                jsTransferByUrl: resources
                  .filter((r) => /\.m?js$/.test(new URL(r.name).pathname))
                  .reduce((sum, r) => sum + r.transferSize, 0),
                cssTransferByUrl: resources
                  .filter((r) => /\.css$/.test(new URL(r.name).pathname))
                  .reduce((sum, r) => sum + r.transferSize, 0),
                fontResources: resources
                  .filter((r) => /\.(woff2?|ttf|otf)$/.test(new URL(r.name).pathname))
                  .map((r) => ({ host: new URL(r.name).hostname, bytes: r.transferSize })),
                firstApiMs:
                  resources
                    .filter((r) => new URL(r.name).pathname.startsWith('/api/'))
                    .map((r) => r.responseEnd)
                    .sort((a, b) => a - b)[0] ?? null,
                payloadKeys: ['public-home', 'public-settings', 'public-navigation'].filter((key) =>
                  document.getElementById('__NUXT_DATA__')?.textContent?.includes(key)
                ),
                images: [...document.images].map((img) => ({
                  host: new URL(img.currentSrc || img.src, location.href).hostname,
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                  complete: img.complete,
                  priority: img.fetchPriority,
                  loading: img.loading
                }))
              }
            })
            record({
              route,
              sample,
              status: response.status(),
              requestId: response.headers()['x-request-id'],
              ...metrics,
              apiRequests,
              errors,
              failed
            })
          } catch (error) {
            record({ route, sample, error: error.name, errors, failed })
          } finally {
            await context.close()
          }
        }
    } finally {
      await browser.close()
    }
  } else throw new Error('Unknown mode')
} finally {
  await fs.writeFile(
    `logs/performance-audit/${label}-${mode}.json`,
    JSON.stringify({ capturedAt: new Date().toISOString(), base: base.origin, label, records }, null, 2)
  )
}
