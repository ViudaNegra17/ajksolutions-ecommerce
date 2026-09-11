export function canonicalUrl(appUrl: string, path: string) {
  const base = appUrl.replace(/\/+$/, '')
  const normalizedPath = path === '/' ? '/' : `/${path.replace(/^\/+|\/+$/g, '')}`
  return `${base}${normalizedPath}`
}

export function catalogRobots(query: Record<string, unknown>) {
  return Object.values(query).some((value) => value !== undefined && value !== '' && value !== null)
    ? 'noindex, follow'
    : 'index, follow'
}
