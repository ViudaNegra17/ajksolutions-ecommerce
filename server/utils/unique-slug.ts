import { createSlug } from '#shared/utils/slug'
import { apiError } from './api-error'

/** Retry the whole insert/transaction after PostgreSQL rejects a concurrent slug collision. */
export async function createWithUniqueSlug<T>(
  name: string,
  maxLength: number,
  create: (slug: string) => Promise<T>
): Promise<T> {
  const base = createSlug(name) || 'registro'
  for (let attempt = 1; attempt <= 50; attempt++) {
    const suffix = attempt === 1 ? '' : `-${attempt}`
    const slug = `${base.slice(0, maxLength - suffix.length).replace(/-+$/, '')}${suffix}`
    try {
      return await create(slug)
    } catch (error) {
      const conflict = error as { code?: string; meta?: unknown }
      if (conflict.code !== 'P2002' || !/slug/.test(JSON.stringify(conflict.meta ?? {}))) throw error
      if (attempt === 50)
        throw apiError(
          409,
          'SLUG_CONFLICT',
          'No se pudo generar un enlace único. Usa un nombre más específico.'
        )
    }
  }
  throw new Error('Unreachable slug retry state')
}
