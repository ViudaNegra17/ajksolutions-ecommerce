export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const match = url.pathname.match(/^\/licencias(?:\/([^/]+)(\/comprar)?)?\/?$/)
  if (!match) return

  const slug = match[1]
  const target = slug ? `/productos/${slug}${match[2] || ''}` : '/productos'
  return sendRedirect(event, `${target}${url.search}`, 301)
})
