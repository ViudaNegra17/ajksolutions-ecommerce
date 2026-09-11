import os from 'node:os'

const baseUrl = (process.env.PERF_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '')
const samples = Number.parseInt(process.env.PERF_SAMPLES || '5', 10)
const routes = ['/', '/productos', '/servicios', '/carrito', '/checkout', '/admin']

const results = []
for (const route of routes) {
  const durations = []
  let bytes = 0
  let status = 0
  for (let index = 0; index < samples; index += 1) {
    const started = performance.now()
    const response = await fetch(baseUrl + route, { redirect: 'manual' })
    const body = await response.arrayBuffer()
    durations.push(performance.now() - started)
    bytes = body.byteLength
    status = response.status
  }
  const sorted = durations.toSorted((left, right) => left - right)
  results.push({
    route,
    status,
    bytes,
    coldMs: Number(durations[0].toFixed(2)),
    medianWarmMs: Number(sorted[Math.floor(sorted.length / 2)].toFixed(2))
  })
}

console.log(
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      environment: { node: process.version, os: `${os.platform()} ${os.release()}`, samples, baseUrl },
      results
    },
    null,
    2
  )
)
