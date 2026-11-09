import { afterEach, describe, expect, it, vi } from 'vitest'
import { validateProductionEnvironment } from '../../config/production-env'

vi.mock('../../config/production-env', () => ({ validateProductionEnvironment: vi.fn() }))

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('production entry logging', () => {
  it('preserves request IDs and safe completion records in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PRIVATE_DIAGNOSTIC_TEST', 'private-value-must-not-be-logged')
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('setHeader', vi.fn())
    vi.stubGlobal('getRequestURL', () => new URL('https://shop.example.com/'))
    const output = vi.spyOn(console, 'info').mockImplementation(() => {})
    const middleware = (await import('../../server/middleware/request-id')).default
    const first = {
      context: {} as Record<string, unknown>,
      method: 'GET',
      node: { res: { statusCode: 200, once: vi.fn() } }
    }
    const second = {
      context: {} as Record<string, unknown>,
      method: 'GET',
      node: { res: { statusCode: 200, once: vi.fn() } }
    }
    await middleware(first as never)
    await middleware(second as never)
    expect(output).not.toHaveBeenCalled()
    first.node.res.once.mock.calls[0]?.[1]()
    second.node.res.once.mock.calls[0]?.[1]()
    const records = output.mock.calls.map(([line]) => JSON.parse(line))
    expect(records).toHaveLength(2)
    expect(first.context.requestId).not.toBe(second.context.requestId)
    expect(records[0].requestId).toBe(first.context.requestId)
    expect(records[1].requestId).toBe(second.context.requestId)
    expect(records.every((record) => record.route === '/' && record.status === 200)).toBe(true)
    expect(Object.keys(records[0]).sort()).toEqual(
      ['timestamp', 'level', 'requestId', 'route', 'method', 'status', 'durationMs'].sort()
    )
    expect(JSON.stringify(records)).not.toContain('private-value-must-not-be-logged')
    expect(vi.mocked(setHeader)).toHaveBeenNthCalledWith(1, first, 'X-Request-ID', first.context.requestId)
  })

  it('keeps the environment plugin silent in development', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin)
    const output = vi.spyOn(console, 'info').mockImplementation(() => {})
    const plugin = (await import('../../server/plugins/00-production-environment')).default
    await plugin({ hooks: { hook: vi.fn() } } as never)
    expect(output).not.toHaveBeenCalled()
  })

  it('preserves production configuration failures', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin)
    vi.mocked(validateProductionEnvironment).mockImplementationOnce(() => {
      throw new Error('Invalid production configuration')
    })
    const output = vi.spyOn(console, 'info').mockImplementation(() => {})
    const plugin = (await import('../../server/plugins/00-production-environment')).default
    expect(() => plugin({} as never)).toThrow('Invalid production configuration')
    expect(output).not.toHaveBeenCalled()
  })
})
