import type { H3Event } from 'h3'

export function requirePublicSlug(event: H3Event) {
  const slug = getRouterParam(event, 'slug')?.trim()
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw apiError(404, 'RESOURCE_NOT_FOUND', 'El recurso no existe.')
  return slug
}
