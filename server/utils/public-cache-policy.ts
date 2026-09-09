export const publicCachePolicy = {
  categories: 300,
  brands: 300,
  settings: 300,
  services: 120,
  products: 30,
  home: 60,
  banners: 30
} as const
export type PublicCacheResource = keyof typeof publicCachePolicy

export function publicInvalidations(path: string): PublicCacheResource[] {
  if (/^\/api\/admin\/(products|categories|brands|attributes|suppliers|inventory)(\/|$)/.test(path))
    return ['categories', 'brands', 'products', 'home']
  if (/^\/api\/admin\/settings(\/|$)/.test(path)) return ['settings', 'services', 'products', 'home']
  if (/^\/api\/admin\/(services|service-categories)(\/|$)/.test(path)) return ['services', 'home']
  if (/^\/api\/admin\/banners(\/|$)/.test(path)) return ['banners', 'home']
  if (/^\/api\/admin\/promotions(\/|$)/.test(path)) return ['products', 'home']
  if (/^\/api\/admin\/orders(\/|$)/.test(path) || path === '/api/orders') return ['products', 'home']
  return []
}
