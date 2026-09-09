import { describe, expect, it, vi } from 'vitest'
import { createPublicReadCache } from '../../server/utils/public-cache-core'
import { publicInvalidations } from '../../server/utils/public-cache-policy'
import { uiErrorMessage } from '../../shared/utils/ui-error'
import { localDateInput } from '../../app/utils/local-date'

function setup(limit = 512) {
  const data = new Map<string, unknown>()
  let time = 1_000
  const storage = {
    async getItem<T>(key: string) {
      return (data.get(key) as T) ?? null
    },
    async setItem(key: string, value: unknown) {
      data.set(key, structuredClone(value))
    },
    async removeItem(key: string) {
      data.delete(key)
    }
  }
  return {
    cache: createPublicReadCache(storage, () => time, limit),
    data,
    storage,
    advance: (ms: number) => {
      time += ms
    }
  }
}
describe('Fase 7.5: caché público', () => {
  it('reutiliza DTOs y normaliza el orden de parámetros', async () => {
    const { cache } = setup()
    const load = vi.fn(async () => ({ name: 'Teclado' }))
    expect((await cache.read('products', { page: 1, search: 'teclado' }, load)).hit).toBe(false)
    expect((await cache.read('products', { search: 'teclado', page: 1 }, load)).hit).toBe(true)
    expect(load).toHaveBeenCalledTimes(1)
  })
  it('separa parámetros y recursos y no comparte referencias mutables', async () => {
    const { cache } = setup()
    const load = vi.fn(async () => ({ name: 'Original' }))
    const first = await cache.read('products', { page: 1 }, load)
    first.value.name = 'Modificado'
    expect((await cache.read('products', { page: 1 }, load)).value.name).toBe('Original')
    await cache.read('products', { page: 2 }, load)
    await cache.read('services', { page: 1 }, load)
    expect(load).toHaveBeenCalledTimes(3)
  })
  it('invalida sin esperar el TTL y conserva recursos independientes', async () => {
    const { cache } = setup()
    await cache.read('home', {}, async () => 'Anterior')
    await cache.read('services', {}, async () => 'Servicio')
    await cache.invalidate(publicInvalidations('/api/admin/banners/123'))
    expect(await cache.read('home', {}, async () => 'Nuevo')).toEqual({ value: 'Nuevo', hit: false })
    expect((await cache.read('services', {}, async () => 'Incorrecto')).hit).toBe(true)
  })
  it('vence en TTL y en el límite de programación sin SWR obsoleto', async () => {
    const { cache, advance } = setup()
    const load = vi.fn(async () => 'vigente')
    await cache.read('products', {}, load)
    advance(30_000)
    expect((await cache.read('products', {}, load)).hit).toBe(false)
    await cache.read('home', {}, load, async () => 32_000)
    advance(1_000)
    expect((await cache.read('home', {}, load)).hit).toBe(false)
  })
  it('no guarda errores ni resultados de lecturas anteriores a una invalidación', async () => {
    const { cache } = setup()
    await expect(
      cache.read('home', {}, async () => {
        throw new Error('DB')
      })
    ).rejects.toThrow('DB')
    let finish!: (value: string) => void
    const loading = cache.read(
      'home',
      {},
      () =>
        new Promise<string>((resolve) => {
          finish = resolve
        })
    )
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
    await cache.invalidate(['home'])
    finish('Viejo')
    await loading
    expect(await cache.read('home', {}, async () => 'Nuevo')).toEqual({ value: 'Nuevo', hit: false })
  })
  it('acota el almacenamiento y abandona el caché si falla la invalidación', async () => {
    const { cache, data, storage } = setup(2)
    for (let i = 0; i < 4; i++) await cache.read('products', { i }, async () => i)
    expect(data.size).toBe(2)
    storage.removeItem = async () => {
      throw new Error('storage')
    }
    await expect(cache.invalidate(['products'])).rejects.toThrow('storage')
    expect(await cache.read('products', { i: 3 }, async () => 'fresco')).toEqual({
      value: 'fresco',
      hit: false
    })
  })
  it('cubre inventario, pedido, settings y no invalida por auth o tickets', () => {
    expect(publicInvalidations('/api/orders')).toContain('products')
    expect(publicInvalidations('/api/admin/orders/123/status')).toContain('home')
    expect(publicInvalidations('/api/admin/inventory/adjust')).toContain('products')
    expect(publicInvalidations('/api/admin/settings')).toContain('settings')
    expect(publicInvalidations('/api/admin/promotions/123')).toContain('products')
    expect(publicInvalidations('/api/auth/login')).toEqual([])
    expect(publicInvalidations('/api/tickets')).toEqual([])
  })
})
describe('Fase 7.5: mensajes y fechas', () => {
  it('oculta detalles internos y conserva errores de negocio seguros', () => {
    expect(uiErrorMessage(new Error('Prisma SQL token secret'))).not.toMatch(/Prisma|SQL|token|secret/)
    expect(
      uiErrorMessage({ statusCode: 500, data: { error: { code: 'ERROR', message: 'Privado' } } })
    ).not.toContain('Privado')
    expect(
      uiErrorMessage({
        statusCode: 422,
        data: { data: { error: { code: 'INVALID', message: 'Revisa la cantidad.' } } }
      })
    ).toBe('Revisa la cantidad.')
  })
  it('conserva la hora local al reabrir y guardar una fecha', () => {
    const original = '2026-09-07T18:30:00.000Z'
    expect(new Date(localDateInput(original)).toISOString()).toBe(original)
    expect(localDateInput(null)).toBe('')
    expect(localDateInput('invalid')).toBe('')
  })
})
