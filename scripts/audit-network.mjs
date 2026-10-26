// Diagnostic preload only; never imported by the application or included in runtime config.
import http from 'node:http'

const nativeEmit = http.Server.prototype.emit
http.Server.prototype.emit = function auditRequest(event, ...args) {
  if (event === 'request') {
    const [request, response] = args
    const route = new URL(request.url, 'http://localhost').pathname
    if (
      route === '/' ||
      /^\/(productos|servicios)(\/|$)/.test(route) ||
      /^\/api\/(home|products|services|health)/.test(route)
    ) {
      const start = performance.now(),
        port = request.socket.localPort
      response.once('finish', () =>
        console.log(
          JSON.stringify({
            audit: 'request',
            route,
            port,
            status: response.statusCode,
            durationMs: Math.round(performance.now() - start),
            requestId: response.getHeader('X-Request-ID')
          })
        )
      )
    }
  }
  return Reflect.apply(nativeEmit, this, [event, ...args])
}

const nativeFetch = globalThis.fetch
globalThis.fetch = async function auditFetch(input, options) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
  if (!url.hostname.includes('iconify')) return nativeFetch(input, options)
  const start = performance.now()
  try {
    const response = await nativeFetch(input, options)
    console.log(
      JSON.stringify({
        audit: 'outbound-icon',
        host: url.hostname,
        status: response.status,
        durationMs: Math.round(performance.now() - start)
      })
    )
    return response
  } catch (error) {
    console.log(
      JSON.stringify({
        audit: 'outbound-icon',
        host: url.hostname,
        error: error.name,
        durationMs: Math.round(performance.now() - start)
      })
    )
    throw error
  }
}
